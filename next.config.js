/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 Next.js 内置服务器，使用自定义服务器
  output: 'standalone',
  // 将 ssh2 及其依赖标记为外部包，避免 Turbopack 打包问题
  serverExternalPackages: ['ssh2', 'cpu-features'],
}

module.exports = nextConfig
