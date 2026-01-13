import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllLogFiles, getLogFilesByServerId, createLogFile, getLogFileById, updateLogFile, deleteLogFile, getServerById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');

    const logFiles = serverId ? getLogFilesByServerId(serverId) : getAllLogFiles();
    return NextResponse.json({ success: true, data: logFiles });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, name, path, tailLines = 100 } = body;

    if (!serverId || !name || !path) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const server = getServerById(serverId);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const logFile = createLogFile({
      id: uuidv4(),
      serverId,
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
