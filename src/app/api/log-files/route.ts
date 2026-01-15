import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllLogFiles, getLogFilesByServerId, createLogFile, getLogFileById, updateLogFile, deleteLogFile, getServerById, getLogFileByServerAndPath, getLogFilesByGroupId, getUngroupedLogFiles } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const groupId = searchParams.get('groupId');
    const ungrouped = searchParams.get('ungrouped');

    let logFiles;
    if (groupId) {
      // 获取指定分组的日志文件
      logFiles = getLogFilesByGroupId(groupId);
    } else if (ungrouped && serverId) {
      // 获取指定服务器的未分组日志文件
      logFiles = getUngroupedLogFiles(serverId);
    } else if (serverId) {
      // 获取指定服务器的所有日志文件
      logFiles = getLogFilesByServerId(serverId);
    } else {
      // 获取所有日志文件
      logFiles = getAllLogFiles();
    }

    return NextResponse.json({ success: true, data: logFiles });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, name, path, tailLines = 100, groupId = null } = body;

    if (!serverId || !name || !path) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const server = getServerById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    // 检查该服务器是否已存在相同路径的日志文件
    const existingLogFile = getLogFileByServerAndPath(serverId, path);
    if (existingLogFile) {
      return NextResponse.json(
        { success: false, error: `日志文件已存在: ${path}` },
        { status: 409 }
      );
    }

    const logFile = createLogFile({
      id: uuidv4(),
      serverId,
      groupId,
      name,
      path,
      tailLines,
    });

    return NextResponse.json({ success: true, data: logFile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Log file ID is required' }, { status: 400 });
    }

    const existing = getLogFileById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Log file not found' }, { status: 404 });
    }

    const logFile = updateLogFile(id, updates);
    return NextResponse.json({ success: true, data: logFile });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Log file ID is required' }, { status: 400 });
    }

    const deleted = deleteLogFile(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Log file not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
