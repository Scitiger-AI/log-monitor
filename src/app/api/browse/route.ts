import { NextRequest, NextResponse } from 'next/server';
import { getServerById } from '@/lib/db';
import { FileInfo } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

// 展开 ~ 路径（本地使用）
function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return p.replace('~', homedir());
  }
  if (p === '~') {
    return homedir();
  }
  return p;
}

// GET /api/browse?serverId=xxx&path=/var/log
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const dirPath = searchParams.get('path') || '/';

    if (!serverId) {
      return NextResponse.json(
        { success: false, error: '缺少 serverId 参数' },
        { status: 400 }
      );
    }

    const server = getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: '服务器不存在' },
        { status: 404 }
      );
    }

    let files: FileInfo[];

    if (server.isLocal) {
      // 本地服务器：使用 Node.js fs 模块
      files = await listLocalDirectory(dirPath);
    } else {
      // 远程服务器：动态导入 SSH 模块避免 Turbopack ESM 问题
      const { sshPool } = await import('@/lib/ssh-pool');
      files = await sshPool.listDirectory(server, dirPath);
    }

    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    const message = error instanceof Error ? error.message : '浏览目录失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// 列出本地目录内容
async function listLocalDirectory(dirPath: string): Promise<FileInfo[]> {
  const expandedPath = expandPath(dirPath);
  const entries = await fs.readdir(expandedPath, { withFileTypes: true });

  const files: FileInfo[] = [];

  for (const entry of entries) {
    // 跳过隐藏文件（以 . 开头）
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(expandedPath, entry.name);

    try {
      const stats = await fs.stat(fullPath);

      files.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString().replace('T', ' ').slice(0, 16),
      });
    } catch {
      // 跳过无法访问的文件
      continue;
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
