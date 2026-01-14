import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logStreamManager } from './log-stream';
import { ClientMessage, ServerMessage } from './types';

class WSManager {
  private wss: WebSocketServer | null = null;
  private clientSubscriptions: Map<WebSocket, Set<string>> = new Map();

  init(server: HttpServer): WebSocketServer {
    // 不自动处理升级，由 server.ts 手动处理
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws) => {
      this.clientSubscriptions.set(ws, new Set());

      ws.on('message', (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch {
          // Invalid message format
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', () => {
        // WebSocket error
      });
    });

    return this.wss;
  }

  private handleMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.logFileIds);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.logFileIds);
        break;
      case 'pause':
        logStreamManager.pauseStream(message.logFileId);
        break;
      case 'resume':
        logStreamManager.resumeStream(message.logFileId);
        break;
    }
  }

  private handleSubscribe(ws: WebSocket, logFileIds: string[]) {
    const subs = this.clientSubscriptions.get(ws);
    if (!subs) return;

    for (const logFileId of logFileIds) {
      if (subs.has(logFileId)) continue;

      subs.add(logFileId);

      // 检查是否已有其他客户端订阅此日志
      const hasOtherSubscribers = this.hasSubscribers(logFileId, ws);

      if (!hasOtherSubscribers) {
        // 启动新的日志流
        logStreamManager.startStream(
          logFileId,
          (id, data) => this.broadcastLog(id, data),
          (id, status, message) => this.broadcastStatus(id, status, message)
        );
      }
    }
  }

  private handleUnsubscribe(ws: WebSocket, logFileIds: string[]) {
    const subs = this.clientSubscriptions.get(ws);
    if (!subs) return;

    for (const logFileId of logFileIds) {
      subs.delete(logFileId);

      // 如果没有其他客户端订阅，停止日志流
      if (!this.hasSubscribers(logFileId)) {
        logStreamManager.stopStream(logFileId);
      }
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const subs = this.clientSubscriptions.get(ws);
    if (subs) {
      for (const logFileId of subs) {
        if (!this.hasSubscribers(logFileId, ws)) {
          logStreamManager.stopStream(logFileId);
        }
      }
    }
    this.clientSubscriptions.delete(ws);
  }

  private hasSubscribers(logFileId: string, excludeWs?: WebSocket): boolean {
    for (const [ws, subs] of this.clientSubscriptions) {
      if (ws !== excludeWs && subs.has(logFileId)) {
        return true;
      }
    }
    return false;
  }

  private broadcastLog(logFileId: string, content: string) {
    const message: ServerMessage = {
      type: 'log',
      logFileId,
      content,
      timestamp: Date.now(),
    };
    this.broadcast(logFileId, message);
  }

  private broadcastStatus(logFileId: string, status: 'connected' | 'disconnected' | 'error', errorMessage?: string) {
    const message: ServerMessage = {
      type: 'status',
      logFileId,
      status,
      message: errorMessage,
    };
    this.broadcast(logFileId, message);
  }

  private broadcast(logFileId: string, message: ServerMessage) {
    const data = JSON.stringify(message);
    let sentCount = 0;
    for (const [ws, subs] of this.clientSubscriptions) {
      if (subs.has(logFileId) && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        sentCount++;
      }
    }
    if (message.type === 'log') {
      // Log broadcast completed
    }
  }

  close() {
    // 主动关闭所有 WebSocket 客户端连接
    for (const [ws] of this.clientSubscriptions) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutting down');
      }
    }
    this.clientSubscriptions.clear();

    if (this.wss) {
      this.wss.close();
    }
    logStreamManager.stopAll();
  }
}

export const wsManager = new WSManager();
