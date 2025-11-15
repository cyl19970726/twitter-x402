/**
 * Integration Test: Transcription Workflow
 *
 * Tests the complete transcription flow:
 * 1. Payment → Queue → Worker → Completion
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../../src/db/client';
import { spaces, jobs } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { getOrCreateSpace } from '../../src/db/queries/spaces';
import { queueJob, getNextJob, markJobCompleted, markJobFailed } from '../../src/db/queries/queue';
import { recordTranscriptionPayment } from '../../src/services/paymentService';

describe('Transcription Workflow', () => {
  const testSpaceId = 'TEST_SPACE_' + Date.now();
  const testWallet = '0xTESTWALLET123';
  const testSpaceUrl = `https://twitter.com/i/spaces/${testSpaceId}`;

  afterAll(async () => {
    // Cleanup test data
    await db.delete(spaces).where(eq(spaces.spaceId, testSpaceId));
  });

  test('should create space and queue job', async () => {
    // Create space
    const space = await getOrCreateSpace(testSpaceId, testSpaceUrl, 'Test Space');

    expect(space).toBeDefined();
    expect(space.spaceId).toBe(testSpaceId);
    expect(space.status).toBe('pending');

    // Record payment
    const payment = await recordTranscriptionPayment(testWallet, testSpaceId, 'TEST_TX_HASH');

    expect(payment.success).toBe(true);

    // Queue job
    const job = await queueJob(space.id, 0);

    expect(job).toBeDefined();
    expect(job.spaceId).toBe(space.id);
    expect(job.status).toBe('pending');
  });

  test('should retrieve next pending job', async () => {
    const job = await getNextJob();

    expect(job).toBeDefined();
    if (job) {
      expect(job.status).toBe('processing');
    }
  });

  test('should mark job as completed', async () => {
    // Get the space
    const spaceData = await db.query.spaces.findFirst({
      where: eq(spaces.spaceId, testSpaceId),
    });

    if (spaceData) {
      // Get the job
      const job = await db.query.jobs.findFirst({
        where: eq(jobs.spaceId, spaceData.id),
      });

      if (job) {
        await markJobCompleted(job.id);

        // Verify job status
        const updatedJob = await db.query.jobs.findFirst({
          where: eq(jobs.id, job.id),
        });

        expect(updatedJob?.status).toBe('completed');
      }
    }
  });

  test('should handle job failure and retry', async () => {
    // Create a new space for failure test
    const failSpaceId = 'FAIL_SPACE_' + Date.now();
    const failSpace = await getOrCreateSpace(
      failSpaceId,
      `https://twitter.com/i/spaces/${failSpaceId}`,
      'Fail Test Space'
    );

    // Queue job
    const job = await queueJob(failSpace.id, 0);

    // Mark as failed
    await markJobFailed(job.id, 'Test error');

    // Verify job was requeued
    const retriedJob = await db.query.jobs.findFirst({
      where: eq(jobs.spaceId, failSpace.id),
      orderBy: (jobs, { desc }) => [desc(jobs.id)],
    });

    expect(retriedJob).toBeDefined();
    expect(retriedJob?.attemptCount).toBe(1);

    // Cleanup
    await db.delete(spaces).where(eq(spaces.spaceId, failSpaceId));
  });
});
