#!/usr/bin/env bun
/**
 * Transcription Worker Script
 *
 * Start the background worker for processing transcription jobs.
 *
 * Usage:
 *   bun run worker
 *   bun run scripts/worker.ts
 */

import { startWorker, setupShutdownHandlers } from '../src/worker/transcriptionWorker';

console.log('='.repeat(60));
console.log('Twitter Space Transcription Worker');
console.log('='.repeat(60));
console.log('');

// Setup graceful shutdown
setupShutdownHandlers();

// Start the worker
startWorker().catch((error) => {
  console.error('Fatal error in worker:', error);
  process.exit(1);
});
