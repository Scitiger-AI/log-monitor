// 服务器配置
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  isLocal: boolean;
  createdAt: string;
}

// 日志文件配置
export interface LogFile {
  id: string;
  serverId: string;
  name: string;
  path: string;
  tailLines: number;
  createdAt: string;
}

// WebSocket 消息类型
export type ClientMessage =
  | { type: 'subscribe'; logFileIds: string[] }
  | { type: 'unsubscribe'; logFileIds: string[] }
  | { type: 'pause'; logFileId: string }
  | { type: 'resume'; logFileId: string };

export type ServerMessage =
  | { type: 'log'; logFileId: string; content: string; timestamp: number }
  | { type: 'status'; logFileId: string; status: 'connected' | 'disconnected' | 'error'; message?: string }
  | { type: 'error'; logFileId: string; message: string };

// 日志流状态
export interface LogStreamState {
  logFileId: string;
  status: 'running' | 'paused' | 'stopped';
  startTime: Date;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
