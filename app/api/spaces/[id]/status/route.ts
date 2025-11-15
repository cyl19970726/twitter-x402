import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;

    // 查询 Space 状态
    const [space] = await db
      .select({
        spaceId: spaces.spaceId,
        status: spaces.status,
        processingStartedAt: spaces.processingStartedAt,
        completedAt: spaces.completedAt,
      })
      .from(spaces)
      .where(eq(spaces.spaceId, id))
      .limit(1);

    if (!space) {
      return NextResponse.json(
        { error: 'Space not found', code: 'SPACE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 根据状态返回不同消息
    let message = '';
    let progress = undefined;

    switch (space.status) {
      case 'pending':
        message = '转录任务在队列中，预计 3-5 分钟开始处理';
        break;
      case 'processing':
        message = '正在处理转录任务...';
        // 简单的进度估算（实际应该从 Worker 获取）
        if (space.processingStartedAt) {
          const elapsed = Date.now() - space.processingStartedAt.getTime();
          const estimatedTotal = 5 * 60 * 1000; // 假设总共 5 分钟
          progress = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 95);
        }
        break;
      case 'completed':
        message = '转录已完成，可以查看完整内容';
        break;
      case 'failed':
        message = '转录失败，请稍后重试';
        break;
      default:
        message = '未知状态';
    }

    return NextResponse.json({
      spaceId: space.spaceId,
      status: space.status,
      progress,
      message,
    });
  } catch (error) {
    console.error('Failed to fetch space status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }
}
