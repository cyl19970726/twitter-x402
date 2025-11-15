import { pgTable, text, serial, timestamp, integer, json } from 'drizzle-orm/pg-core';

export const spaces = pgTable('spaces', {
  id: serial('id').primaryKey(),
  spaceId: text('space_id').notNull().unique(),
  spaceUrl: text('space_url').notNull(),
  title: text('title').notNull(),
  creator: text('creator'),
  participants: json('participants').$type<string[]>(),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  transcriptFilePath: text('transcript_file_path'),
  audioDurationSeconds: integer('audio_duration_seconds'),
  processingStartedAt: timestamp('processing_started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transcriptionRequests = pgTable('transcription_requests', {
  id: serial('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  walletAddress: text('wallet_address').notNull(),
  amountUsdc: text('amount_usdc').notNull(),
  transactionHash: text('transaction_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const chatPayments = pgTable('chat_payments', {
  id: serial('id').primaryKey(),
  spaceId: integer('space_id').notNull(),
  walletAddress: text('wallet_address').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  amountUsdc: text('amount_usdc').notNull(),
  transactionHash: text('transaction_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
