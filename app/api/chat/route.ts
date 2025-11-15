import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spaces, chatPayments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Agent } from '@openai/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spaceId, question } = body;

    // 验证参数
    if (!spaceId || !question) {
      return NextResponse.json(
        {
          error: 'Missing required fields: spaceId, question',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // 查询 Space
    const [space] = await db
      .select()
      .from(spaces)
      .where(eq(spaces.spaceId, spaceId))
      .limit(1);

    if (!space) {
      return NextResponse.json(
        { error: 'Space not found', code: 'SPACE_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (space.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Space transcription is not ready yet',
          code: 'SPACE_NOT_READY',
          status: space.status,
        },
        { status: 409 }
      );
    }

    // 读取转录内容
    if (!space.transcriptFilePath) {
      return NextResponse.json(
        { error: 'Transcript file not found', code: 'TRANSCRIPT_MISSING' },
        { status: 500 }
      );
    }

    const transcriptPath = join(process.cwd(), space.transcriptFilePath);
    const transcript = await readFile(transcriptPath, 'utf-8');

    // 创建 Agent 实例
    const agent = new Agent({
      name: 'TwitterSpaceAnalyst',
      model: 'gpt-4o',
      instructions: `你是一个 Twitter Space 转录分析助手。
你可以访问以下 Twitter Space 的完整转录内容：

Space 标题: ${space.title}
创建者: ${space.creator || '未知'}

转录内容:
${transcript}

请根据上述转录内容，用中文回答用户的问题。如果问题与转录内容无关，请礼貌地说明。`,
    });

    // 使用 Agent 进行对话
    const response = await agent.chat([
      {
        role: 'user',
        content: question,
      },
    ]);

    const answer = response.content || '抱歉，无法生成回答';

    // 获取支付信息
    const walletAddress = request.headers.get('x-wallet-address') || 'unknown';
    const paymentProof = request.headers.get('x-payment-proof') || '';

    // 记录聊天历史
    await db.insert(chatPayments).values({
      spaceId: space.id,
      walletAddress,
      question,
      answer,
      amountUsdc: '0.5',
      transactionHash: paymentProof,
    });

    return NextResponse.json({
      success: true,
      answer,
      spaceTitle: space.title,
    });
  } catch (error: any) {
    console.error('Failed to generate AI response:', error);

    // Agent SDK 错误
    if (error?.message) {
      return NextResponse.json(
        {
          error: 'Agent SDK error',
          code: 'AI_ERROR',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate AI response', code: 'AI_ERROR' },
      { status: 500 }
    );
  }
}
