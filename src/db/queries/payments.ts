import { eq, and, sum } from 'drizzle-orm';
import { db } from '../client';
import {
  transcriptionPayments,
  chatUnlocks,
  chatSessions,
  type NewTranscriptionPayment,
  type NewChatUnlock,
  type NewChatSession,
} from '../schema/payments';

/**
 * Record transcription payment
 */
export async function recordTranscriptionPayment(
  userId: number,
  spaceId: number,
  amountUsdc: string,
  transactionHash?: string
) {
  const [payment] = await db.insert(transcriptionPayments)
    .values({
      userId,
      spaceId,
      amountUsdc,
      transactionHash,
      paymentVerified: !!transactionHash,
      verifiedAt: transactionHash ? new Date() : undefined,
    })
    .returning();

  return payment;
}

/**
 * Record chat unlock payment
 */
export async function recordChatUnlock(
  userId: number,
  spaceId: number,
  amountUsdc: string,
  transactionHash?: string
) {
  const [unlock] = await db.insert(chatUnlocks)
    .values({
      userId,
      spaceId,
      amountUsdc,
      transactionHash,
      paymentVerified: !!transactionHash,
      verifiedAt: transactionHash ? new Date() : undefined,
    })
    .returning();

  return unlock;
}

/**
 * Record chat session
 */
export async function recordChatSession(data: NewChatSession) {
  const [session] = await db.insert(chatSessions)
    .values(data)
    .returning();

  return session;
}

/**
 * Check if user has access to Space (paid for transcription)
 */
export async function checkUserHasAccess(userId: number, spaceId: number): Promise<boolean> {
  const payment = await db.query.transcriptionPayments.findFirst({
    where: and(
      eq(transcriptionPayments.userId, userId),
      eq(transcriptionPayments.spaceId, spaceId)
    ),
  });

  return !!payment;
}

/**
 * Check if user has unlocked chat for Space
 */
export async function checkChatUnlocked(userId: number, spaceId: number): Promise<boolean> {
  const unlock = await db.query.chatUnlocks.findFirst({
    where: and(
      eq(chatUnlocks.userId, userId),
      eq(chatUnlocks.spaceId, spaceId)
    ),
  });

  return !!unlock;
}

/**
 * Get user's payment history
 */
export async function getUserPayments(userId: number) {
  const transcriptions = await db.query.transcriptionPayments.findMany({
    where: eq(transcriptionPayments.userId, userId),
    with: {
      space: true,
    },
  });

  const unlocks = await db.query.chatUnlocks.findMany({
    where: eq(chatUnlocks.userId, userId),
    with: {
      space: true,
    },
  });

  const sessions = await db.query.chatSessions.findMany({
    where: eq(chatSessions.userId, userId),
  });

  return { transcriptions, unlocks, sessions };
}

/**
 * Calculate total revenue
 */
export async function calculateRevenue() {
  // This is a simple implementation
  // In production, you'd want to only count verified payments
  const transcriptionRevenue = await db
    .select({ total: sum(transcriptionPayments.amountUsdc) })
    .from(transcriptionPayments)
    .where(eq(transcriptionPayments.paymentVerified, true));

  const unlockRevenue = await db
    .select({ total: sum(chatUnlocks.amountUsdc) })
    .from(chatUnlocks)
    .where(eq(chatUnlocks.paymentVerified, true));

  const chatRevenue = await db
    .select({ total: sum(chatSessions.amountUsdc) })
    .from(chatSessions);

  return {
    transcriptions: parseFloat(transcriptionRevenue[0]?.total || '0'),
    unlocks: parseFloat(unlockRevenue[0]?.total || '0'),
    chats: parseFloat(chatRevenue[0]?.total || '0'),
  };
}
