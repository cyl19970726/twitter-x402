import { eq, and, desc, like, or } from 'drizzle-orm';
import { db } from '../client';
import { spaces, type Space, type NewSpace } from '../schema/spaces';
import { transcriptionPayments } from '../schema/payments';

/**
 * Create or get existing Space
 */
export async function getOrCreateSpace(spaceId: string, spaceUrl: string, title: string): Promise<Space> {
  const existing = await db.query.spaces.findFirst({
    where: eq(spaces.spaceId, spaceId),
  });

  if (existing) {
    return existing;
  }

  const [newSpace] = await db.insert(spaces)
    .values({
      spaceId,
      spaceUrl,
      title,
      status: 'pending',
    })
    .returning();

  return newSpace;
}

/**
 * Get Space by spaceId
 */
export async function getSpaceBySpaceId(spaceId: string): Promise<Space | undefined> {
  return await db.query.spaces.findFirst({
    where: eq(spaces.spaceId, spaceId),
  });
}

/**
 * Get Space by database ID
 */
export async function getSpaceById(id: number): Promise<Space | undefined> {
  return await db.query.spaces.findFirst({
    where: eq(spaces.id, id),
  });
}

/**
 * Update Space status
 */
export async function updateSpaceStatus(
  id: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  additionalFields?: Partial<Space>
) {
  await db.update(spaces)
    .set({ status, ...additionalFields })
    .where(eq(spaces.id, id));
}

/**
 * Save Space processing result
 */
export async function saveSpaceResult(
  id: number,
  data: {
    audioFilePath?: string;
    transcriptFilePath?: string;
    audioDurationSeconds?: number;
    audioSizeMb?: number;
    transcriptLength: number;
    participants: string;
    speakerProfiles: string;
  }
) {
  await db.update(spaces)
    .set({
      ...data,
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(spaces.id, id));
}

/**
 * Get user's Spaces (Spaces they paid for)
 */
export async function getUserSpaces(userId: number, limit = 50, offset = 0): Promise<Space[]> {
  const result = await db
    .select({ space: spaces })
    .from(spaces)
    .innerJoin(transcriptionPayments, eq(transcriptionPayments.spaceId, spaces.id))
    .where(
      and(
        eq(transcriptionPayments.userId, userId),
        eq(spaces.status, 'completed')
      )
    )
    .orderBy(desc(transcriptionPayments.paidAt))
    .limit(limit)
    .offset(offset);

  return result.map(r => r.space);
}

/**
 * Search Spaces (within user's accessible Spaces)
 */
export async function searchUserSpaces(userId: number, query: string): Promise<Space[]> {
  const result = await db
    .select({ space: spaces })
    .from(spaces)
    .innerJoin(transcriptionPayments, eq(transcriptionPayments.spaceId, spaces.id))
    .where(
      and(
        eq(transcriptionPayments.userId, userId),
        eq(spaces.status, 'completed'),
        or(
          like(spaces.spaceId, `%${query}%`),
          like(spaces.title, `%${query}%`),
          like(spaces.participants, `%${query}%`)
        )
      )
    )
    .orderBy(desc(transcriptionPayments.paidAt));

  return result.map(r => r.space);
}

/**
 * Get popular Spaces
 */
export async function getPopularSpaces(limit = 10): Promise<Space[]> {
  return await db.query.spaces.findMany({
    where: eq(spaces.status, 'completed'),
    orderBy: desc(spaces.transcriptionCount),
    limit,
  });
}

/**
 * Increment transcription count
 */
export async function incrementTranscriptionCount(id: number) {
  await db.update(spaces)
    .set({ transcriptionCount: (spaces.transcriptionCount as any) + 1 })
    .where(eq(spaces.id, id));
}

/**
 * Increment chat unlock count
 */
export async function incrementChatUnlockCount(id: number) {
  await db.update(spaces)
    .set({ chatUnlockCount: (spaces.chatUnlockCount as any) + 1 })
    .where(eq(spaces.id, id));
}
