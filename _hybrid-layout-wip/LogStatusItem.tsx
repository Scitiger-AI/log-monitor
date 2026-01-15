'use client';

import { memo, useCallback } from 'react';
import { Circle, X, Eye, EyeOff } from 'lucide-react';
import type { LogPanel } from '@/store';

interface LogStatusItemProps {
  panel: LogPanel;
  isInView: boolean;
  lastLine?: string;
  onToggleView: () => void;
  onRemove: () => void;
}

// 状态颜色映射
const STATUS_COLORS: Record<LogPanel['status'], string> = {
  connecting: 'text-yellow-500',
  connected: 'text-green-500',
  disconnected: 'text-gray-500',
  error: 'text-red-500',
};

const STATUS_LABELS: Record<LogPanel['status'], string> = {
  connecting: '连接中',
  connected: '已连接',
  disconnected: '已断开',
  error: '错误',
};

export const LogStatusItem = memo(function LogStatusItem({
  panel,
  isInView,
  lastLine,
  onToggleView,
  onRemove,
}: LogStatusItemProps) {
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

  return (
    <div
      onClick={onToggleView}
      className={`
        group flex items-center gap-2 px-3 py-2
        cursor-pointer hover:bg-gray-800/80
        border-l-2 transition-all duration-150
        ${isInView
          ? 'border-blue-500 bg-gray-800/50'
          : 'border-transparent hover:border-gray-600'}
      `}
      title={`${panel.logFile.path}\n状态: ${STATUS_LABELS[panel.status]}${isInView ? '\n点击从视图中移除' : '\n点击添加到视图'}`}
    >
      {/* 状态指示器 */}
      <Circle
        className={`w-2 h-2 flex-shrink-0 fill-current ${STATUS_COLORS[panel.status]}`}
      />

      {/* 日志信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-200 truncate font-medium">
            {panel.logFile.name}
          </span>
          {isInView && (
            <Eye className="w-3 h-3 text-blue-400 flex-shrink-0" />
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {lastLine || panel.logFile.path}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleView();
          }}
          className="p-1 hover:bg-gray-600 rounded transition-colors"
          title={isInView ? '从视图中移除' : '添加到视图'}
        >
          {isInView ? (
            <EyeOff className="w-3 h-3 text-gray-400" />
          ) : (
            <Eye className="w-3 h-3 text-gray-400" />
          )}
        </button>
        <button
          onClick={handleRemove}
          className="p-1 hover:bg-red-600/50 rounded transition-colors"
          title="关闭此日志"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
});
