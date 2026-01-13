import { spawn, ChildProcess } from 'child_process';
import { ClientChannel } from 'ssh2';
import { sshPool } from './ssh-pool';
import { getServerById, getLogFileById } from './db';
import { Server, LogFile } from './types';

type DataCallback = (logFileId: string, data: string) => void;
type StatusCallback = (logFileId: string, status: 'connected' | 'disconnected' | 'error', message?: string) => void;

interface LogStream {
  logFileId: string;
  server: Server;
  logFile: LogFile;
  stream: ClientChannel | null;
  process: ChildProcess | null;
  status: 'running' | 'paused' | 'stopped';
  onData: DataCallback;
  onStatus: StatusCallback;
}

class LogStreamManager {
  private streams: Map<string, LogStream> = new Map();

  async startStream(logFileId: string, onData: DataCallback, onStatus: StatusCallback): Promise<void> {
    if (this.streams.has(logFileId)) {
      return;
    }

    const logFile = getLogFileById(logFileId);
    if (!logFile) {
      onStatus(logFileId, 'error', 'Log file not found');
      return;
    }

    const server = getServerById(logFile.serverId);
    if (!server) {
      onStatus(logFileId, 'error', 'Server not found');
      return;
    }

    const logStream: LogStream = {
      logFileId,
      server,
      logFile,
      stream: null,
      process: null,
      status: 'running',
      onData,
      onStatus,
    };

    this.streams.set(logFileId, logStream);

    try {
      if (server.isLocal) {
        await this.startLocalStream(logStream);
      } else {
        await this.startRemoteStream(logStream);
      }
      onStatus(logFileId, 'connected');
    } catch (err) {
      this.streams.delete(logFileId);
      onStatus(logFileId, 'error', (err as Error).message);
    }
  }

  private async startLocalStream(logStream: LogStream): Promise<void> {
    const { logFile, logFileId, onData, onStatus } = logStream;

    const proc = spawn('tail', ['-n', String(logFile.tailLines), '-f', logFile.path]);
    logStream.process = proc;

    proc.stdout.on('data', (data: Buffer) => {
      if (logStream.status === 'running') {
        onData(logFileId, data.toString());
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      onStatus(logFileId, 'error', data.toString());
    });

    proc.on('close', () => {
      this.streams.delete(logFileId);
      onStatus(logFileId, 'disconnected');
    });

    proc.on('error', (err) => {
      this.streams.delete(logFileId);
      onStatus(logFileId, 'error', err.message);
    });
  }

  private async startRemoteStream(logStream: LogStream): Promise<void> {
    const { server, logFile, logFileId, onData, onStatus } = logStream;

    const stream = await sshPool.execTail(
      server,
      logFile.path,
      logFile.tailLines,
      (data) => {
        if (logStream.status === 'running') {
          onData(logFileId, data);
        }
      },
      (err) => {
        onStatus(logFileId, 'error', err.message);
      }
    );

    logStream.stream = stream;

    stream.on('close', () => {
      this.streams.delete(logFileId);
      onStatus(logFileId, 'disconnected');
    });
  }

  stopStream(logFileId: string): void {
    const logStream = this.streams.get(logFileId);
    if (!logStream) return;

    logStream.status = 'stopped';

    if (logStream.process) {
      logStream.process.kill();
    }

    if (logStream.stream) {
      logStream.stream.close();
    }

    this.streams.delete(logFileId);
  }

  pauseStream(logFileId: string): void {
    const logStream = this.streams.get(logFileId);
    if (logStream) {
      logStream.status = 'paused';
    }
  }

  resumeStream(logFileId: string): void {
    const logStream = this.streams.get(logFileId);
    if (logStream) {
      logStream.status = 'running';
    }
  }

  stopAll(): void {
    for (const [id] of this.streams) {
      this.stopStream(id);
    }
  }

  getActiveStreams(): string[] {
    return Array.from(this.streams.keys());
  }
}

export const logStreamManager = new LogStreamManager();
