/**
 * Background Transcription Worker
 *
 * Polls the queue for pending jobs and processes them asynchronously.
 * Features:
 * - Automatic retry on failure (max 3 retries)
 * - Status tracking in database
 * - Error logging
 */

import { getNextJob, markJobProcessing, markJobCompleted, markJobFailed } from '../db/queries/queue';
import { getSpaceById, updateSpaceStatus } from '../db/queries/spaces';
import { formatSpaceFromUrl } from '../utils/summarizeSpace';

const POLL_INTERVAL_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;

/**
 * Process a single transcription job
 */
async function processJob(jobId: number): Promise<void> {
  console.log(`\n[Worker] Processing job ${jobId}`);

  // Mark job as processing
  await markJobProcessing(jobId);

  // Get job details
  const job = await getNextJob(); // This will not return the processing job, so we need to get it differently
  // Actually we need to get the space from the job
  // Let me refactor this to use the jobId to get the space

  // For now, let's get the space by querying with the jobId
  // We need to add a query to get job by ID
  // Actually, looking at the queue schema, we have spaceId in the job
  // So let's just query the job again by ID

  // Get the Space associated with this job
  // We need to import getJobById or similar - let me check what we have
  // Actually, we don't have getJobById, but we have the jobId
  // Let's refactor to pass the job object instead

  throw new Error("processJob needs refactoring - job object should be passed in");
}

/**
 * Process a single transcription job (refactored)
 */
async function processTranscriptionJob(spaceId: number, jobId: number): Promise<void> {
  console.log(`\n[Worker] Processing transcription for Space ID ${spaceId} (Job ${jobId})`);

  try {
    // Get Space details
    const space = await getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    // Update Space status to processing
    await updateSpaceStatus(spaceId, 'processing');

    console.log(`[Worker] Transcribing Space: ${space.spaceUrl}`);

    // Run transcription pipeline
    const result = await formatSpaceFromUrl(space.spaceUrl);

    console.log(`[Worker] ✅ Transcription completed for ${space.spaceId}`);

    // Mark job as completed
    await markJobCompleted(jobId);

    // Space status is already updated by formatSpaceFromUrl via saveSpace
    console.log(`[Worker] Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`[Worker] ❌ Job ${jobId} failed:`, error);

    // Mark job as failed (will auto-retry if under max retries)
    await markJobFailed(jobId, (error as Error).message);

    // Update Space status to failed
    await updateSpaceStatus(spaceId, 'failed');

    throw error;
  }
}

/**
 * Main worker loop
 */
export async function startWorker(): Promise<void> {
  console.log('[Worker] Starting transcription worker...');
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`[Worker] Max retries: ${MAX_RETRIES}\n`);

  while (true) {
    try {
      // Get next job from queue
      const job = await getNextJob();

      if (job) {
        console.log(`[Worker] Found job ${job.id} for Space ${job.spaceId}`);

        try {
          await processTranscriptionJob(job.spaceId, job.id);
        } catch (error) {
          // Error already logged and handled in processTranscriptionJob
          console.error(`[Worker] Job ${job.id} processing failed`);
        }
      } else {
        // No jobs in queue
        console.log(`[Worker] No pending jobs, waiting ${POLL_INTERVAL_MS / 1000}s...`);
      }

    } catch (error) {
      console.error('[Worker] Error in worker loop:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Graceful shutdown handler
 */
export function setupShutdownHandlers(): void {
  const shutdown = () => {
    console.log('\n[Worker] Received shutdown signal, exiting gracefully...');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
