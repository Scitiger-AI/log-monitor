'use client';

import { memo, useMemo, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, Circle } from 'lucide-react';
import { SplitViewPane } from './SplitViewPane';
import type { LogPanel, LayoutConfig } from '@/store';

interface SplitViewGridProps {
  panels: LogPanel[];
  activeViewIds: string[];
  layout: LayoutConfig;
  maximizedPanelId: string | null;
  onMaximize: (panelId: string | null) => void;
  onRemoveFromView: (panelId: string) => void;
  onReorder: (panelIds: string[]) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

// 状态颜色映射
const STATUS_COLORS: Record<LogPanel['status'], string> = {
  connecting: 'text-yellow-500',
  connected: 'text-green-500',
  disconnected: 'text-gray-500',
  error: 'text-red-500',
};

// 拖拽预览卡片
function DragOverlayCard({ panel }: { panel: LogPanel }) {
  return (
    <div
      className="bg-[#1a1a1a] rounded border border-blue-500 shadow-xl shadow-blue-500/30"
      style={{ width: '200px', height: '60px' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-gray-700 rounded-t">
        <GripVertical className="w-4 h-4 text-blue-400" />
        <Circle className={`w-2 h-2 fill-current ${STATUS_COLORS[panel.status]}`} />
        <span className="text-sm text-gray-200 truncate">{panel.logFile.name}</span>
      </div>
      <div className="px-3 py-1 text-xs text-gray-500 truncate">
        {panel.server.name}
      </div>
    </div>
  );
}

// 空槽位占位符
function EmptySlot({ index }: { index: number }) {
  return (
    <div className="bg-[#1a1a1a]/50 rounded border border-dashed border-gray-700 flex items-center justify-center">
      <div className="text-center text-gray-600">
        <div className="text-sm">空槽位 {index + 1}</div>
        <div className="text-xs mt-1">从左侧列表添加日志</div>
      </div>
    </div>
  );
}

export const SplitViewGrid = memo(function SplitViewGrid({
  panels,
  activeViewIds,
  layout,
  maximizedPanelId,
  onMaximize,
  onRemoveFromView,
  onReorder,
  onTerminalReady,
}: SplitViewGridProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  // 获取活跃视图中的面板
  const activePanels = useMemo(() => {
    return activeViewIds
      .map(id => panels.find(p => p.id === id))
      .filter((p): p is LogPanel => p !== undefined);
  }, [panels, activeViewIds]);

  // 最大化的面板
  const maximizedPanel = useMemo(() => {
    if (!maximizedPanelId) return null;
    return activePanels.find(p => p.id === maximizedPanelId) || null;
  }, [activePanels, maximizedPanelId]);

  // 网格样式
  const gridStyle = useMemo(() => {
    if (maximizedPanel) {
      return {
        display: 'grid',
        gridTemplateRows: '1fr',
        gridTemplateColumns: '1fr',
        gap: '4px',
        height: '100%',
        padding: '4px',
      };
    }

    return {
      display: 'grid',
      gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
      gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      gap: '4px',
      height: '100%',
      padding: '4px',
    };
  }, [layout, maximizedPanel]);

  // 计算需要显示的槽位数量
  const totalSlots = layout.rows * layout.cols;
  const emptySlots = Math.max(0, totalSlots - activePanels.length);

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = activeViewIds.indexOf(active.id as string);
    const newIndex = activeViewIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newIds = arrayMove(activeViewIds, oldIndex, newIndex);
      onReorder(newIds);
    }
  }, [activeViewIds, onReorder]);

  // 获取当前拖拽的面板
  const activeDragPanel = activeDragId
    ? activePanels.find(p => p.id === activeDragId)
    : null;

  // 处理最大化切换
  const handleMaximize = useCallback((panelId: string) => {
    if (maximizedPanelId === panelId) {
      onMaximize(null);
    } else {
      onMaximize(panelId);
    }
  }, [maximizedPanelId, onMaximize]);

  // 空状态
  if (activePanels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">分屏视图为空</div>
          <div className="text-sm">点击左侧日志列表中的项目添加到视图</div>
          <div className="text-xs mt-2 text-gray-600">
            当前布局: {layout.name} ({totalSlots} 个槽位)
          </div>
        </div>
      </div>
    );
  }

  // 最大化模式
  if (maximizedPanel) {
    return (
      <div className="h-full bg-[#1a1a1a]" style={gridStyle}>
        <SplitViewPane
          key={maximizedPanel.id}
          panel={maximizedPanel}
          isMaximized={true}
          onMaximize={() => onMaximize(null)}
          onClose={() => onRemoveFromView(maximizedPanel.id)}
          onTerminalReady={onTerminalReady}
        />
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
        items={activeViewIds}
        strategy={rectSortingStrategy}
      >
        <div className="h-full bg-[#1a1a1a]" style={gridStyle}>
          {activePanels.map(panel => (
            <SplitViewPane
              key={panel.id}
              panel={panel}
              isMaximized={false}
              onMaximize={() => handleMaximize(panel.id)}
              onClose={() => onRemoveFromView(panel.id)}
              onTerminalReady={onTerminalReady}
            />
          ))}

          {/* 空槽位 */}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <EmptySlot key={`empty-${index}`} index={activePanels.length + index} />
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
});
