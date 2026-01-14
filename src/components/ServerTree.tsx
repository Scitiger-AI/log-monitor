'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Server as ServerIcon, FileText, Plus, Trash2, Pencil, FolderPlus } from 'lucide-react';
import { Server, LogFile, useStore } from '@/store';

interface ServerTreeProps {
  onLogFileClick: (logFile: LogFile, server: Server) => void;
  onAddServer: () => void;
  onEditServer: (server: Server) => void;
  onAddLogFile: (serverId: string) => void;
  onBatchAddLogFiles: (serverId: string) => void;
  onDeleteServer: (serverId: string) => void;
  onDeleteLogFile: (logFileId: string) => void;
}

export function ServerTree({
  onLogFileClick,
  onAddServer,
  onEditServer,
  onAddLogFile,
  onBatchAddLogFiles,
  onDeleteServer,
  onDeleteLogFile,
}: ServerTreeProps) {
  const { servers, logFiles } = useStore();
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  const toggleServer = (serverId: string) => {
    setExpandedServers(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  const getServerLogFiles = (serverId: string) => {
    return logFiles.filter(lf => lf.serverId === serverId);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">服务器</span>
        <button
          onClick={onAddServer}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="添加服务器"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {servers.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 text-sm">
            暂无服务器，点击 + 添加
          </div>
        ) : (
          servers.map(server => {
            const isExpanded = expandedServers.has(server.id);
            const serverLogFiles = getServerLogFiles(server.id);

            return (
              <div key={server.id}>
                <div
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-800 cursor-pointer group"
                  onClick={() => toggleServer(server.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <ServerIcon className="w-4 h-4 text-blue-400" />
                  <span className="flex-1 text-sm text-gray-300 truncate">{server.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddLogFile(server.id); }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="添加日志文件"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onBatchAddLogFiles(server.id); }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="批量添加日志文件"
                    >
                      <FolderPlus className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditServer(server); }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="编辑服务器"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteServer(server.id); }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="删除服务器"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-4">
                    {serverLogFiles.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-gray-500">
                        暂无日志文件
                      </div>
                    ) : (
                      serverLogFiles.map(logFile => (
                        <div
                          key={logFile.id}
                          className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-800 cursor-pointer group"
                          onDoubleClick={() => onLogFileClick(logFile, server)}
                        >
                          <FileText className="w-4 h-4 text-green-400" />
                          <span className="flex-1 text-sm text-gray-400 truncate" title={logFile.path}>
                            {logFile.name}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteLogFile(logFile.id); }}
                            className="hidden group-hover:block p-0.5 hover:bg-gray-600 rounded"
                            title="删除日志文件"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
