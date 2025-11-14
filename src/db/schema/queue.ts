import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { spaces } from './spaces';

export const processingQueue = sqliteTable('processing_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),

  // Job status
  status: text('status').notNull().default('queued'), // queued, processing, completed, failed
  priority: integer('priority').notNull().default(0),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),

  // Error handling
  errorMessage: text('error_message'),
  lastErrorAt: integer('last_error_at', { mode: 'timestamp' }),

  // Timestamps
  queuedAt: integer('queued_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export type ProcessingJob = typeof processingQueue.$inferSelect;
export type NewProcessingJob = typeof processingQueue.$inferInsert;
