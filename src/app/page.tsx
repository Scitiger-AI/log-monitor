'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { v4 as uuidv4 } from 'uuid';
import { ServerTree } from '@/components/ServerTree';
import { LogTabs } from '@/components/LogTabs';
import { ServerForm, LogFileForm, BatchLogFileForm } from '@/components/Forms';
import { useStore, Server, LogFile, LogPanel as LogPanelType } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Home() {
  const { servers, panels, fetchServers, fetchLogFiles, addPanel, removePanel } = useStore();
  const [showServerForm, setShowServerForm] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [showLogFileForm, setShowLogFileForm] = useState<string | null>(null);
  const [showBatchLogFileForm, setShowBatchLogFileForm] = useState<string | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const terminalsRef = useRef<Map<string, Terminal>>(new Map());

  const handleLog = useCallback((logFileId: string, content: string) => {
    const terminal = terminalsRef.current.get(logFileId);
    if (terminal) {
      terminal.write(content.replace(/\n/g, '\r\n'));
    }
  }, []);

  const { subscribe, unsubscribe } = useWebSocket(handleLog);

  useEffect(() => {
    fetchServers();
    fetchLogFiles();
  }, [fetchServers, fetchLogFiles]);

  const handleLogFileClick = useCallback((logFile: LogFile, server: Server) => {
    const existingPanel = panels.find(p => p.logFileId === logFile.id);
    if (existingPanel) {
      // 如果已存在，只切换到对应服务器的 Tab
      setActiveServerId(server.id);
      return;
    }

    const panel: LogPanelType = {
      id: uuidv4(),
      logFileId: logFile.id,
      logFile,
      server,
      status: 'connecting',
    };

    addPanel(panel);
    // 自动切换到该服务器的 Tab
    setActiveServerId(server.id);
    setTimeout(() => subscribe([logFile.id]), 100);
  }, [panels, addPanel, subscribe]);

  const handleClosePanel = useCallback((panel: LogPanelType) => {
    unsubscribe([panel.logFileId]);
    terminalsRef.current.delete(panel.logFileId);
    removePanel(panel.id);
  }, [unsubscribe, removePanel]);

  const handleTerminalReady = useCallback((logFileId: string, terminal: Terminal) => {
    terminalsRef.current.set(logFileId, terminal);
  }, []);

  const handleAddServer = async (data: {
    name: string;
    host: string;
    port: number;
    username: string;
    privateKeyPath: string;
    isLocal: boolean;
  }) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        fetchServers();
        setShowServerForm(false);
      } else {
        alert(result.error);
      }
    } catch {
      alert('添加服务器失败');
    }
  };

  const handleEditServer = async (data: {
    name: string;
    host: string;
    port: number;
    username: string;
    privateKeyPath: string;
    isLocal: boolean;
  }) => {
    if (!editingServer) return;

    try {
      const res = await fetch('/api/servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingServer.id, ...data }),
      });
      const result = await res.json();
      if (result.success) {
        fetchServers();
        setEditingServer(null);
      } else {
        alert(result.error);
      }
    } catch {
      alert('更新服务器失败');
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('确定要删除此服务器吗？相关的日志文件也会被删除。')) return;

    try {
      const res = await fetch(`/api/servers?id=${serverId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        fetchServers();
        fetchLogFiles();
      } else {
        alert(result.error);
      }
    } catch {
      alert('删除服务器失败');
    }
  };

  const handleAddLogFile = async (data: { name: string; path: string; tailLines: number }) => {
    if (!showLogFileForm) return;

    try {
      const res = await fetch('/api/log-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, serverId: showLogFileForm }),
      });
      const result = await res.json();
      if (result.success) {
        fetchLogFiles();
        setShowLogFileForm(null);
      } else {
        alert(result.error);
      }
    } catch {
      alert('添加日志文件失败');
    }
  };

  const handleDeleteLogFile = async (logFileId: string) => {
    if (!confirm('确定要删除此日志文件吗？')) return;

    try {
      const res = await fetch(`/api/log-files?id=${logFileId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        fetchLogFiles();
        // 关闭相关面板
        const panel = panels.find(p => p.logFileId === logFileId);
        if (panel) {
          handleClosePanel(panel);
        }
      } else {
        alert(result.error);
      }
    } catch {
      alert('删除日志文件失败');
    }
  };

  const handleBatchAddLogFiles = async (data: { files: { name: string; path: string }[]; tailLines: number }) => {
    if (!showBatchLogFileForm) return;

    try {
      const res = await fetch('/api/log-files/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: showBatchLogFileForm,
          files: data.files,
          tailLines: data.tailLines,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetchLogFiles();
        setShowBatchLogFileForm(null);
        alert(result.message || `成功添加 ${data.files.length} 个日志文件`);
      } else {
        alert(result.error);
      }
    } catch {
      alert('批量添加日志文件失败');
    }
  };

  const selectedServer = showLogFileForm ? servers.find(s => s.id === showLogFileForm) : null;
  const batchSelectedServer = showBatchLogFileForm ? servers.find(s => s.id === showBatchLogFileForm) : null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 flex items-center px-4 border-b border-gray-700 bg-[#1e1e1e]">
        <h1 className="text-lg font-semibold text-gray-200">Log Monitor</h1>
        <span className="ml-4 text-sm text-gray-500">实时日志监控系统</span>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-700 flex-shrink-0">
          <ServerTree
            onLogFileClick={handleLogFileClick}
            onAddServer={() => setShowServerForm(true)}
            onEditServer={(server) => setEditingServer(server)}
            onAddLogFile={(serverId) => setShowLogFileForm(serverId)}
            onBatchAddLogFiles={(serverId) => setShowBatchLogFileForm(serverId)}
            onDeleteServer={handleDeleteServer}
            onDeleteLogFile={handleDeleteLogFile}
          />
        </aside>

        {/* Log Tabs */}
        <main className="flex-1 min-h-0 bg-[#1a1a1a]">
          <LogTabs
            panels={panels}
            activeServerId={activeServerId}
            onActiveServerChange={setActiveServerId}
            onClose={handleClosePanel}
            onTerminalReady={handleTerminalReady}
          />
        </main>
      </div>

      {/* Status Bar */}
      <footer className="h-6 flex items-center px-4 border-t border-gray-700 bg-[#1e1e1e] text-xs text-gray-500">
        <span>已连接 {panels.filter(p => p.status === 'connected').length} 个日志流</span>
        <span className="mx-2">|</span>
        <span>服务器: {servers.length}</span>
      </footer>

      {/* Modals */}
      {showServerForm && (
        <ServerForm
          onSubmit={handleAddServer}
          onCancel={() => setShowServerForm(false)}
        />
      )}

      {editingServer && (
        <ServerForm
          server={editingServer}
          onSubmit={handleEditServer}
          onCancel={() => setEditingServer(null)}
        />
      )}

      {showLogFileForm && selectedServer && (
        <LogFileForm
          serverId={showLogFileForm}
          serverName={selectedServer.name}
          onSubmit={handleAddLogFile}
          onCancel={() => setShowLogFileForm(null)}
        />
      )}

      {showBatchLogFileForm && batchSelectedServer && (
        <BatchLogFileForm
          serverId={showBatchLogFileForm}
          serverName={batchSelectedServer.name}
          onSubmit={handleBatchAddLogFiles}
          onCancel={() => setShowBatchLogFileForm(null)}
        />
      )}
    </div>
  );
}
