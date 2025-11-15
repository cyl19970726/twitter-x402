import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spaces, transcriptionRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { extractSpaceId, isValidSpaceUrl } from '@/lib/utils/space';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spaceUrl } = body;

    // 验证 URL
    if (!spaceUrl || !isValidSpaceUrl(spaceUrl)) {
      return NextResponse.json(
        { error: 'Invalid Space URL', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    // 提取 Space ID
    const spaceId = extractSpaceId(spaceUrl);
    if (!spaceId) {
      return NextResponse.json(
        { error: 'Cannot extract Space ID from URL', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    // 检查是否已存在
    const [existingSpace] = await db
      .select()
      .from(spaces)
      .where(eq(spaces.spaceId, spaceId))
      .limit(1);

    if (existingSpace) {
      return NextResponse.json({
        success: true,
        spaceId: existingSpace.spaceId,
        status: existingSpace.status,
        message:
          existingSpace.status === 'completed'
            ? '该 Space 已完成转录，可以直接查看'
            : existingSpace.status === 'processing'
            ? '该 Space 正在处理中，请稍候'
            : '该 Space 已在队列中，预计 3-5 分钟完成',
      });
    }

    // 获取支付信息（x402 middleware 会注入）
    const walletAddress = request.headers.get('x-wallet-address') || 'unknown';
    const paymentProof = request.headers.get('x-payment-proof') || '';

    // 创建转录任务
    const [newSpace] = await db
      .insert(spaces)
      .values({
        spaceId,
        spaceUrl,
        title: `Space ${spaceId}`,
        status: 'pending',
      })
      .returning();

    // 记录支付
    await db.insert(transcriptionRequests).values({
      spaceId,
      walletAddress,
      amountUsdc: '0.2',
      transactionHash: paymentProof,
    });

    return NextResponse.json({
      success: true,
      spaceId: newSpace.spaceId,
      status: 'pending',
      message: '转录任务已创建，预计 3-5 分钟完成',
    });
  } catch (error) {
    console.error('Failed to create transcription task:', error);
    return NextResponse.json(
      {
        error: 'Failed to create transcription task',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
