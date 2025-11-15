import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;

    // 查询 Space
    const [space] = await db
      .select()
      .from(spaces)
      .where(eq(spaces.spaceId, id))
      .limit(1);

    if (!space) {
      return NextResponse.json(
        { error: 'Space not found', code: 'SPACE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 基础响应
    const response: any = {
      space: {
        spaceId: space.spaceId,
        title: space.title,
        creator: space.creator,
        participants: space.participants || [],
        duration: space.audioDurationSeconds || 0,
        status: space.status,
        completedAt: space.completedAt?.toISOString() || null,
      },
    };

    // 如果已完成，读取转录文件
    if (space.status === 'completed' && space.transcriptFilePath) {
      try {
        const transcriptPath = join(process.cwd(), space.transcriptFilePath);
        const transcript = await readFile(transcriptPath, 'utf-8');
        response.transcript = transcript;
      } catch (error) {
        console.error('Failed to read transcript file:', error);
        // 不阻止响应，只是没有 transcript 字段
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch space:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }
}
