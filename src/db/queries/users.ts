import { eq } from 'drizzle-orm';
import { db } from '../client';
import { users, type User, type NewUser } from '../schema/users';

/**
 * Get or create user by wallet address
 */
export async function getOrCreateUser(walletAddress: string): Promise<User> {
  // Try to find existing user
  const existing = await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });

  if (existing) {
    // Update last seen
    await db.update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, existing.id));

    return existing;
  }

  // Create new user
  const [newUser] = await db.insert(users)
    .values({ walletAddress })
    .returning();

  return newUser;
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | undefined> {
  return await db.query.users.findFirst({
    where: eq(users.walletAddress, walletAddress),
  });
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | undefined> {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
  });
}
