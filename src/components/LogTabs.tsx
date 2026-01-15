'use client';

import { useEffect, useCallback, useMemo, memo, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { X, Circle, Server as ServerIcon, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { LogTerminal } from './LogTerminal';
import { GroupTabBar } from './GroupTabBar';
import { LogPanel as LogPanelType, Server, LogGroup, LogFile, useStore } from '@/store';

interface LogTabsProps {
  panels: LogPanelType[];
  activeServerId: string | null;
  onActiveServerChange: (serverId: string | null) => void;
  onClose: (panel: LogPanelType) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

// 状态颜色映射
const STATUS_COLORS: Record<LogPanelType['status'], string> = {
  connecting: 'text-yellow-500',
  connected: 'text-green-500',
  disconnected: 'text-gray-500',
  error: 'text-red-500',
};

// 拖拽手柄组件
interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

const DragHandle = memo(function DragHandle({ attributes, listeners }: DragHandleProps) {
  return (
    <button
      {...attributes}
      {...listeners}
      className="p-1 hover:bg-gray-600 rounded cursor-grab active:cursor-grabbing touch-none"
      title="拖拽排序"
    >
      <GripVertical className="w-4 h-4 text-gray-500" />
    </button>
  );
});

// Terminal 容器 - 使用 memo 确保不会因为父组件重新渲染而卸载
interface TerminalContainerProps {
  logFileId: string;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

const TerminalContainer = memo(function TerminalContainer({
  logFileId,
  onTerminalReady,
}: TerminalContainerProps) {
  const onReadyRef = useRef(onTerminalReady);
  onReadyRef.current = onTerminalReady;

  const handleReady = useCallback((terminal: Terminal) => {
    onReadyRef.current(logFileId, terminal);
  }, [logFileId]);

  return (
    <div className="flex-1 min-h-0">
      <LogTerminal onReady={handleReady} />
    </div>
  );
}, (prev, next) => prev.logFileId === next.logFileId);

// 可排序面板组件
interface SortablePanelProps {
  panel: LogPanelType;
  panelCount: number;
  orderIndex: number;
  onClose: (panel: LogPanelType) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

const SortablePanel = memo(function SortablePanel({
  panel,
  panelCount,
  orderIndex,
  onClose,
  onTerminalReady,
}: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    height: panelCount === 1 ? '100%' : '350px',
    minHeight: '250px',
    order: orderIndex, // 使用 CSS order 控制显示顺序
  }), [transform, transition, panelCount, orderIndex]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(panel);
  }, [onClose, panel]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#1a1a1a] rounded border flex flex-col ${
        isDragging ? 'border-blue-500 shadow-lg shadow-blue-500/20 opacity-50 z-50' : 'border-gray-700'
      }`}
    >
      {/* 日志面板头部 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252525] border-b border-gray-700 rounded-t">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <DragHandle attributes={attributes} listeners={listeners} />
          <Circle className={`w-2 h-2 fill-current flex-shrink-0 ${STATUS_COLORS[panel.status]}`} />
          <span className="text-sm text-gray-200 truncate">{panel.logFile.name}</span>
          <span className="text-xs text-gray-500 truncate max-w-[200px]" title={panel.logFile.path}>
            {panel.logFile.path}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
          title="关闭此日志"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      </div>

      {/* 错误信息 */}
      {panel.status === 'error' && panel.errorMessage && (
        <div className="px-3 py-1.5 bg-red-900/30 text-red-400 text-xs">
          {panel.errorMessage}
        </div>
      )}

      {/* Terminal - 独立组件，不受拖拽影响 */}
      <TerminalContainer
        logFileId={panel.logFileId}
        onTerminalReady={onTerminalReady}
      />
    </div>
  );
}, (prev, next) => {
  return (
    prev.panel.id === next.panel.id &&
    prev.panel.status === next.panel.status &&
    prev.panel.errorMessage === next.panel.errorMessage &&
    prev.panelCount === next.panelCount &&
    prev.orderIndex === next.orderIndex &&
    prev.onClose === next.onClose &&
    prev.onTerminalReady === next.onTerminalReady
  );
});

// 拖拽时的预览卡片
function DragOverlayCard({ panel }: { panel: LogPanelType }) {
  return (
    <div
      className="bg-[#1a1a1a] rounded border border-blue-500 shadow-xl shadow-blue-500/30"
      style={{ width: '400px', height: '100px' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-gray-700 rounded-t">
        <GripVertical className="w-4 h-4 text-blue-400" />
        <Circle className={`w-2 h-2 fill-current ${STATUS_COLORS[panel.status]}`} />
        <span className="text-sm text-gray-200">{panel.logFile.name}</span>
      </div>
      <div className="p-3 text-xs text-gray-500">
        {panel.logFile.path}
      </div>
    </div>
  );
}

// 服务器面板网格
interface ServerPanelGridProps {
  serverId: string;
  panels: LogPanelType[];
  panelOrder: string[];
  onClose: (panel: LogPanelType) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
  onReorder: (serverId: string, panelIds: string[]) => void;
}

function ServerPanelGrid({
  serverId,
  panels,
  panelOrder,
  onClose,
  onTerminalReady,
  onReorder,
}: ServerPanelGridProps) {
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 计算每个面板的显示顺序索引
  const orderIndexMap = useMemo(() => {
    const order = panelOrder || [];
    const map = new Map<string, number>();

    // 先处理在 order 中的面板
    order.forEach((id, index) => {
      map.set(id, index);
    });

    // 处理不在 order 中的面板（放到最后）
    let nextIndex = order.length;
    panels.forEach(panel => {
      if (!map.has(panel.id)) {
        map.set(panel.id, nextIndex++);
      }
    });

    return map;
  }, [panels, panelOrder]);

  // 获取排序后的面板 ID 列表（用于 SortableContext）
  const sortedPanelIds = useMemo(() => {
    return [...panels]
      .sort((a, b) => (orderIndexMap.get(a.id) || 0) - (orderIndexMap.get(b.id) || 0))
      .map(p => p.id);
  }, [panels, orderIndexMap]);

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id);
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sortedPanelIds.indexOf(active.id as string);
    const newIndex = sortedPanelIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPanelIds = arrayMove(sortedPanelIds, oldIndex, newIndex);
      onReorder(serverId, newPanelIds);
    }
  }, [serverId, sortedPanelIds, onReorder]);

  // 获取当前拖拽的面板
  const activeDragPanel = activeDragId
    ? panels.find(p => p.id === activeDragId)
    : null;

  if (panels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p className="text-sm">当前分组没有打开的日志</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedPanelIds}
        strategy={rectSortingStrategy}
      >
        <div
          className="flex-1 p-2 overflow-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: panels.length === 1
              ? '1fr'
              : 'repeat(2, 1fr)',
            gap: '8px',
            alignContent: 'start',
          }}
        >
          {/* 保持原始数组顺序渲染，通过 CSS order 控制显示顺序 */}
          {panels.map(panel => (
            <SortablePanel
              key={panel.id}
              panel={panel}
              panelCount={panels.length}
              orderIndex={orderIndexMap.get(panel.id) || 0}
              onClose={onClose}
              onTerminalReady={onTerminalReady}
            />
          ))}
        </div>
      </SortableContext>

      {/* 拖拽预览 */}
      <DragOverlay>
        {activeDragPanel && (
          <DragOverlayCard panel={activeDragPanel} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// 服务器内容区域（包含分组 Tab 和面板网格）
interface ServerContentProps {
  serverId: string;
  server: Server;
  panels: LogPanelType[];
  groups: LogGroup[];
  activeGroupId: string | null;
  panelOrder: string[];
  logFiles: LogFile[]; // 添加最新的 logFiles 数据
  onClose: (panel: LogPanelType) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
  onReorder: (serverId: string, panelIds: string[]) => void;
  onGroupChange: (groupId: string | null) => void;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

function ServerContent({
  serverId,
  panels,
  groups,
  activeGroupId,
  panelOrder,
  logFiles,
  onClose,
  onTerminalReady,
  onReorder,
  onGroupChange,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}: ServerContentProps) {
  // 根据当前激活的分组过滤面板
  // 使用 store 中最新的 logFiles 数据来获取 groupId，而不是 panel 中的快照
  const filteredPanels = useMemo(() => {
    if (activeGroupId === null) {
      // 显示所有面板（全部）
      return panels;
    }
    // 显示指定分组的面板，使用最新的 logFiles 数据
    return panels.filter(p => {
      const latestLogFile = logFiles.find(lf => lf.id === p.logFileId);
      const currentGroupId = latestLogFile?.groupId ?? p.logFile.groupId;
      return currentGroupId === activeGroupId;
    });
  }, [panels, activeGroupId, logFiles]);

  // 计算未分组的日志数量（用于"全部"Tab显示）
  const totalCount = panels.length;

  return (
    <div className="flex flex-col h-full">
      {/* 分组 Tab 栏 */}
      <GroupTabBar
        groups={groups}
        activeGroupId={activeGroupId}
        onGroupChange={onGroupChange}
        onAddGroup={onAddGroup}
        onRenameGroup={onRenameGroup}
        onDeleteGroup={onDeleteGroup}
        ungroupedCount={totalCount}
      />

      {/* 面板网格 */}
      <ServerPanelGrid
        serverId={serverId}
        panels={filteredPanels}
        panelOrder={panelOrder}
        onClose={onClose}
        onTerminalReady={onTerminalReady}
        onReorder={onReorder}
      />
    </div>
  );
}

export function LogTabs({ panels, activeServerId, onActiveServerChange, onClose, onTerminalReady }: LogTabsProps) {
  const {
    panelOrder,
    reorderPanels,
    logGroups,
    logFiles,
    activeGroupId,
    setActiveGroupId,
    addLogGroup,
    updateLogGroup,
    removeLogGroup,
    fetchLogGroups,
  } = useStore();

  // 初始化时获取分组数据
  useEffect(() => {
    fetchLogGroups();
  }, [fetchLogGroups]);

  // 使用 ref 保持回调稳定
  const onCloseRef = useRef(onClose);
  const onTerminalReadyRef = useRef(onTerminalReady);
  onCloseRef.current = onClose;
  onTerminalReadyRef.current = onTerminalReady;

  // 稳定的回调函数
  const stableOnClose = useCallback((panel: LogPanelType) => {
    onCloseRef.current(panel);
  }, []);

  const stableOnTerminalReady = useCallback((logFileId: string, terminal: Terminal) => {
    onTerminalReadyRef.current(logFileId, terminal);
  }, []);

  // 按服务器分组 panels
  const serverGroups = useMemo(() => {
    return panels.reduce((acc, panel) => {
      const serverId = panel.server.id;
      if (!acc[serverId]) {
        acc[serverId] = {
          server: panel.server,
          panels: [],
        };
      }
      acc[serverId].panels.push(panel);
      return acc;
    }, {} as Record<string, { server: Server; panels: LogPanelType[] }>);
  }, [panels]);

  const serverIds = Object.keys(serverGroups);

  // 当 panels 变化时，确保 activeServerId 有效
  useEffect(() => {
    if (serverIds.length === 0) {
      onActiveServerChange(null);
    } else if (!activeServerId || !serverIds.includes(activeServerId)) {
      onActiveServerChange(serverIds[serverIds.length - 1]);
    }
  }, [serverIds, activeServerId, onActiveServerChange]);

  const handleCloseServer = useCallback((e: React.MouseEvent, serverId: string) => {
    e.stopPropagation();
    const group = serverGroups[serverId];
    if (group) {
      group.panels.forEach(panel => onCloseRef.current(panel));
    }
  }, [serverGroups]);

  // 获取服务器的整体状态
  const getServerStatus = useCallback((serverPanels: LogPanelType[]) => {
    if (serverPanels.some(p => p.status === 'error')) return 'error';
    if (serverPanels.some(p => p.status === 'connecting')) return 'connecting';
    if (serverPanels.every(p => p.status === 'connected')) return 'connected';
    return 'disconnected';
  }, []);

  // 分组操作回调
  const handleAddGroup = useCallback(async (serverId: string) => {
    try {
      const res = await fetch('/api/log-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          name: '新分组',
          sortOrder: logGroups.filter(g => g.serverId === serverId).length,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLogGroup(data.data);
        setActiveGroupId(serverId, data.data.id);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  }, [logGroups, addLogGroup, setActiveGroupId]);

  const handleRenameGroup = useCallback(async (groupId: string, newName: string) => {
    try {
      const res = await fetch('/api/log-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        updateLogGroup(groupId, { name: newName });
      }
    } catch (error) {
      console.error('Failed to rename group:', error);
    }
  }, [updateLogGroup]);

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/log-groups?id=${groupId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        removeLogGroup(groupId);
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  }, [removeLogGroup]);

  if (panels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">双击左侧日志文件开始监控</p>
          <p className="text-sm">支持同时监控多个日志文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Server Tab Bar */}
      <div className="flex bg-[#1e1e1e] border-b border-gray-700 overflow-x-auto">
        {serverIds.map(serverId => {
          const group = serverGroups[serverId];
          const serverStatus = getServerStatus(group.panels);

          return (
            <div
              key={serverId}
              onClick={() => onActiveServerChange(serverId)}
              className={`
                flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-700
                min-w-[140px] group
                ${serverId === activeServerId
                  ? 'bg-[#1a1a1a] text-gray-200'
                  : 'bg-[#252525] text-gray-400 hover:bg-[#2a2a2a]'}
              `}
            >
              <Circle className={`w-2 h-2 flex-shrink-0 fill-current ${STATUS_COLORS[serverStatus]}`} />
              <ServerIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{group.server.name}</span>
              <span className="text-xs text-gray-500">({group.panels.length})</span>
              <button
                onClick={(e) => handleCloseServer(e, serverId)}
                className="p-0.5 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="关闭此服务器所有日志"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Tab Content - 服务器内的分组和日志面板 */}
      <div className="flex-1 min-h-0 relative">
        {serverIds.map(serverId => {
          const group = serverGroups[serverId];
          const isActive = serverId === activeServerId;
          const serverLogGroups = logGroups.filter(g => g.serverId === serverId);
          const currentActiveGroupId = activeGroupId[serverId] ?? null;

          return (
            <div
              key={serverId}
              className="absolute inset-0 flex flex-col"
              style={{
                visibility: isActive ? 'visible' : 'hidden',
                zIndex: isActive ? 1 : 0,
              }}
            >
              <ServerContent
                serverId={serverId}
                server={group.server}
                panels={group.panels}
                groups={serverLogGroups}
                activeGroupId={currentActiveGroupId}
                panelOrder={panelOrder[serverId] || []}
                logFiles={logFiles}
                onClose={stableOnClose}
                onTerminalReady={stableOnTerminalReady}
                onReorder={reorderPanels}
                onGroupChange={(groupId) => setActiveGroupId(serverId, groupId)}
                onAddGroup={() => handleAddGroup(serverId)}
                onRenameGroup={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
