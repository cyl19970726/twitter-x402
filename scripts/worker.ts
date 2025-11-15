import { db } from '../lib/db';
import { spaces } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { transcribeSpace } from '../lib/transcription';

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '10000');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNextJob(): Promise<boolean> {
  try {
    // 查找待处理任务
    const [job] = await db
      .select()
      .from(spaces)
      .where(eq(spaces.status, 'pending'))
      .orderBy(spaces.createdAt)
      .limit(1);

    if (!job) {
      return false; // 没有任务
    }

    console.log(`\n[Worker] Processing Space: ${job.spaceId}`);
    console.log(`[Worker] Title: ${job.title}`);
    console.log(`[Worker] URL: ${job.spaceUrl}`);

    // 更新状态为 processing
    await db
      .update(spaces)
      .set({
        status: 'processing',
        processingStartedAt: new Date(),
      })
      .where(eq(spaces.id, job.id));

    console.log(`[Worker] Status updated to 'processing'`);

    try {
      // 执行转录
      const result = await transcribeSpace(job.spaceUrl, job.spaceId);

      // 更新为完成
      await db
        .update(spaces)
        .set({
          status: 'completed',
          title: result.title,
          creator: result.creator,
          participants: result.participants,
          audioDurationSeconds: result.duration,
          transcriptFilePath: result.transcriptPath,
          completedAt: new Date(),
        })
        .where(eq(spaces.id, job.id));

      console.log(`[Worker] ✓ Completed: ${job.spaceId}`);
      console.log(`[Worker] Transcript saved to: ${result.transcriptPath}`);
      return true;
    } catch (error: any) {
      console.error(`[Worker] ✗ Failed: ${job.spaceId}`, error);

      // 标记为失败
      await db
        .update(spaces)
        .set({
          status: 'failed',
        })
        .where(eq(spaces.id, job.id));

      return false;
    }
  } catch (error) {
    console.error('[Worker] Error processing job:', error);
    return false;
  }
}

async function startWorker() {
  console.log('='.repeat(60));
  console.log('🚀 Twitter Space Transcription Worker Started');
  console.log('='.repeat(60));
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`Data storage: ${process.env.DATA_STORAGE_PATH || './data/spaces'}`);
  console.log('='.repeat(60));
  console.log('');

  while (true) {
    try {
      const processed = await processNextJob();

      if (!processed) {
        // 没有任务，等待后重试
        await sleep(POLL_INTERVAL);
      } else {
        // 有任务被处理，短暂等待后继续
        await sleep(5000);
      }
    } catch (error) {
      console.error('[Worker] Unexpected error:', error);
      await sleep(POLL_INTERVAL);
    }
  }
}

// 启动 Worker
startWorker().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
