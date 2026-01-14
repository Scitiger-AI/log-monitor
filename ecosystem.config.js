/**
 * PM2 Ecosystem Configuration
 * 日志监控系统 - Log Monitor
 *
 * 启动命令:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *
 * 常用命令:
 *   pm2 logs log-monitor          # 查看日志
 *   pm2 restart log-monitor       # 重启应用
 *   pm2 stop log-monitor          # 停止应用
 *   pm2 delete log-monitor        # 删除应用
 *   pm2 monit                     # 监控面板
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'log-monitor',

      // 使用 tsx 运行 TypeScript 入口文件
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',

      // 工作目录
      cwd: __dirname,

      // 实例数量 (1 = 单实例，适合 WebSocket 应用)
      instances: 1,

      // 执行模式: fork (单进程) 或 cluster (多进程)
      // WebSocket 应用建议使用 fork 模式
      exec_mode: 'fork',

      // 监听文件变化自动重启 (生产环境建议关闭)
      watch: false,

      // 忽略监听的目录
      ignore_watch: [
        'node_modules',
        '.git',
        '.next',
        'data',
        'logs',
        '*.log',
      ],

      // 最大内存限制，超过后自动重启
      max_memory_restart: '1G',

      // 环境变量 - 默认 (开发环境)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // 环境变量 - 生产环境
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // 重启策略
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // 优雅关闭配置
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // 进程信号处理
      shutdown_with_message: false,
    },
  ],
};
