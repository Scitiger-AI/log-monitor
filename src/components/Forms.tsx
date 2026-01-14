'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, FolderOpen, Loader2, FileText, Folder, Check, AlertCircle } from 'lucide-react';
import { Server, useStore } from '@/store';

// 文件信息类型
interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

interface ServerFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  isLocal: boolean;
}

interface ServerFormProps {
  server?: Server; // 如果传入 server，则为编辑模式
  onSubmit: (data: ServerFormData) => void;
  onCancel: () => void;
}

export function ServerForm({ server, onSubmit, onCancel }: ServerFormProps) {
  const isEditMode = !!server;
  const [isLocal, setIsLocal] = useState(server?.isLocal ?? false);
  const [name, setName] = useState(server?.name ?? '');
  const [host, setHost] = useState(server?.host ?? '');
  const [port, setPort] = useState(server?.port ?? 22);
  const [username, setUsername] = useState(server?.username ?? '');
  const [privateKeyPath, setPrivateKeyPath] = useState(server?.privateKeyPath ?? '');
  const [detectedKeyPath, setDetectedKeyPath] = useState('~/.ssh/id_rsa'); // 用于 placeholder

  // 自动检测 SSH 密钥路径（仅在新增模式下）
  useEffect(() => {
    if (!isEditMode) {
      fetch('/api/ssh-keys')
        .then(res => res.json())
        .then(data => {
          if (data.defaultKey) {
            setDetectedKeyPath(data.defaultKey);
            // 仅在用户未手动输入时设置默认值
            setPrivateKeyPath(prev => prev === '' ? data.defaultKey : prev);
          }
        })
        .catch(err => {
          console.error('Failed to detect SSH keys:', err);
        });
    }
  }, [isEditMode]);

  // 当 server 变化时更新表单
  useEffect(() => {
    if (server) {
      setIsLocal(server.isLocal);
      setName(server.name);
      setHost(server.host);
      setPort(server.port);
      setUsername(server.username);
      setPrivateKeyPath(server.privateKeyPath);
    }
  }, [server]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, host, port, username, privateKeyPath, isLocal });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252525] rounded-lg w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-200">
            {isEditMode ? '编辑服务器' : '添加服务器'}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-600 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLocal"
              checked={isLocal}
              onChange={(e) => setIsLocal(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700"
            />
            <label htmlFor="isLocal" className="text-sm text-gray-300">本地服务器</label>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: R720xd-2"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {!isLocal && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">主机地址</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="例如: 192.168.1.100"
                  required={!isLocal}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">端口</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如: root"
                  required={!isLocal}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">私钥路径</label>
                <input
                  type="text"
                  value={privateKeyPath}
                  onChange={(e) => setPrivateKeyPath(e.target.value)}
                  placeholder={detectedKeyPath}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {isEditMode ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LogFileFormProps {
  serverId: string;
  serverName: string;
  onSubmit: (data: { name: string; path: string; tailLines: number }) => void;
  onCancel: () => void;
}

export function LogFileForm({ serverName, onSubmit, onCancel }: LogFileFormProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [tailLines, setTailLines] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, path, tailLines });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252525] rounded-lg w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-200">添加日志文件 - {serverName}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-600 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">显示名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: spider.log"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">文件路径</label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="例如: /var/log/supervisor/app.out.log"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">初始显示行数</label>
            <input
              type="number"
              value={tailLines}
              onChange={(e) => setTailLines(Number(e.target.value))}
              min={1}
              max={1000}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface BatchLogFileFormProps {
  serverId: string;
  serverName: string;
  onSubmit: (data: { files: { name: string; path: string }[]; tailLines: number }) => void;
  onCancel: () => void;
}

export function BatchLogFileForm({ serverId, serverName, onSubmit, onCancel }: BatchLogFileFormProps) {
  const [dirPath, setDirPath] = useState('/var/log');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [tailLines, setTailLines] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 从 store 获取已添加的日志文件
  const { logFiles } = useStore();

  // 计算该服务器已添加的日志文件路径集合
  const existingPaths = useMemo(() => {
    return new Set(
      logFiles
        .filter(lf => lf.serverId === serverId)
        .map(lf => lf.path)
    );
  }, [logFiles, serverId]);

  // 浏览目录
  const handleBrowse = async () => {
    if (!dirPath.trim()) {
      setError('请输入目录路径');
      return;
    }

    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFiles(new Set());

    try {
      const res = await fetch(`/api/browse?serverId=${serverId}&path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || '浏览目录失败');
        return;
      }

      setFiles(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '浏览目录失败');
    } finally {
      setLoading(false);
    }
  };

  // 进入子目录
  const handleEnterDirectory = (path: string) => {
    setDirPath(path);
  };

  // 当目录路径变化时自动浏览（仅在进入子目录时）
  useEffect(() => {
    if (files.length > 0) {
      handleBrowse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirPath]);

  // 切换文件选择（已存在的文件不可选择）
  const toggleFileSelection = (path: string) => {
    if (existingPaths.has(path)) return; // 已存在的文件不可选择
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  // 全选/取消全选（仅未添加的文件）
  const toggleSelectAll = () => {
    const selectableFiles = files.filter(f => !f.isDirectory && !existingPaths.has(f.path));
    const allSelected = selectableFiles.every(f => selectedFiles.has(f.path));
    if (allSelected) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(selectableFiles.map(f => f.path)));
    }
  };

  // 提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.size === 0) {
      setError('请至少选择一个文件');
      return;
    }

    const selectedFileList = files
      .filter(f => selectedFiles.has(f.path))
      .map(f => ({ name: f.name, path: f.path }));

    onSubmit({ files: selectedFileList, tailLines });
  };

  const fileItems = files.filter(f => !f.isDirectory);
  const dirItems = files.filter(f => f.isDirectory);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252525] rounded-lg w-full max-w-2xl border border-gray-700 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-200">批量添加日志文件 - {serverName}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-600 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* 目录输入 */}
          <div className="p-4 border-b border-gray-700">
            <label className="block text-sm text-gray-400 mb-1">目录路径</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                placeholder="/var/log"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBrowse();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded hover:bg-gray-500 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
                浏览
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          {/* 文件列表 */}
          <div className="flex-1 overflow-auto p-4">
            {files.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-8">
                输入目录路径并点击"浏览"查看文件列表
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-1">
                {/* 目录列表 */}
                {dirItems.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleEnterDirectory(file.path)}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 cursor-pointer text-gray-300"
                  >
                    <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{file.modifiedAt}</span>
                  </div>
                ))}

                {/* 文件列表 */}
                {fileItems.map((file) => {
                  const isExisting = existingPaths.has(file.path);
                  return (
                    <div
                      key={file.path}
                      onClick={() => toggleFileSelection(file.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                        isExisting
                          ? 'opacity-50 cursor-not-allowed bg-gray-800/50 border border-transparent'
                          : selectedFiles.has(file.path)
                            ? 'bg-blue-600/20 border border-blue-500/50 cursor-pointer'
                            : 'hover:bg-gray-700 border border-transparent cursor-pointer'
                      }`}
                    >
                      {isExisting ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            selectedFiles.has(file.path)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-500'
                          }`}
                        >
                          {selectedFiles.has(file.path) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <FileText className={`w-4 h-4 flex-shrink-0 ${isExisting ? 'text-gray-500' : 'text-green-500'}`} />
                      <span className={`flex-1 truncate ${isExisting ? 'text-gray-500' : 'text-gray-200'}`}>{file.name}</span>
                      {isExisting && (
                        <span className="text-xs text-yellow-500 px-1.5 py-0.5 bg-yellow-500/10 rounded">已添加</span>
                      )}
                      <span className="text-xs text-gray-500 w-20 text-right">{formatFileSize(file.size)}</span>
                      <span className="text-xs text-gray-500 w-32 text-right">{file.modifiedAt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-gray-700 space-y-3">
            {fileItems.length > 0 && (
              <div className="flex items-center justify-between">
                {(() => {
                  const selectableFiles = fileItems.filter(f => !existingPaths.has(f.path));
                  const existingCount = fileItems.length - selectableFiles.length;
                  const allSelected = selectableFiles.length > 0 && selectableFiles.every(f => selectedFiles.has(f.path));
                  return (
                    <>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        disabled={selectableFiles.length === 0}
                        className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {allSelected ? '取消全选' : '全选可添加'}
                      </button>
                      <span className="text-sm text-gray-400">
                        已选择 {selectedFiles.size} 个文件
                        {existingCount > 0 && (
                          <span className="text-yellow-500 ml-2">（{existingCount} 个已添加）</span>
                        )}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">初始行数:</label>
                <input
                  type="number"
                  value={tailLines}
                  onChange={(e) => setTailLines(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={selectedFiles.size === 0}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加 {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
