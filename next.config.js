/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 Next.js 内置服务器，使用自定义服务器
  output: 'standalone',
}

module.exports = nextConfig
