'use client';

import { useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { X, Circle } from 'lucide-react';
import { LogTerminal } from './LogTerminal';
import { LogPanel as LogPanelType } from '@/store';

interface LogPanelProps {
  panel: LogPanelType;
  onClose: () => void;
  onTerminalReady: (logFileId: string, terminal: Terminal) => void;
}

export function LogPanel({ panel, onClose, onTerminalReady }: LogPanelProps) {
  const terminalRef = useRef<Terminal | null>(null);

  const handleReady = useCallback((terminal: Terminal) => {
    terminalRef.current = terminal;
    onTerminalReady(panel.logFileId, terminal);
  }, [panel.logFileId, onTerminalReady]);

  const statusColor = {
    connecting: 'text-yellow-500',
    connected: 'text-green-500',
    disconnected: 'text-gray-500',
    error: 'text-red-500',
  }[panel.status];

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Circle className={`w-2 h-2 fill-current ${statusColor}`} />
          <span className="text-sm font-medium text-gray-200">{panel.logFile.name}</span>
          <span className="text-xs text-gray-500">({panel.server.name})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-600 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {panel.status === 'error' && panel.errorMessage && (
        <div className="px-3 py-2 bg-red-900/30 text-red-400 text-sm">
          {panel.errorMessage}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <LogTerminal onReady={handleReady} />
      </div>
    </div>
  );
}
