# Log Monitor

实时多服务器日志监控系统，支持本地和远程服务器的日志文件实时监控。

## 功能特性

- **多服务器管理**：支持添加、编辑、删除多个服务器配置
- **SSH 远程连接**：通过 SSH 密钥认证安全连接远程服务器
- **本地日志监控**：支持监控本地服务器的日志文件
- **实时日志流**：基于 WebSocket 的实时日志推送
- **终端模拟器**：使用 xterm.js 提供类似终端的日志显示体验
- **多面板支持**：可同时监控多个日志文件
- **标签页管理**：按服务器分组的标签页界面
- **连接池优化**：智能 SSH 连接池，复用连接提高性能

## 技术栈

### 前端
- **Next.js 16** - React 全栈框架
- **React 19** - UI 库
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 样式框架
- **Zustand** - 状态管理
- **xterm.js** - 终端模拟器
- **Lucide React** - 图标库

### 后端
- **Express 5** - Web 服务器
- **WebSocket (ws)** - 实时通信
- **SSH2** - SSH 连接
- **Better-SQLite3** - 本地数据库

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆仓库
git clone git@github.com:Scitiger-AI/log-monitor.git
cd log-monitor

# 安装依赖
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产构建

```bash
# 构建
npm run build

# 启动
npm run start
```

## 使用说明

### 添加服务器

1. 点击侧边栏的 "+" 按钮添加服务器
2. 填写服务器信息：
   - **名称**：服务器显示名称
   - **主机**：服务器 IP 或域名
   - **端口**：SSH 端口（默认 22）
   - **用户名**：SSH 登录用户名
   - **私钥路径**：SSH 私钥文件路径（支持 `~` 展开）
   - **本地服务器**：勾选则监控本地日志文件

### 添加日志文件

1. 右键点击服务器或点击服务器旁的 "+" 按钮
2. 填写日志文件信息：
   - **名称**：日志文件显示名称
   - **路径**：日志文件完整路径
   - **初始行数**：首次加载显示的日志行数

### 监控日志

1. 点击侧边栏中的日志文件
2. 日志将在主面板中实时显示
3. 可同时打开多个日志文件进行监控

## 项目结构

```
log-monitor/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   │   ├── servers/    # 服务器管理 API
│   │   │   ├── log-files/  # 日志文件管理 API
│   │   │   └── health/     # 健康检查 API
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 主页面
│   │   └── globals.css     # 全局样式
│   ├── components/         # React 组件
│   │   ├── ServerTree.tsx  # 服务器树形列表
│   │   ├── LogTabs.tsx     # 日志标签页
│   │   ├── LogTerminal.tsx # 日志终端
│   │   └── Forms.tsx       # 表单组件
│   ├── hooks/              # React Hooks
│   │   └── useWebSocket.ts # WebSocket Hook
│   ├── lib/                # 核心库
│   │   ├── db.ts           # 数据库操作
│   │   ├── ssh-pool.ts     # SSH 连接池
│   │   ├── ws-manager.ts   # WebSocket 管理
│   │   ├── log-stream.ts   # 日志流管理
│   │   └── types.ts        # 类型定义
│   └── store/              # 状态管理
│       └── index.ts        # Zustand Store
├── data/                   # 数据目录
│   └── log-monitor.db      # SQLite 数据库
├── server.ts               # 自定义服务器入口
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## API 接口

### 服务器管理

- `GET /api/servers` - 获取所有服务器
- `POST /api/servers` - 添加服务器
- `PUT /api/servers` - 更新服务器
- `DELETE /api/servers?id={id}` - 删除服务器

### 日志文件管理

- `GET /api/log-files` - 获取所有日志文件
- `POST /api/log-files` - 添加日志文件
- `DELETE /api/log-files?id={id}` - 删除日志文件

### WebSocket

- `ws://localhost:3000/ws` - 日志实时推送

#### 客户端消息

```json
{ "type": "subscribe", "logFileIds": ["id1", "id2"] }
{ "type": "unsubscribe", "logFileIds": ["id1"] }
{ "type": "pause", "logFileId": "id1" }
{ "type": "resume", "logFileId": "id1" }
```

#### 服务端消息

```json
{ "type": "log", "logFileId": "id1", "content": "...", "timestamp": 1234567890 }
{ "type": "status", "logFileId": "id1", "status": "connected" }
```

## 许可证

ISC
