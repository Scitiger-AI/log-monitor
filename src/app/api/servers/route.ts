import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllServers, createServer, getServerById, updateServer, deleteServer } from '@/lib/db';

export async function GET() {
  try {
    const servers = getAllServers();
    return NextResponse.json({ success: true, data: servers });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host, port = 22, username, privateKeyPath = '', isLocal = false } = body;

    if (!name || !username) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (!isLocal && !host) {
      return NextResponse.json({ success: false, error: 'Host is required for remote servers' }, { status: 400 });
    }

    const server = createServer({
      id: uuidv4(),
      name,
      host: isLocal ? 'localhost' : host,
      port,
      username,
      privateKeyPath,
      isLocal,
    });

    return NextResponse.json({ success: true, data: server }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Server ID is required' }, { status: 400 });
    }

    const existing = getServerById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const server = updateServer(id, updates);
    return NextResponse.json({ success: true, data: server });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Server ID is required' }, { status: 400 });
    }

    const deleted = deleteServer(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
