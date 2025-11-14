/**
 * Payment Service
 *
 * Handles all payment-related operations:
 * - Recording payments (transcription, chat unlock, chat queries)
 * - Verifying on-chain payments
 * - Access control checks
 */

import {
  recordTranscriptionPayment as dbRecordTranscriptionPayment,
  recordChatUnlock as dbRecordChatUnlock,
  recordChatSession as dbRecordChatSession,
  checkUserHasAccess as dbCheckUserHasAccess,
  checkChatUnlocked as dbCheckChatUnlocked,
} from '../db/queries/payments';
import { getOrCreateUser } from '../db/queries/users';
import { getSpaceBySpaceId } from '../db/queries/spaces';
import { incrementTranscriptionCount, incrementChatUnlockCount } from '../db/queries/spaces';

/**
 * Calculate chat query price based on number of Spaces
 * Base: 0.9 USDC + 0.1 USDC per additional Space
 */
export function calculateChatPrice(spaceCount: number): string {
  const basePrice = 0.9;
  const perSpacePrice = 0.1;
  const totalPrice = basePrice + (Math.max(0, spaceCount - 1) * perSpacePrice);
  return totalPrice.toFixed(2);
}

/**
 * Record transcription payment (0.2 USDC)
 */
export async function recordTranscriptionPayment(
  walletAddress: string,
  spaceId: string,
  transactionHash?: string
): Promise<{ success: boolean; paymentId?: number; error?: string }> {
  try {
    // Get or create user
    const user = await getOrCreateUser(walletAddress);

    // Get space
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return { success: false, error: 'Space not found' };
    }

    // Record payment
    const payment = await dbRecordTranscriptionPayment(
      user.id,
      space.id,
      '0.2',
      transactionHash
    );

    // Increment transcription count
    await incrementTranscriptionCount(space.id);

    return { success: true, paymentId: payment.id };
  } catch (error) {
    console.error('Failed to record transcription payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Record chat unlock payment (0.5 USDC)
 */
export async function recordChatUnlock(
  walletAddress: string,
  spaceId: string,
  transactionHash?: string
): Promise<{ success: boolean; unlockId?: number; error?: string }> {
  try {
    // Get or create user
    const user = await getOrCreateUser(walletAddress);

    // Get space
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return { success: false, error: 'Space not found' };
    }

    // Check if user has access to transcript first
    const hasAccess = await dbCheckUserHasAccess(user.id, space.id);
    if (!hasAccess) {
      return { success: false, error: 'User must purchase transcription first' };
    }

    // Record unlock
    const unlock = await dbRecordChatUnlock(
      user.id,
      space.id,
      '0.5',
      transactionHash
    );

    // Increment chat unlock count
    await incrementChatUnlockCount(space.id);

    return { success: true, unlockId: unlock.id };
  } catch (error) {
    console.error('Failed to record chat unlock:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Record chat query session
 */
export async function recordChatQuery(
  walletAddress: string,
  spaceIds: string[],
  question: string,
  answer: string,
  transactionHash?: string
): Promise<{ success: boolean; sessionId?: number; error?: string }> {
  try {
    // Get or create user
    const user = await getOrCreateUser(walletAddress);

    // Verify user has unlocked chat for all spaces
    for (const spaceId of spaceIds) {
      const space = await getSpaceBySpaceId(spaceId);
      if (!space) {
        return { success: false, error: `Space ${spaceId} not found` };
      }

      const hasUnlocked = await dbCheckChatUnlocked(user.id, space.id);
      if (!hasUnlocked) {
        return { success: false, error: `Chat not unlocked for Space ${spaceId}` };
      }
    }

    // Calculate price
    const amountUsdc = calculateChatPrice(spaceIds.length);

    // Generate session ID
    const sessionId = `session_${Date.now()}_${user.id}`;

    // Record session
    const session = await dbRecordChatSession({
      userId: user.id,
      sessionId,
      spaceIds: spaceIds.join(','),
      numSpaces: spaceIds.length,
      question,
      answer,
      amountUsdc,
      transactionHash,
    });

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error('Failed to record chat query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify on-chain payment
 * TODO: Implement actual blockchain verification
 * This is a placeholder - in production, verify the transaction on-chain
 */
export async function verifyPayment(
  transactionHash: string
): Promise<{ verified: boolean; amount?: string; error?: string }> {
  // TODO: Implement using viem to verify transaction on-chain
  // 1. Connect to blockchain
  // 2. Get transaction details
  // 3. Verify recipient, amount, and token
  // 4. Return verification result

  console.warn('Payment verification not implemented - accepting all transactions');
  return { verified: true, amount: '0' };
}

/**
 * Check if user has access to a Space (paid for transcription)
 */
export async function checkAccess(
  walletAddress: string,
  spaceId: string
): Promise<boolean> {
  try {
    // Get user
    const user = await getOrCreateUser(walletAddress);

    // Get space
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return false;
    }

    // Check access
    return await dbCheckUserHasAccess(user.id, space.id);
  } catch (error) {
    console.error('Failed to check access:', error);
    return false;
  }
}

/**
 * Check if user has unlocked chat for a Space
 */
export async function checkChatAccess(
  walletAddress: string,
  spaceId: string
): Promise<boolean> {
  try {
    // Get user
    const user = await getOrCreateUser(walletAddress);

    // Get space
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return false;
    }

    // Check if chat is unlocked
    return await dbCheckChatUnlocked(user.id, space.id);
  } catch (error) {
    console.error('Failed to check chat access:', error);
    return false;
  }
}
