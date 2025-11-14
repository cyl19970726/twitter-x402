# Package Structure & Project Organization

## Overview

Complete package dependencies and project structure for the Twitter Space Agent system.

---

## Table of Contents

1. [Dependencies](#dependencies)
2. [Project Structure](#project-structure)
3. [Module Organization](#module-organization)
4. [Configuration Files](#configuration-files)
5. [Development Workflow](#development-workflow)

---

## Dependencies

### Core Runtime

```json
{
  "dependencies": {
    // Core runtime
    "@lucid-dreams/agent-kit": "latest",
    "zod": "^4.1.12",

    // Database
    "drizzle-orm": "^0.30.0",
    "better-sqlite3": "^9.4.0",

    // Twitter integration
    "@pacoyang/agent-twitter-client": "^0.0.18",

    // AI services
    "openai": "^6.7.0",

    // Web3 / Payment
    "viem": "^2.38.6",
    "x402-fetch": "^0.7.0",

    // HTTP server (for free APIs)
    "hono": "^4.0.0",

    // Utilities
    "dotenv": "^17.2.3"
  },

  "devDependencies": {
    // Database tools
    "drizzle-kit": "^0.20.0",

    // TypeScript
    "typescript": "^5.9.2",
    "@types/node": "^24.7.2",
    "@types/better-sqlite3": "^7.6.9",

    // Testing
    "bun-types": "^1.3.0",
    "playwright": "^1.56.1",

    // Deployment
    "@vercel/node": "^5.5.3"
  }
}
```

### Package Breakdown

#### Database Layer
- **drizzle-orm**: TypeScript ORM for SQLite/PostgreSQL
- **better-sqlite3**: Fast SQLite driver for Node.js
- **drizzle-kit**: Database migration tool

#### AI & Processing
- **openai**: Whisper (transcription) + GPT-4o (formatting/chat)
- **@pacoyang/agent-twitter-client**: Twitter API client for Space downloads

#### Payment & Web3
- **viem**: Ethereum library for wallet operations
- **x402-fetch**: x402 payment protocol client
- **@lucid-dreams/agent-kit**: Agent framework with x402 integration

#### Web Framework
- **hono**: Fast HTTP server for free APIs and dashboard

---

## Project Structure

```
twitter-space-agent/
├── src/
│   ├── agent/                    # Paid APIs (agent-kit)
│   │   ├── entrypoints/
│   │   │   ├── transcribeSpace.ts      # format-twitter-space
│   │   │   ├── unlockChat.ts           # unlock-space-chat
│   │   │   └── chatWithSpaces.ts       # chat-with-spaces
│   │   └── agent.ts              # Agent app initialization
│   │
│   ├── api/                      # Free APIs (Hono)
│   │   ├── routes/
│   │   │   ├── spaces.ts         # Space CRUD endpoints
│   │   │   ├── user.ts           # User endpoints
│   │   │   └── dashboard.ts      # Dashboard endpoints
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Wallet signature verification
│   │   │   └── cors.ts           # CORS configuration
│   │   └── server.ts             # Hono app initialization
│   │
│   ├── db/                       # Database layer
│   │   ├── schema/
│   │   │   ├── users.ts          # User schema
│   │   │   ├── spaces.ts         # Space schema
│   │   │   ├── payments.ts       # Payment schemas
│   │   │   └── index.ts          # Export all schemas
│   │   ├── migrations/           # SQL migrations
│   │   │   └── 0000_initial.sql
│   │   ├── client.ts             # Database connection
│   │   └── queries/              # Common queries
│   │       ├── users.ts
│   │       ├── spaces.ts
│   │       └── payments.ts
│   │
│   ├── worker/                   # Background workers
│   │   ├── transcriptionWorker.ts  # Process transcription queue
│   │   ├── scheduler.ts          # Job scheduler
│   │   └── types.ts              # Worker types
│   │
│   ├── services/                 # Business logic
│   │   ├── spaceService.ts       # Space operations
│   │   ├── paymentService.ts     # Payment verification
│   │   ├── chatService.ts        # Chat with OpenAI
│   │   └── authService.ts        # Authentication
│   │
│   ├── utils/                    # Utilities
│   │   ├── downloadSpace.ts      # Twitter Space download
│   │   ├── transcribeAudio.ts    # Whisper transcription
│   │   ├── formatTranscript.ts   # GPT-4o formatting
│   │   ├── storage.ts            # File system operations
│   │   └── validation.ts         # Input validation
│   │
│   ├── types/                    # TypeScript types
│   │   ├── space.ts
│   │   ├── payment.ts
│   │   ├── user.ts
│   │   └── index.ts
│   │
│   └── index.ts                  # Main entry point
│
├── public/                       # Dashboard frontend
│   ├── index.html                # Dashboard home
│   ├── space.html                # Space detail view
│   ├── chat.html                 # Chat interface
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js                # Main app logic
│       ├── wallet.js             # Wallet connection
│       ├── api.js                # API client
│       └── utils.js
│
├── data/                         # Storage (gitignored)
│   ├── database/
│   │   └── spaces.db             # SQLite database
│   └── spaces/                   # Space files
│       └── <space_id>/
│           ├── audio.m4a
│           ├── transcript.md
│           └── transcript.json
│
├── tests/                        # Test files
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── worker/
│   └── e2e/
│       └── full-flow.test.ts
│
├── docs/                         # Documentation
│   ├── v1/
│   │   ├── 01-datastream.md
│   │   ├── 02-architect.md
│   │   ├── 03-database-schema.md
│   │   └── 04-packages.md
│   ├── QUICKSTART.md
│   └── API.md
│
├── scripts/                      # Utility scripts
│   ├── migrate.ts                # Run migrations
│   ├── seed.ts                   # Seed test data
│   └── worker.ts                 # Start background worker
│
├── .env.example                  # Environment variables template
├── .env                          # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── drizzle.config.ts             # Drizzle ORM config
└── README.md
```

---

## Module Organization

### 1. Agent Layer (`src/agent/`)

**Purpose**: Paid APIs using agent-kit + x402

```typescript
// src/agent/agent.ts
import { createAgentApp } from '@lucid-dreams/agent-kit';
import transcribeSpace from './entrypoints/transcribeSpace';
import unlockChat from './entrypoints/unlockChat';
import chatWithSpaces from './entrypoints/chatWithSpaces';

const { app, addEntrypoint } = createAgentApp({
  name: 'twitter-space-agent',
  version: '2.0.0',
});

addEntrypoint(transcribeSpace);
addEntrypoint(unlockChat);
addEntrypoint(chatWithSpaces);

export { app };
```

**Entrypoints**:
- `transcribeSpace.ts`: 0.2 USDC - Queue Space for transcription
- `unlockChat.ts`: 0.5 USDC - Unlock chat for a Space
- `chatWithSpaces.ts`: 0.9+0.1n USDC - Query Spaces with AI

---

### 2. API Layer (`src/api/`)

**Purpose**: Free HTTP APIs for dashboard

```typescript
// src/api/server.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import spacesRouter from './routes/spaces';
import userRouter from './routes/user';
import { authMiddleware } from './middleware/auth';

const app = new Hono();

app.use('/*', cors());
app.use('/api/*', authMiddleware);

app.route('/api/spaces', spacesRouter);
app.route('/api/user', userRouter);

export default app;
```

**Routes**:
- `GET /api/spaces/mine` - List user's Spaces
- `GET /api/spaces/:id` - Get Space details
- `GET /api/spaces/search` - Search Spaces
- `GET /api/spaces/:id/chat-status` - Check chat unlock

---

### 3. Database Layer (`src/db/`)

**Purpose**: Data persistence with Drizzle ORM

```typescript
// src/db/schema/spaces.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const spaces = sqliteTable('spaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spaceId: text('space_id').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('pending'),
  // ... more fields
});
```

**Migrations**:
```bash
# Generate migration
bun run drizzle-kit generate:sqlite

# Run migration
bun run drizzle-kit push:sqlite
```

---

### 4. Worker Layer (`src/worker/`)

**Purpose**: Background processing

```typescript
// src/worker/transcriptionWorker.ts
import { db } from '../db/client';
import { processingQueue, spaces } from '../db/schema';
import { formatSpaceFromUrl } from '../utils/summarizeSpace';

export async function startWorker() {
  setInterval(async () => {
    const job = await getNextJob();
    if (job) {
      await processJob(job);
    }
  }, 10000); // Check every 10 seconds
}
```

**Jobs**:
- Pick up pending transcription jobs
- Download, transcribe, format
- Update database status
- Handle retries and errors

---

### 5. Services Layer (`src/services/`)

**Purpose**: Business logic

```typescript
// src/services/spaceService.ts
export class SpaceService {
  async createTranscriptionJob(userId: number, spaceUrl: string) {
    // 1. Check if Space exists
    // 2. Create payment record
    // 3. Queue for processing
    // 4. Return job status
  }

  async getUserSpaces(userId: number) {
    // Query spaces user has access to
  }

  async getSpaceDetails(userId: number, spaceId: string) {
    // Check access, return transcript
  }
}
```

---

## Configuration Files

### drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/database/spaces.db',
  },
} satisfies Config;
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@db/*": ["./src/db/*"],
      "@utils/*": ["./src/utils/*"],
      "@services/*": ["./src/services/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "start": "bun run src/index.ts",
    "worker": "bun run scripts/worker.ts",

    "db:generate": "drizzle-kit generate:sqlite",
    "db:migrate": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio",

    "typecheck": "bunx tsc --noEmit",
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "bun test tests/e2e"
  }
}
```

---

## Environment Variables

### .env.example

```bash
# Database
DATABASE_URL=./data/database/spaces.db

# Storage
STORAGE_ROOT=./data

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Twitter
TWITTER_COOKIES=[...]

# x402 Payment
NETWORK=base-sepolia
FACILITATOR_URL=https://facilitator.daydreams.systems
PAY_TO=0x...
PRIVATE_KEY=0x...

# Pricing (in base units, 1 USDC = 1000000)
PRICE_TRANSCRIBE=200000        # 0.2 USDC
PRICE_UNLOCK_CHAT=500000       # 0.5 USDC
PRICE_CHAT_BASE=900000         # 0.9 USDC
PRICE_CHAT_PER_SPACE=100000    # 0.1 USDC

# Audio processing
AUDIO_CHUNK_DURATION_MINUTES=10

# Server
PORT=8787
API_BASE_URL=http://localhost:8787

# Worker
WORKER_ENABLED=true
WORKER_POLL_INTERVAL=10000     # milliseconds
```

---

## Development Workflow

### 1. Setup

```bash
# Install dependencies
bun install

# Setup database
bun run db:generate
bun run db:migrate

# Copy environment variables
cp .env.example .env
# Edit .env with your values
```

### 2. Development

```bash
# Terminal 1: Start API server
bun run dev

# Terminal 2: Start background worker
bun run worker

# Terminal 3: Watch database
bun run db:studio
```

### 3. Testing

```bash
# Run all tests
bun test

# Run specific test suite
bun run test:unit
bun run test:integration
bun run test:e2e

# Type checking
bun run typecheck
```

### 4. Database Management

```bash
# View database in browser
bun run db:studio

# Create new migration
bun run db:generate

# Apply migrations
bun run db:migrate

# Seed test data
bun run scripts/seed.ts
```

---

## Import Paths

Using TypeScript path aliases for cleaner imports:

```typescript
// Before
import { db } from '../../../db/client';
import { formatSpaceFromUrl } from '../../../utils/summarizeSpace';

// After (with path aliases)
import { db } from '@db/client';
import { formatSpaceFromUrl } from '@utils/summarizeSpace';
```

**Configuration**: Already set in `tsconfig.json` paths.

---

## Build & Deployment

### Development
```bash
bun run dev
```

### Production Build
```bash
# Build TypeScript
bunx tsc

# Or use Bun's bundler
bun build src/index.ts --outdir ./dist
```

### Deployment Options

1. **Vercel** (Recommended for Serverless)
   ```bash
   vercel deploy
   ```

2. **Railway** (Recommended for Worker)
   ```bash
   railway up
   ```

3. **Docker**
   ```dockerfile
   FROM oven/bun:latest
   WORKDIR /app
   COPY . .
   RUN bun install
   RUN bun run db:migrate
   CMD ["bun", "run", "start"]
   ```

---

## File Size Considerations

### Audio Files
- Average Space: ~50-100 MB
- 1000 Spaces: ~50-100 GB
- **Solution**: Use cloud storage (S3/R2) in production

### Database
- SQLite: Good up to ~10,000 Spaces
- Beyond that: Migrate to PostgreSQL

---

## Security Best Practices

1. **Never commit**:
   - `.env` file
   - Private keys
   - API keys
   - Database files

2. **Always validate**:
   - User wallet signatures
   - Payment transactions
   - Input data (use Zod)

3. **Rate limiting**:
   - Implement on free API endpoints
   - Prevent abuse

---

## Monitoring & Logging

### Recommended Tools

1. **Logging**: `pino` (fast, structured)
2. **Monitoring**: Sentry (error tracking)
3. **Analytics**: PostHog (user analytics)

### Log Levels

```typescript
logger.debug('Processing started');
logger.info('Job completed');
logger.warn('Retry attempt 2/3');
logger.error('Processing failed', error);
```

---

## Next Steps

1. Install all dependencies
2. Create database schema files
3. Setup migrations
4. Implement agent entrypoints
5. Build API routes
6. Create worker
7. Build dashboard UI
8. Deploy

---

## Version History

- **v2.0.0**: Full rewrite with database, dashboard, chat
- **v1.0.0**: Basic transcription service
