import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const spaces = sqliteTable('spaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spaceId: text('space_id').notNull().unique(),
  spaceUrl: text('space_url').notNull(),
  title: text('title').notNull(),
  creator: text('creator'),

  // File paths
  audioFilePath: text('audio_file_path'),
  transcriptFilePath: text('transcript_file_path'),

  // Processing status
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed

  // Metadata
  audioDurationSeconds: integer('audio_duration_seconds'),
  audioSizeMb: real('audio_size_mb'),
  transcriptLength: integer('transcript_length'),
  participants: text('participants'), // JSON array
  speakerProfiles: text('speaker_profiles'), // JSON array

  // Timestamps
  firstRequestedAt: integer('first_requested_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  processingStartedAt: integer('processing_started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  // Analytics
  transcriptionCount: integer('transcription_count').notNull().default(0),
  chatUnlockCount: integer('chat_unlock_count').notNull().default(0),
});

export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
