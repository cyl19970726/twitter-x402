# Database Schema Design

## Overview

Using SQL database for:
- User management
- Space metadata
- Payment records
- Access control
- Chat history

Using File System for:
- Audio files (.m4a)
- Transcript files (.md)

---

## Database Choice

### Development: SQLite
- Single file database
- Zero configuration
- Perfect for MVP
- Easy to migrate

### Production: PostgreSQL
- High performance
- Better concurrency
- Production-ready
- Same schema as SQLite

---

## Schema Design

### 1. users

Stores wallet addresses and authentication info.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_wallet (wallet_address)
);
```

**Notes**:
- `wallet_address`: Ethereum address (0x...)
- Users are created automatically on first payment

---

### 2. spaces

Stores Twitter Space metadata.

```sql
CREATE TABLE spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id TEXT NOT NULL UNIQUE,  -- Twitter Space ID (e.g., "1RDxlAoOeQRKL")
  space_url TEXT NOT NULL,        -- Full URL
  title TEXT NOT NULL,
  creator TEXT,                    -- Twitter creator username or ID

  -- File paths
  audio_file_path TEXT,            -- Relative path: data/spaces/{space_id}/audio.m4a
  transcript_file_path TEXT,       -- Relative path: data/spaces/{space_id}/transcript.md

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed

  -- Metadata
  audio_duration_seconds INTEGER,
  audio_size_mb REAL,
  transcript_length INTEGER,       -- Character count
  participants TEXT,               -- JSON array of participant names
  speaker_profiles TEXT,           -- JSON array of speaker profiles

  -- Timestamps
  first_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Analytics
  transcription_count INTEGER DEFAULT 0,  -- How many users paid for this
  chat_unlock_count INTEGER DEFAULT 0,     -- How many users unlocked chat

  INDEX idx_space_id (space_id),
  INDEX idx_status (status),
  INDEX idx_completed_at (completed_at)
);
```

**Status values**:
- `pending`: Payment received, not started processing
- `processing`: Currently transcribing
- `completed`: Ready to use
- `failed`: Processing failed (needs retry)

---

### 3. transcription_payments

Tracks payments for Space transcription.

```sql
CREATE TABLE transcription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  space_id INTEGER NOT NULL,

  -- Payment details
  amount_usdc TEXT NOT NULL,       -- "0.2"
  transaction_hash TEXT,           -- Blockchain tx hash
  payment_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,

  UNIQUE(user_id, space_id),       -- One payment per user per Space
  INDEX idx_user_space (user_id, space_id),
  INDEX idx_paid_at (paid_at)
);
```

**Access Control**: User can access Space transcript if they have a record here.

---

### 4. chat_unlocks

Tracks chat unlock payments (0.5 USDC per Space).

```sql
CREATE TABLE chat_unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  space_id INTEGER NOT NULL,

  -- Payment details
  amount_usdc TEXT NOT NULL,       -- "0.5"
  transaction_hash TEXT,
  payment_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,

  UNIQUE(user_id, space_id),       -- One unlock per user per Space
  INDEX idx_user_space (user_id, space_id),
  INDEX idx_unlocked_at (unlocked_at)
);
```

**Access Control**: User can chat with Space if:
1. Has `transcription_payments` record (owns transcript)
2. Has `chat_unlocks` record (unlocked chat)

---

### 5. chat_sessions

Tracks individual chat queries.

```sql
CREATE TABLE chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,  -- UUID
  user_id INTEGER NOT NULL,

  -- Query details
  space_ids TEXT NOT NULL,          -- JSON array: ["1RDxlAoOeQRKL", "1vOGw..."]
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT,                     -- JSON array of {spaceId, excerpt} objects

  -- Cost
  num_spaces INTEGER NOT NULL,      -- Number of Spaces queried
  amount_usdc TEXT NOT NULL,        -- "1.0", "1.1", "1.2", etc.
  transaction_hash TEXT,

  -- AI usage
  model TEXT DEFAULT 'gpt-4o',
  tokens_used INTEGER,

  -- Timestamps
  queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_queried_at (queried_at),
  INDEX idx_session_id (session_id)
);
```

**Pricing Calculation**:
```sql
amount_usdc = 0.9 + (0.1 * num_spaces)
```

---

### 6. processing_queue

Background job queue for Space processing.

```sql
CREATE TABLE processing_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,

  -- Job status
  status TEXT NOT NULL DEFAULT 'queued',  -- queued, processing, completed, failed
  priority INTEGER DEFAULT 0,             -- Higher = process first
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Error handling
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- Timestamps
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_priority_queued (priority DESC, queued_at ASC)
);
```

**Background Worker** picks jobs with:
```sql
SELECT * FROM processing_queue
WHERE status = 'queued'
  AND retry_count < max_retries
ORDER BY priority DESC, queued_at ASC
LIMIT 1
```

---

## Relationships Diagram

```
users
  │
  ├─── transcription_payments ──── spaces
  │
  ├─── chat_unlocks ──────────────── spaces
  │
  └─── chat_sessions
           │
           └─── (references multiple spaces)

spaces
  │
  └─── processing_queue
```

---

## Common Queries

### 1. Get User's Spaces

```sql
SELECT s.*
FROM spaces s
JOIN transcription_payments tp ON tp.space_id = s.id
WHERE tp.user_id = ?
  AND s.status = 'completed'
ORDER BY tp.paid_at DESC;
```

### 2. Check User Access to Space

```sql
SELECT EXISTS(
  SELECT 1
  FROM transcription_payments
  WHERE user_id = ? AND space_id = ?
) AS has_access;
```

### 3. Check Chat Unlock Status

```sql
SELECT
  EXISTS(SELECT 1 FROM transcription_payments WHERE user_id = ? AND space_id = ?) AS has_transcript,
  EXISTS(SELECT 1 FROM chat_unlocks WHERE user_id = ? AND space_id = ?) AS has_chat_unlock;
```

### 4. Get Popular Spaces

```sql
SELECT space_id, title, transcription_count, chat_unlock_count
FROM spaces
WHERE status = 'completed'
ORDER BY transcription_count DESC
LIMIT 10;
```

### 5. Calculate Revenue

```sql
SELECT
  SUM(CAST(amount_usdc AS REAL)) AS total_transcriptions
FROM transcription_payments
WHERE payment_verified = TRUE;

SELECT
  SUM(CAST(amount_usdc AS REAL)) AS total_chat_unlocks
FROM chat_unlocks
WHERE payment_verified = TRUE;

SELECT
  SUM(CAST(amount_usdc AS REAL)) AS total_chat_queries
FROM chat_sessions;
```

### 6. Next Job in Queue

```sql
SELECT *
FROM processing_queue
WHERE status = 'queued'
  AND retry_count < max_retries
ORDER BY priority DESC, queued_at ASC
LIMIT 1;
```

---

## Indexes Strategy

### Primary Indexes
- All foreign keys automatically indexed
- `wallet_address` on users (lookup)
- `space_id` on spaces (lookup)

### Composite Indexes
- `(user_id, space_id)` on payments tables (access control checks)
- `(status, priority, queued_at)` on processing_queue (job selection)

### Search Optimization
If implementing full-text search:
```sql
-- SQLite
CREATE VIRTUAL TABLE spaces_fts USING fts5(space_id, title, participants);

-- PostgreSQL
CREATE INDEX idx_spaces_title_gin ON spaces USING gin(to_tsvector('english', title));
```

---

## File System Structure

```
data/
  spaces/
    <space_id>/
      audio.m4a           # Referenced by spaces.audio_file_path
      transcript.md       # Referenced by spaces.transcript_file_path
      transcript.json     # Structured data (not in DB)

  database/
    spaces.db            # SQLite database file
```

---

## Migration Path

### Phase 1: SQLite (MVP)
- Single file: `data/database/spaces.db`
- Easy deployment
- Good for < 10,000 Spaces

### Phase 2: PostgreSQL (Production)
- Same schema (minimal changes)
- Better performance
- Supports scaling

### Migration Script
```bash
# Export from SQLite
sqlite3 spaces.db .dump > export.sql

# Import to PostgreSQL
psql -d spaces_db -f export.sql
```

---

## ORM vs Raw SQL

### Recommendation: Use an ORM

**Options**:
1. **Drizzle ORM** (Recommended)
   - TypeScript-first
   - Lightweight
   - Great with Bun

2. **Prisma**
   - Popular
   - Great migrations
   - Slightly heavier

3. **Kysely**
   - Type-safe SQL builder
   - More control

### Example with Drizzle:

```typescript
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletAddress: text('wallet_address').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const spaces = sqliteTable('spaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spaceId: text('space_id').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('pending'),
  // ... more fields
});
```

---

## Next Steps

1. Choose ORM (recommend Drizzle)
2. Create migration files
3. Setup database connection
4. Implement models
5. Update API endpoints to use database
6. Migrate storage manager to use DB

---

## Security Considerations

1. **SQL Injection**: Use parameterized queries (ORM handles this)
2. **Sensitive Data**: Never store private keys
3. **Wallet Verification**: Always verify signatures server-side
4. **Payment Verification**: Verify x402 payments on-chain
5. **Access Control**: Always check permissions before returning data
