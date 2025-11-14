/**
 * User API Routes
 *
 * User profile, stats, and payment history endpoints.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getUserPayments, calculateRevenue } from '../../db/queries/payments';
import { getUserSpaces } from '../../db/queries/spaces';

const userRouter = new Hono();

// Apply auth middleware to all routes
userRouter.use('/*', authMiddleware);

/**
 * GET /api/user/stats
 * Get user statistics
 */
userRouter.get('/stats', async (c: any) => {
  const userId = c.get('userId') as number;
  const walletAddress = c.get('walletAddress') as string;

  try {
    // Get user's spaces
    const spaces = await getUserSpaces(userId, 1000, 0);

    // Get payment history
    const payments = await getUserPayments(userId);

    // Calculate totals
    const totalSpent =
      payments.transcriptions.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0) +
      payments.unlocks.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0) +
      payments.sessions.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0);

    return c.json({
      wallet: walletAddress,
      stats: {
        spacesOwned: spaces.length,
        transcriptionsPurchased: payments.transcriptions.length,
        chatsUnlocked: payments.unlocks.length,
        chatQueries: payments.sessions.length,
        totalSpentUSDC: parseFloat(totalSpent.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching user stats:', error);
    return c.json(
      {
        error: 'Failed to fetch user stats',
        message: (error as Error).message,
      },
      500
    );
  }
});

/**
 * GET /api/user/payments
 * Get user payment history
 */
userRouter.get('/payments', async (c: any) => {
  const userId = c.get('userId') as number;

  try {
    const payments = await getUserPayments(userId);

    return c.json({
      transcriptions: payments.transcriptions.map(p => ({
        id: p.id,
        spaceId: (p.space as any)?.spaceId,
        spaceTitle: (p.space as any)?.title,
        amount: p.amountUsdc,
        transactionHash: p.transactionHash,
        paidAt: (p as any).paidAt || p.verifiedAt,
        verified: p.paymentVerified,
      })),
      unlocks: payments.unlocks.map(p => ({
        id: p.id,
        spaceId: (p.space as any)?.spaceId,
        spaceTitle: (p.space as any)?.title,
        amount: p.amountUsdc,
        transactionHash: p.transactionHash,
        paidAt: (p as any).paidAt || p.unlockedAt,
        verified: p.paymentVerified,
      })),
      sessions: payments.sessions.map(p => ({
        id: p.id,
        sessionId: p.sessionId,
        spaceIds: p.spaceIds.split(','),
        question: p.question,
        amount: p.amountUsdc,
        numSpaces: p.numSpaces,
        queriedAt: p.queriedAt,
      })),
    });
  } catch (error) {
    console.error('[API] Error fetching payment history:', error);
    return c.json(
      {
        error: 'Failed to fetch payment history',
        message: (error as Error).message,
      },
      500
    );
  }
});

export default userRouter;
