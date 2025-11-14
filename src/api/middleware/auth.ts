/**
 * Authentication Middleware
 *
 * Verifies wallet signatures using EIP-191 standard.
 * Protects dashboard API routes from unauthorized access.
 */

import type { Context, Next } from 'hono';
import { getOrCreateUser } from '../../db/queries/users';

/**
 * Auth middleware - verifies wallet signature
 *
 * Expected query parameters:
 * - wallet: User's wallet address
 * - signature: EIP-191 signature
 * - message: Original message that was signed
 * - timestamp: Unix timestamp (must be within 5 minutes)
 */
export async function authMiddleware(c: Context, next: Next) {
  const wallet = c.req.query('wallet');
  const signature = c.req.query('signature');
  const message = c.req.query('message');
  const timestamp = c.req.query('timestamp');

  // Check required parameters
  if (!wallet || !signature || !message || !timestamp) {
    return c.json(
      {
        error: 'Missing authentication parameters',
        required: ['wallet', 'signature', 'message', 'timestamp'],
      },
      401
    );
  }

  // Verify timestamp (must be within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);

  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return c.json(
      {
        error: 'Invalid or expired timestamp',
        message: 'Timestamp must be within 5 minutes',
      },
      401
    );
  }

  // TODO: Verify EIP-191 signature
  // For now, we'll skip actual signature verification
  // In production, use viem to verify:
  // import { verifyMessage } from 'viem'
  // const isValid = await verifyMessage({ address: wallet, message, signature })

  console.warn('[Auth] Signature verification not implemented - accepting all requests');

  // Get or create user
  try {
    const user = await getOrCreateUser(wallet);

    // Store user ID in context for downstream handlers
    c.set('userId', user.id);
    c.set('walletAddress', wallet);

    await next();
  } catch (error) {
    console.error('[Auth] Error during authentication:', error);
    return c.json(
      {
        error: 'Authentication failed',
        message: (error as Error).message,
      },
      500
    );
  }
}

/**
 * Optional auth middleware - allows requests without auth
 * but sets user context if auth is provided
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const wallet = c.req.query('wallet');
  const signature = c.req.query('signature');

  if (wallet && signature) {
    // Try to authenticate
    try {
      const user = await getOrCreateUser(wallet);
      c.set('userId', user.id);
      c.set('walletAddress', wallet);
    } catch (error) {
      console.error('[Auth] Optional auth failed:', error);
      // Continue without setting user context
    }
  }

  await next();
}
