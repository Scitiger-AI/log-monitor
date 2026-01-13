import { Client, ClientChannel } from 'ssh2';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { Server } from './types';

// 展开 ~ 路径
function expandPath(path: string): string {
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
}

export const sshPool = new SSHPool();
