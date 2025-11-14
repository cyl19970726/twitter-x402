import { db } from '../src/db/client';
import { getOrCreateUser } from '../src/db/queries/users';

console.log('Testing database connection...\n');

try {
  // Test creating a user
  const testWallet = '0x1234567890abcdef1234567890abcdef12345678';
  const user = await getOrCreateUser(testWallet);

  console.log('✅ Created test user:', {
    id: user.id,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  });

  // Test getting the same user again (should return existing)
  const existingUser = await getOrCreateUser(testWallet);
  console.log('✅ Retrieved existing user:', {
    id: existingUser.id,
    lastSeenAt: existingUser.lastSeenAt,
  });

  console.log('\n✅ Database is working correctly!');
} catch (error) {
  console.error('❌ Database test failed:', error);
  process.exit(1);
}
