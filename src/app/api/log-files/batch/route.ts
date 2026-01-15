import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createLogFiles, getServerById, getExistingLogFilePaths } from '@/lib/db';

// POST /api/log-files/batch
// 批量创建日志文件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, files, tailLines = 100, groupId = null } = body;

    // 验证必填字段
    if (!serverId) {
      return NextResponse.json(
        { success: false, error: '缺少 serverId 参数' },
        { status: 400 }
      );
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少文件列表或文件列表为空' },
        { status: 400 }
      );
    }

    // 验证服务器存在
    const server = getServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { success: false, error: '服务器不存在' },
        { status: 404 }
      );
    }

    // 验证每个文件的必填字段
    for (const file of files) {
      if (!file.path) {
        return NextResponse.json(
          { success: false, error: '每个文件必须包含 path 字段' },
          { status: 400 }
        );
      }
    }

    // 获取已存在的日志文件路径
    const allPaths = files.map((f: { path: string }) => f.path);
    const existingPaths = getExistingLogFilePaths(serverId, allPaths);

    // 过滤掉已存在的文件
    const newFiles = files.filter((file: { path: string }) => !existingPaths.has(file.path));
    const skippedCount = files.length - newFiles.length;

    // 如果所有文件都已存在
    if (newFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '所有选中的文件都已添加过',
          skippedCount
        },
        { status: 409 }
      );
    }

    // 构建日志文件数据
    const logFilesToCreate = newFiles.map((file: { name?: string; path: string }) => ({
      id: uuidv4(),
      serverId,
      groupId,
      name: file.name || file.path.split('/').pop() || file.path, // 默认使用文件名
      path: file.path,
      tailLines,
    }));

    // 批量创建
    const createdLogFiles = createLogFiles(logFilesToCreate);

    // 构建返回消息
    let message = `成功添加 ${createdLogFiles.length} 个日志文件`;
    if (skippedCount > 0) {
      message += `，跳过 ${skippedCount} 个已存在的文件`;
    }

    return NextResponse.json(
      {
        success: true,
        data: createdLogFiles,
        message,
        skippedCount,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '批量创建失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
