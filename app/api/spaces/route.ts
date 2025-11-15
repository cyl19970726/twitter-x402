import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { spaces } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 查询已完成的 Spaces
    const completedSpaces = await db
      .select({
        spaceId: spaces.spaceId,
        title: spaces.title,
        creator: spaces.creator,
        participants: spaces.participants,
        duration: spaces.audioDurationSeconds,
        completedAt: spaces.completedAt,
      })
      .from(spaces)
      .where(eq(spaces.status, 'completed'))
      .orderBy(desc(spaces.completedAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const [{ count }] = await db
      .select({ count: spaces.id })
      .from(spaces)
      .where(eq(spaces.status, 'completed'));

    return NextResponse.json({
      spaces: completedSpaces.map(space => ({
        ...space,
        participants: space.participants || [],
        completedAt: space.completedAt?.toISOString() || null,
      })),
      total: count || 0,
    });
  } catch (error) {
    console.error('Failed to fetch spaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaces', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }
}
