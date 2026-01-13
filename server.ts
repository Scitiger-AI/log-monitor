import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { wsManager } from './src/lib/ws-manager';
import { getDb } from './src/lib/db';
import { sshPool } from './src/lib/ssh-pool';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const upgradeHandler = app.getUpgradeHandler();
  // 初始化数据库
  getDb();

  const server = express();
  const httpServer = createServer(server);

  // 初始化我们的 WebSocket 服务器
  const wss = wsManager.init(httpServer);

  // 处理 WebSocket 升级请求
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '', true);

    if (pathname === '/ws') {
      // 我们的日志 WebSocket
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      // Next.js HMR WebSocket
      upgradeHandler(req, socket, head);
    }
  });

  // 处理所有 HTTP 请求
  server.use((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`Log Monitor ready on http://${hostname}:${port}`);
  });

  // 优雅关闭
  const shutdown = () => {
    wsManager.close();
    sshPool.closeAll();
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
