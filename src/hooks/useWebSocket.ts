'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';

type ServerMessage = {
  type: 'log';
  logFileId: string;
  content: string;
  timestamp: number;
} | {
  type: 'status';
  logFileId: string;
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
};

type LogCallback = (logFileId: string, content: string) => void;

export function useWebSocket(onLog: LogCallback) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { updatePanelStatus } = useStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      // WebSocket connected
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        if (message.type === 'log') {
          onLog(message.logFileId, message.content);
        } else if (message.type === 'status') {
          updatePanelStatus(
            message.logFileId,
            message.status,
            message.message
          );
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      // WebSocket error handled by onclose
    };

    wsRef.current = ws;
  }, [onLog, updatePanelStatus]);

  const subscribe = useCallback((logFileIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', logFileIds }));
    }
  }, []);

  const unsubscribe = useCallback((logFileIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', logFileIds }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { subscribe, unsubscribe };
}
