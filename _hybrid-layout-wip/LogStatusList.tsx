'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Server as ServerIcon } from 'lucide-react';
import { LogStatusItem } from './LogStatusItem';
import type { LogPanel, Server } from '@/store';

interface LogStatusListProps {
  panels: LogPanel[];
  activeViewIds: string[];
  lastLogLines: Record<string, string>;
  onToggleView: (panelId: string) => void;
  onRemove: (panel: LogPanel) => void;
}

// 服务器分组组件
interface ServerGroupProps {
  server: Server;
  panels: LogPanel[];
  activeViewIds: string[];
  lastLogLines: Record<string, string>;
  onToggleView: (panelId: string) => void;
  onRemove: (panel: LogPanel) => void;
  defaultExpanded?: boolean;
}

const ServerGroup = memo(function ServerGroup({
  server,
  panels,
  activeViewIds,
  lastLogLines,
  onToggleView,
  onRemove,
  defaultExpanded = true,
}: ServerGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const activeCount = useMemo(() => {
    return panels.filter(p => activeViewIds.includes(p.id)).length;
  }, [panels, activeViewIds]);

  const connectedCount = useMemo(() => {
    return panels.filter(p => p.status === 'connected').length;
  }, [panels]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      {/* 服务器标题 */}
      <div
        onClick={toggleExpanded}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <ServerIcon className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-gray-200 font-medium truncate flex-1">
          {server.name}
        </span>
        <span className="text-xs text-gray-500">
          {activeCount > 0 && (
            <span className="text-blue-400 mr-1">{activeCount}显示</span>
          )}
          {connectedCount}/{panels.length}
        </span>
      </div>

      {/* 日志列表 */}
      {isExpanded && (
        <div className="pl-2">
          {panels.map(panel => (
            <LogStatusItem
              key={panel.id}
              panel={panel}
              isInView={activeViewIds.includes(panel.id)}
              lastLine={lastLogLines[panel.logFileId]}
              onToggleView={() => onToggleView(panel.id)}
              onRemove={() => onRemove(panel)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const LogStatusList = memo(function LogStatusList({
  panels,
  activeViewIds,
  lastLogLines,
  onToggleView,
  onRemove,
}: LogStatusListProps) {
  // 按服务器分组
  const serverGroups = useMemo(() => {
    const groups: Record<string, { server: Server; panels: LogPanel[] }> = {};

    panels.forEach(panel => {
      const serverId = panel.server.id;
      if (!groups[serverId]) {
        groups[serverId] = {
          server: panel.server,
          panels: [],
        };
      }
      groups[serverId].panels.push(panel);
    });

    return Object.values(groups);
  }, [panels]);

  if (panels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p className="text-sm">暂无打开的日志</p>
          <p className="text-xs mt-1">双击左侧日志文件开始监控</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {serverGroups.map(group => (
        <ServerGroup
          key={group.server.id}
          server={group.server}
          panels={group.panels}
          activeViewIds={activeViewIds}
          lastLogLines={lastLogLines}
          onToggleView={onToggleView}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
});
