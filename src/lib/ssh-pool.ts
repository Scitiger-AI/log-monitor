import { Client, ClientChannel } from 'ssh2';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { Server, FileInfo } from './types';

// 展开 ~ 路径
export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace('~', homedir());
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}

interface SSHConnection {
  client: Client;
  serverId: string;
  lastUsed: Date;
  isConnected: boolean;
}

class SSHPool {
  private connections: Map<string, SSHConnection> = new Map();
  private connectingPromises: Map<string, Promise<Client>> = new Map();

  async getConnection(server: Server): Promise<Client> {
    const existing = this.connections.get(server.id);
    if (existing?.isConnected) {
      existing.lastUsed = new Date();
      return existing.client;
    }

    // 避免重复连接
    const connecting = this.connectingPromises.get(server.id);
    if (connecting) {
      return connecting;
    }

    const promise = this.createConnection(server);
    this.connectingPromises.set(server.id, promise);

    try {
      const client = await promise;
      return client;
    } finally {
      this.connectingPromises.delete(server.id);
    }
  }

  private createConnection(server: Server): Promise<Client> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      client.on('ready', () => {
        this.connections.set(server.id, {
          client,
          serverId: server.id,
          lastUsed: new Date(),
          isConnected: true,
        });
        resolve(client);
      });

      client.on('error', (err) => {
        this.connections.delete(server.id);
        reject(err);
      });

      client.on('close', () => {
        const conn = this.connections.get(server.id);
        if (conn) {
          conn.isConnected = false;
        }
      });

      const config: Record<string, unknown> = {
        host: server.host,
        port: server.port,
        username: server.username,
        readyTimeout: 10000,
      };

      if (server.privateKeyPath) {
        try {
          const keyPath = expandPath(server.privateKeyPath);
          config.privateKey = readFileSync(keyPath);
        } catch (err) {
          const error = new Error(`Failed to read private key: ${server.privateKeyPath} - ${(err as Error).message}`);
          reject(error);
          return;
        }
      }

      client.connect(config);
    });
  }

  async execTail(server: Server, logPath: string, tailLines: number, onData: (data: string) => void, onError: (err: Error) => void): Promise<ClientChannel> {
    const client = await this.getConnection(server);

    return new Promise((resolve, reject) => {
      const cmd = `tail -n ${tailLines} -f "${logPath}"`;

      // 使用 pty: true 来确保 tail -f 正确输出
      client.exec(cmd, { pty: true }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data: Buffer) => {
          const text = data.toString();
          onData(text);
        });

        stream.stderr.on('data', (data: Buffer) => {
          onError(new Error(data.toString()));
        });

        stream.on('close', () => {
          // Stream closed
        });

        resolve(stream);
      });
    });
  }

  closeConnection(serverId: string) {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.client.end();
      this.connections.delete(serverId);
    }
  }

  closeAll() {
    for (const [id] of this.connections) {
      this.closeConnection(id);
    }
  }

  getStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    for (const [id, conn] of this.connections) {
      status.set(id, conn.isConnected);
    }
    return status;
  }

  // 列出远程目录内容
  async listDirectory(server: Server, dirPath: string): Promise<FileInfo[]> {
    const client = await this.getConnection(server);
    const expandedPath = expandPath(dirPath);

    return new Promise((resolve, reject) => {
      // 使用 ls -la 获取详细文件信息，--time-style 确保时间格式一致
      const cmd = `ls -la --time-style=long-iso "${expandedPath}" 2>/dev/null | tail -n +2`;

      client.exec(cmd, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on('close', () => {
          if (errorOutput && !output) {
            reject(new Error(errorOutput.trim() || '无法访问目录'));
            return;
          }

          const files = this.parseLsOutput(output, expandedPath);
          resolve(files);
        });
      });
    });
  }

  // 解析 ls -la 输出
  private parseLsOutput(output: string, basePath: string): FileInfo[] {
    const lines = output.trim().split('\n').filter(line => line.length > 0);
    const files: FileInfo[] = [];

    for (const line of lines) {
      // ls -la --time-style=long-iso 格式:
      // drwxr-xr-x 2 user group 4096 2024-01-14 10:00 filename
      // -rw-r--r-- 1 user group 1234 2024-01-14 10:00 filename with spaces
      const match = line.match(/^([d\-l])([rwx\-]{9})\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/);

      if (match) {
        const [, typeChar, , sizeStr, date, time, name] = match;

        // 跳过 . 和 .. 目录
        if (name === '.' || name === '..') continue;

        const isDirectory = typeChar === 'd';
        const isSymlink = typeChar === 'l';

        // 处理符号链接（显示链接名，不跟随）
        const displayName = isSymlink ? name.split(' -> ')[0] : name;

        files.push({
          name: displayName,
          path: basePath.endsWith('/') ? `${basePath}${displayName}` : `${basePath}/${displayName}`,
          isDirectory,
          size: parseInt(sizeStr, 10),
          modifiedAt: `${date} ${time}`,
        });
      }
    }

    // 目录在前，文件在后，各自按名称排序
    return files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

export const sshPool = new SSHPool();
