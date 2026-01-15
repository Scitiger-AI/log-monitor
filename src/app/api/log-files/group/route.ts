import { NextRequest, NextResponse } from 'next/server';
import { updateLogFileGroup, updateLogFilesGroup, getLogFileById } from '@/lib/db';

// PUT /api/log-files/group - 更新单个或多个日志文件的分组
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { logFileId, logFileIds, groupId } = body;

    // 批量更新
    if (Array.isArray(logFileIds)) {
      updateLogFilesGroup(logFileIds, groupId ?? null);
      return NextResponse.json({ success: true });
    }

    // 单个更新
    if (logFileId) {
      const existing = getLogFileById(logFileId);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Log file not found' },
          { status: 404 }
        );
      }

      const logFile = updateLogFileGroup(logFileId, groupId ?? null);
      return NextResponse.json({ success: true, data: logFile });
    }

    return NextResponse.json(
      { success: false, error: 'logFileId or logFileIds is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update log file group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update log file group' },
      { status: 500 }
    );
  }
}
