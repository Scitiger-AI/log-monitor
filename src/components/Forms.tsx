'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Server } from '@/store';

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
  const [privateKeyPath, setPrivateKeyPath] = useState(server?.privateKeyPath ?? '~/.ssh/id_rsa');

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
                  placeholder="~/.ssh/id_rsa"
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
