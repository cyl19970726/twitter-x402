/**
 * Integration Test: Chat Workflow
 *
 * Tests the complete chat flow:
 * 1. Chat unlock → Chat query → Response
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { getOrCreateSpace } from '../../src/db/queries/spaces';
import { getOrCreateUser } from '../../src/db/queries/users';
import { recordChatUnlock, recordChatQuery, checkAccess } from '../../src/services/paymentService';
import { validateQuestion } from '../../src/services/chatService';
import { db } from '../../src/db/client';
import { spaces } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Chat Workflow', () => {
  const testSpaceId = 'CHAT_TEST_' + Date.now();
  const testWallet = '0xCHATWALLET456';
  let userId: number;
  let spaceId: number;

  beforeAll(async () => {
    // Setup test data
    const user = await getOrCreateUser(testWallet);
    userId = user.id;

    const space = await getOrCreateSpace(
      testSpaceId,
      `https://twitter.com/i/spaces/${testSpaceId}`,
      'Chat Test Space'
    );
    spaceId = space.id;

    // Mark space as completed (simulate successful transcription)
    await db
      .update(spaces)
      .set({ status: 'completed' })
      .where(eq(spaces.id, spaceId));
  });

  test('should validate questions correctly', () => {
    // Valid question
    const valid = validateQuestion('What is the main topic discussed in this space?');
    expect(valid.valid).toBe(true);

    // Too short
    const tooShort = validateQuestion('Hello');
    expect(tooShort.valid).toBe(false);
    expect(tooShort.error).toContain('at least 10 characters');

    // Too long
    const tooLong = validateQuestion('a'.repeat(501));
    expect(tooLong.valid).toBe(false);
    expect(tooLong.error).toContain('less than 500 characters');

    // Empty
    const empty = validateQuestion('');
    expect(empty.valid).toBe(false);
    expect(empty.error).toContain('cannot be empty');
  });

  test('should unlock chat successfully', async () => {
    const result = await recordChatUnlock(testWallet, testSpaceId, 'TEST_UNLOCK_TX');

    expect(result.success).toBe(true);
    expect(result.unlockId).toBeDefined();
  });

  test('should verify chat access after unlock', async () => {
    const access = await checkAccess(testWallet, testSpaceId);

    expect(access.hasPurchasedTranscription).toBe(false); // We didn't record transcription payment
    expect(access.hasChatUnlocked).toBe(true);
  });

  test('should record chat query', async () => {
    const question = 'What topics were discussed?';
    const answer = 'The space discussed AI, blockchain, and web3 technologies.';

    const result = await recordChatQuery(
      testWallet,
      [testSpaceId],
      question,
      answer,
      'TEST_CHAT_TX'
    );

    expect(result.success).toBe(true);
  });

  test('should fail chat query for locked space', async () => {
    const newSpaceId = 'LOCKED_SPACE_' + Date.now();
    const newSpace = await getOrCreateSpace(
      newSpaceId,
      `https://twitter.com/i/spaces/${newSpaceId}`,
      'Locked Space'
    );

    // Mark as completed
    await db
      .update(spaces)
      .set({ status: 'completed' })
      .where(eq(spaces.id, newSpace.id));

    // Check access (should be locked)
    const access = await checkAccess(testWallet, newSpaceId);

    expect(access.hasChatUnlocked).toBe(false);

    // Cleanup
    await db.delete(spaces).where(eq(spaces.spaceId, newSpaceId));
  });
});
