import { eq, and, lt, desc, asc } from 'drizzle-orm';
import { db } from '../client';
import { processingQueue, type ProcessingJob, type NewProcessingJob } from '../schema/queue';

/**
 * Add job to queue
 */
export async function queueJob(spaceId: number, priority = 0): Promise<ProcessingJob> {
  const [job] = await db.insert(processingQueue)
    .values({
      spaceId,
      priority,
      status: 'queued',
    })
    .returning();

  return job;
}

/**
 * Get next job to process
 */
export async function getNextJob(): Promise<ProcessingJob | undefined> {
  return await db.query.processingQueue.findFirst({
    where: and(
      eq(processingQueue.status, 'queued'),
      lt(processingQueue.retryCount, processingQueue.maxRetries)
    ),
    orderBy: [desc(processingQueue.priority), asc(processingQueue.queuedAt)],
  });
}

/**
 * Mark job as processing
 */
export async function markJobProcessing(id: number) {
  await db.update(processingQueue)
    .set({
      status: 'processing',
      startedAt: new Date(),
    })
    .where(eq(processingQueue.id, id));
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(id: number) {
  await db.update(processingQueue)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(processingQueue.id, id));
}

/**
 * Mark job as failed and increment retry count
 */
export async function markJobFailed(id: number, errorMessage: string) {
  const job = await db.query.processingQueue.findFirst({
    where: eq(processingQueue.id, id),
  });

  if (!job) return;

  const newRetryCount = job.retryCount + 1;
  const newStatus = newRetryCount >= job.maxRetries ? 'failed' : 'queued';

  await db.update(processingQueue)
    .set({
      status: newStatus,
      retryCount: newRetryCount,
      errorMessage,
      lastErrorAt: new Date(),
    })
    .where(eq(processingQueue.id, id));
}

/**
 * Get job by Space ID
 */
export async function getJobBySpaceId(spaceId: number): Promise<ProcessingJob | undefined> {
  return await db.query.processingQueue.findFirst({
    where: eq(processingQueue.spaceId, spaceId),
    orderBy: desc(processingQueue.queuedAt),
  });
}
