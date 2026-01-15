'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Server as ServerIcon,
  FileText,
  Plus,
  Trash2,
  Pencil,
  FolderPlus,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { Server, LogFile, LogGroup, useStore } from '@/store';

interface ServerTreeProps {
  onLogFileClick: (logFile: LogFile, server: Server) => void;
  onAddServer: () => void;
  onEditServer: (server: Server) => void;
  onAddLogFile: (serverId: string, groupId?: string) => void;
  onBatchAddLogFiles: (serverId: string) => void;
  onDeleteServer: (serverId: string) => void;
  onDeleteLogFile: (logFileId: string) => void;
}

// 日志文件项组件
interface LogFileItemProps {
  logFile: LogFile;
  server: Server;
  groups: LogGroup[];
  onLogFileClick: (logFile: LogFile, server: Server) => void;
  onDeleteLogFile: (logFileId: string) => void;
  onMoveToGroup: (logFileId: string, groupId: string | null) => void;
}

function LogFileItem({
  logFile,
  server,
  groups,
  onLogFileClick,
  onDeleteLogFile,
  onMoveToGroup,
}: LogFileItemProps) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  return (
    <div
      className="flex items-start gap-2 px-4 py-1.5 hover:bg-gray-800 cursor-pointer group relative"
      onDoubleClick={() => onLogFileClick(logFile, server)}
    >
      <FileText className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
      <span className="flex-1 text-sm text-gray-400 break-all" title={logFile.path}>
        {logFile.name}
      </span>
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0 mt-0.5">
        {/* 移动到分组按钮 */}
        {groups.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGroupMenu(!showGroupMenu);
              }}
              className="p-0.5 hover:bg-gray-600 rounded"
              title="移动到分组"
            >
              <FolderOpen className="w-3 h-3 text-yellow-400" />
            </button>
            {showGroupMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded shadow-lg z-50 min-w-[120px]"
                onMouseLeave={() => setShowGroupMenu(false)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToGroup(logFile.id, null);
                    setShowGroupMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${
                    logFile.groupId === null ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  未分组
                </button>
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToGroup(logFile.id, group.id);
                      setShowGroupMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${
                      logFile.groupId === group.id ? 'text-blue-400' : 'text-gray-300'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteLogFile(logFile.id);
          }}
          className="p-0.5 hover:bg-gray-600 rounded"
          title="删除日志文件"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
}

// 分组项组件
interface GroupItemProps {
  group: LogGroup;
  server: Server;
  logFiles: LogFile[];
  allGroups: LogGroup[];
  isExpanded: boolean;
  onToggle: () => void;
  onLogFileClick: (logFile: LogFile, server: Server) => void;
  onDeleteLogFile: (logFileId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onMoveToGroup: (logFileId: string, groupId: string | null) => void;
  onAddLogFile: (serverId: string, groupId: string) => void;
}

function GroupItem({
  group,
  server,
  logFiles,
  allGroups,
  isExpanded,
  onToggle,
  onLogFileClick,
  onDeleteLogFile,
  onDeleteGroup,
  onRenameGroup,
  onMoveToGroup,
  onAddLogFile,
}: GroupItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const handleSave = useCallback(() => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== group.name) {
      onRenameGroup(group.id, trimmedName);
    }
    setIsEditing(false);
  }, [editName, group.id, group.name, onRenameGroup]);

  return (
    <div>
      <div
        className="flex items-center gap-1 px-4 py-1.5 hover:bg-gray-800 cursor-pointer group"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditName(group.name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[#333] text-gray-200 text-sm px-1 rounded border border-blue-500 outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm text-gray-300 truncate">{group.name}</span>
        )}
        <span className="text-xs text-gray-500">({logFiles.length})</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddLogFile(server.id, group.id);
            }}
            className="p-0.5 hover:bg-gray-600 rounded"
            title="添加日志文件到此分组"
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditName(group.name);
              setIsEditing(true);
            }}
            className="p-0.5 hover:bg-gray-600 rounded"
            title="重命名分组"
          >
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteGroup(group.id);
            }}
            className="p-0.5 hover:bg-gray-600 rounded"
            title="删除分组"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4">
          {logFiles.length === 0 ? (
            <div className="px-4 py-2 text-xs text-gray-500">
              暂无日志文件
            </div>
          ) : (
            logFiles.map(logFile => (
              <LogFileItem
                key={logFile.id}
                logFile={logFile}
                server={server}
                groups={allGroups}
                onLogFileClick={onLogFileClick}
                onDeleteLogFile={onDeleteLogFile}
                onMoveToGroup={onMoveToGroup}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
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
  const { servers, logFiles, logGroups, fetchLogFiles, fetchLogGroups } = useStore();
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 获取服务器的分组
  const getServerGroups = useCallback((serverId: string) => {
    return logGroups.filter(g => g.serverId === serverId);
  }, [logGroups]);

  // 获取分组下的日志文件
  const getGroupLogFiles = useCallback((groupId: string) => {
    return logFiles.filter(lf => lf.groupId === groupId);
  }, [logFiles]);

  // 获取未分组的日志文件
  const getUngroupedLogFiles = useCallback((serverId: string) => {
    return logFiles.filter(lf => lf.serverId === serverId && lf.groupId === null);
  }, [logFiles]);

  // 移动日志文件到分组
  const handleMoveToGroup = useCallback(async (logFileId: string, groupId: string | null) => {
    try {
      const res = await fetch('/api/log-files/group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logFileId, groupId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogFiles();
      }
    } catch (error) {
      console.error('Failed to move log file to group:', error);
    }
  }, [fetchLogFiles]);

  // 添加分组
  const handleAddGroup = useCallback(async (serverId: string) => {
    try {
      const serverGroups = getServerGroups(serverId);
      const res = await fetch('/api/log-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          name: '新分组',
          sortOrder: serverGroups.length,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogGroups();
        // 自动展开新创建的分组
        setExpandedGroups(prev => new Set([...prev, data.data.id]));
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  }, [getServerGroups, fetchLogGroups]);

  // 删除分组
  const handleDeleteGroup = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/log-groups?id=${groupId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchLogGroups();
        fetchLogFiles(); // 刷新日志文件（groupId 会被设为 null）
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  }, [fetchLogGroups, fetchLogFiles]);

  // 重命名分组
  const handleRenameGroup = useCallback(async (groupId: string, newName: string) => {
    try {
      const res = await fetch('/api/log-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogGroups();
      }
    } catch (error) {
      console.error('Failed to rename group:', error);
    }
  }, [fetchLogGroups]);

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
            const serverGroups = getServerGroups(server.id);
            const ungroupedLogFiles = getUngroupedLogFiles(server.id);
            const totalLogFiles = logFiles.filter(lf => lf.serverId === server.id).length;

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
                  <span className="text-xs text-gray-500">({totalLogFiles})</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddGroup(server.id);
                      }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="新建分组"
                    >
                      <FolderPlus className="w-3 h-3 text-yellow-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddLogFile(server.id);
                      }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="添加日志文件"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchAddLogFiles(server.id);
                      }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="批量添加日志文件"
                    >
                      <FolderPlus className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditServer(server);
                      }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="编辑服务器"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteServer(server.id);
                      }}
                      className="p-0.5 hover:bg-gray-600 rounded"
                      title="删除服务器"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-4">
                    {/* 分组列表 */}
                    {serverGroups.map(group => (
                      <GroupItem
                        key={group.id}
                        group={group}
                        server={server}
                        logFiles={getGroupLogFiles(group.id)}
                        allGroups={serverGroups}
                        isExpanded={expandedGroups.has(group.id)}
                        onToggle={() => toggleGroup(group.id)}
                        onLogFileClick={onLogFileClick}
                        onDeleteLogFile={onDeleteLogFile}
                        onDeleteGroup={handleDeleteGroup}
                        onRenameGroup={handleRenameGroup}
                        onMoveToGroup={handleMoveToGroup}
                        onAddLogFile={onAddLogFile}
                      />
                    ))}

                    {/* 未分组的日志文件 */}
                    {ungroupedLogFiles.length > 0 && (
                      <div>
                        {serverGroups.length > 0 && (
                          <div className="px-4 py-1 text-xs text-gray-500 border-t border-gray-700 mt-1">
                            未分组
                          </div>
                        )}
                        {ungroupedLogFiles.map(logFile => (
                          <LogFileItem
                            key={logFile.id}
                            logFile={logFile}
                            server={server}
                            groups={serverGroups}
                            onLogFileClick={onLogFileClick}
                            onDeleteLogFile={onDeleteLogFile}
                            onMoveToGroup={handleMoveToGroup}
                          />
                        ))}
                      </div>
                    )}

                    {/* 空状态 */}
                    {serverGroups.length === 0 && ungroupedLogFiles.length === 0 && (
                      <div className="px-4 py-2 text-xs text-gray-500">
                        暂无日志文件
                      </div>
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
