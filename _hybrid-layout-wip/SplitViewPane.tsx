'use client';

import { memo, useCallback, useRef, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { Circle, X, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LogTerminal } from '../LogTerminal';
import type { LogPanel } from '@/store';

interface SplitViewPaneProps {
  panel: LogPanel;
  isMaximized: boolean;
  onMaximize: () => void;
  onClose: () => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

// 状态颜色映射
const STATUS_COLORS: Record<LogPanel['status'], string> = {
  connecting: 'text-yellow-500',
  connected: 'text-green-500',
  disconnected: 'text-gray-500',
  error: 'text-red-500',
};

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
    <div className="flex-1 min-h-0 h-full">
      <LogTerminal onReady={handleReady} />
    </div>
  );
}, (prev, next) => prev.logFileId === next.logFileId);

export const SplitViewPane = memo(function SplitViewPane({
  panel,
  isMaximized,
  onMaximize,
  onClose,
  onTerminalReady,
}: SplitViewPaneProps) {
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
  }), [transform, transition]);

  const handleDoubleClick = useCallback(() => {
    onMaximize();
  }, [onMaximize]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleMaximizeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMaximize();
  }, [onMaximize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-[#1a1a1a] rounded border flex flex-col overflow-hidden
        ${isDragging
          ? 'border-blue-500 shadow-lg shadow-blue-500/20 opacity-50 z-50'
          : 'border-gray-700 hover:border-gray-600'}
        ${isMaximized ? 'col-span-full row-span-full' : ''}
      `}
    >
      {/* 面板头部 */}
      <div
        className="flex items-center justify-between px-2 py-1 bg-[#252525] border-b border-gray-700"
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 拖拽手柄 */}
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 hover:bg-gray-600 rounded cursor-grab active:cursor-grabbing touch-none"
            title="拖拽排序"
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {/* 状态指示器 */}
          <Circle className={`w-2 h-2 fill-current flex-shrink-0 ${STATUS_COLORS[panel.status]}`} />

          {/* 日志名称 */}
          <span className="text-xs text-gray-200 truncate font-medium">
            {panel.logFile.name}
          </span>

          {/* 服务器名称 */}
          <span className="text-xs text-gray-500 truncate hidden sm:inline">
            @ {panel.server.name}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleMaximizeClick}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3 text-gray-400" />
            ) : (
              <Maximize2 className="w-3 h-3 text-gray-400" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-600/50 rounded transition-colors"
            title="从视图中移除"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {panel.status === 'error' && panel.errorMessage && (
        <div className="px-2 py-1 bg-red-900/30 text-red-400 text-xs truncate">
          {panel.errorMessage}
        </div>
      )}

      {/* Terminal */}
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
    prev.isMaximized === next.isMaximized &&
    prev.onMaximize === next.onMaximize &&
    prev.onClose === next.onClose &&
    prev.onTerminalReady === next.onTerminalReady
  );
});
