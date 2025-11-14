import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { spaces } from './spaces';

// Transcription payment records (0.2 USDC per Space)
export const transcriptionPayments = sqliteTable('transcription_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),

  // Payment details
  amountUsdc: text('amount_usdc').notNull(), // "0.2"
  transactionHash: text('transaction_hash'),
  paymentVerified: integer('payment_verified', { mode: 'boolean' }).notNull().default(false),

  // Timestamps
  paidAt: integer('paid_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
});

// Chat unlock records (0.5 USDC per Space)
export const chatUnlocks = sqliteTable('chat_unlocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  spaceId: integer('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),

  // Payment details
  amountUsdc: text('amount_usdc').notNull(), // "0.5"
  transactionHash: text('transaction_hash'),
  paymentVerified: integer('payment_verified', { mode: 'boolean' }).notNull().default(false),

  // Timestamps
  unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
});

// Chat session records (0.9 + 0.1 * num_spaces USDC)
export const chatSessions = sqliteTable('chat_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Query details
  spaceIds: text('space_ids').notNull(), // JSON array
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sources: text('sources'), // JSON array

  // Cost
  numSpaces: integer('num_spaces').notNull(),
  amountUsdc: text('amount_usdc').notNull(), // "1.0", "1.1", etc.
  transactionHash: text('transaction_hash'),

  // AI usage
  model: text('model').notNull().default('gpt-4o'),
  tokensUsed: integer('tokens_used'),

  // Timestamps
  queriedAt: integer('queried_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export type TranscriptionPayment = typeof transcriptionPayments.$inferSelect;
export type NewTranscriptionPayment = typeof transcriptionPayments.$inferInsert;

export type ChatUnlock = typeof chatUnlocks.$inferSelect;
export type NewChatUnlock = typeof chatUnlocks.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
