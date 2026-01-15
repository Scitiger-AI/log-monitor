import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllLogGroups,
  getLogGroupsByServerId,
  getLogGroupById,
  createLogGroup,
  updateLogGroup,
  deleteLogGroup,
  updateLogGroupsOrder,
} from '@/lib/db';

// GET /api/log-groups - 获取所有分组或按服务器筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');

    const groups = serverId
      ? getLogGroupsByServerId(serverId)
      : getAllLogGroups();

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error('Failed to fetch log groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch log groups' },
      { status: 500 }
    );
  }
}

// POST /api/log-groups - 创建新分组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, name, sortOrder = 0 } = body;

    if (!serverId || !name) {
      return NextResponse.json(
        { success: false, error: 'serverId and name are required' },
        { status: 400 }
      );
    }

    const group = createLogGroup({
      id: uuidv4(),
      serverId,
      name,
      sortOrder,
    });

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error('Failed to create log group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create log group' },
      { status: 500 }
    );
  }
}

// PUT /api/log-groups - 更新分组
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = getLogGroupById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Log group not found' },
        { status: 404 }
      );
    }

    const group = updateLogGroup(id, updates);
    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    console.error('Failed to update log group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update log group' },
      { status: 500 }
    );
  }
}

// DELETE /api/log-groups?id={id} - 删除分组
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const success = deleteLogGroup(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Log group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete log group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete log group' },
      { status: 500 }
    );
  }
}

// PATCH /api/log-groups - 批量更新分组排序
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { groups } = body;

    if (!Array.isArray(groups)) {
      return NextResponse.json(
        { success: false, error: 'groups array is required' },
        { status: 400 }
      );
    }

    updateLogGroupsOrder(groups);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update log groups order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update log groups order' },
      { status: 500 }
    );
  }
}
