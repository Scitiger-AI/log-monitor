'use client';

import { useEffect, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { X, Circle, Server as ServerIcon } from 'lucide-react';
import { LogTerminal } from './LogTerminal';
import { LogPanel as LogPanelType, Server } from '@/store';

interface LogTabsProps {
  panels: LogPanelType[];
  activeServerId: string | null;
  onActiveServerChange: (serverId: string | null) => void;
  onClose: (panel: LogPanelType) => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

export function LogTabs({ panels, activeServerId, onActiveServerChange, onClose, onTerminalReady }: LogTabsProps) {

  // 按服务器分组 panels
  const serverGroups = panels.reduce((acc, panel) => {
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

  const serverIds = Object.keys(serverGroups);

  // 当 panels 变化时，确保 activeServerId 有效
  useEffect(() => {
    if (serverIds.length === 0) {
      onActiveServerChange(null);
    } else if (!activeServerId || !serverIds.includes(activeServerId)) {
      // 选择最后一个服务器
      onActiveServerChange(serverIds[serverIds.length - 1]);
    }
  }, [serverIds, activeServerId, onActiveServerChange]);

  const handleClose = useCallback((e: React.MouseEvent, panel: LogPanelType) => {
    e.stopPropagation();
    onClose(panel);
  }, [onClose]);

  const handleCloseServer = useCallback((e: React.MouseEvent, serverId: string) => {
    e.stopPropagation();
    const group = serverGroups[serverId];
    if (group) {
      group.panels.forEach(panel => onClose(panel));
    }
  }, [serverGroups, onClose]);

  const statusColor = (status: LogPanelType['status']) => ({
    connecting: 'text-yellow-500',
    connected: 'text-green-500',
    disconnected: 'text-gray-500',
    error: 'text-red-500',
  }[status]);

  // 获取服务器的整体状态
  const getServerStatus = (panels: LogPanelType[]) => {
    if (panels.some(p => p.status === 'error')) return 'error';
    if (panels.some(p => p.status === 'connecting')) return 'connecting';
    if (panels.every(p => p.status === 'connected')) return 'connected';
    return 'disconnected';
  };

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
              <Circle className={`w-2 h-2 flex-shrink-0 fill-current ${statusColor(serverStatus)}`} />
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

      {/* Tab Content - 服务器内的日志面板 */}
      <div className="flex-1 min-h-0 relative">
        {serverIds.map(serverId => {
          const group = serverGroups[serverId];
          const isActive = serverId === activeServerId;

          return (
            <div
              key={serverId}
              className="absolute inset-0 flex flex-col"
              style={{
                visibility: isActive ? 'visible' : 'hidden',
                zIndex: isActive ? 1 : 0,
              }}
            >
              {/* 日志面板网格 */}
              <div
                className="flex-1 p-2 overflow-auto"
                style={{
                  display: 'grid',
                  gridTemplateColumns: group.panels.length === 1
                    ? '1fr'
                    : 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '8px',
                  alignContent: 'start',
                }}
              >
                {group.panels.map(panel => (
                  <div
                    key={panel.id}
                    className="bg-[#1a1a1a] rounded border border-gray-700 flex flex-col"
                    style={{
                      height: group.panels.length === 1 ? '100%' : '350px',
                      minHeight: '250px',
                    }}
                  >
                    {/* 日志面板头部 */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#252525] border-b border-gray-700 rounded-t">
                      <div className="flex items-center gap-2">
                        <Circle className={`w-2 h-2 fill-current ${statusColor(panel.status)}`} />
                        <span className="text-sm text-gray-200">{panel.logFile.name}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={panel.logFile.path}>
                          {panel.logFile.path}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleClose(e, panel)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
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

                    {/* 终端 */}
                    <div className="flex-1 min-h-0">
                      <LogTerminal
                        onReady={(terminal) => onTerminalReady(panel.logFileId, terminal)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
