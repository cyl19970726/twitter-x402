# Package Structure & Project Organization (v2.0 - Unified Architecture)

## Overview

Complete package dependencies and project structure for the Twitter Space Agent system **using unified Hono service architecture**.

**新架构特点**：
- ✅ 一个 Hono 应用提供所有功能（x402 付费 API + 免费 API + Dashboard）
- ✅ 零 CORS 配置
- ✅ 简化部署（2个服务而非3个）
- ✅ 更低成本（$15/月 vs $20/月）

---

## Table of Contents

1. [Dependencies](#dependencies)
2. [Project Structure](#project-structure-new)
3. [Module Organization](#module-organization)
4. [Configuration Files](#configuration-files)
5. [Development Workflow](#development-workflow-new)
6. [Why Hono?](#why-hono)

---

## Dependencies

### Core Runtime

```json
{
  "dependencies": {
    // Core agent framework (x402 + manifest)
    "@lucid-dreams/agent-kit": "0.2.22",
    "zod": "^4.1.12",

    // HTTP framework (unified service)
    "hono": "^4.0.0",

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
    "playwright": "^1.56.1"
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
- **hono**: Fast, lightweight HTTP server
  - 用于统一服务（agent-kit 内部使用 Hono）
  - 静态文件服务（`serveStatic` from `hono/bun`）
  - 兼容 Bun, Node.js, Deno, Cloudflare Workers

---

## Project Structure (NEW)

```
twitter-space-agent/
├── src/
│   ├── agent/                    # 🎯 UNIFIED SERVICE
│   │   ├── entrypoints/
│   │   │   ├── transcribeSpace.ts      # transcribe-space (0.2 USDC)
│   │   │   ├── unlockChat.ts           # unlock-space-chat (0.5 USDC)
│   │   │   └── chatWithSpaces.ts       # chat-with-spaces (0.9+ USDC)
│   │   └── agent.ts              # ⭐ Unified Hono app
│   │                             # - x402 paid APIs
│   │                             # - Free HTTP APIs
│   │                             # - Static file serving
│   │
│   ├── api/                      # API helpers (no separate server)
│   │   └── middleware/
│   │       └── auth.ts           # Wallet signature verification
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

## Why Hono?

### ✅ Hono 非常适合我们的需求

#### 1. **轻量快速**
```typescript
// Hono 性能优异
// - 比 Express 快 3-4x
// - 比 Fastify 快 1.5-2x
// - 内存占用极小

import { Hono } from 'hono';
const app = new Hono();  // < 10KB 核心库
```

#### 2. **Multi-Runtime 支持**
```typescript
// 同样代码可运行在：
// ✅ Bun (我们使用)
// ✅ Node.js
// ✅ Deno
// ✅ Cloudflare Workers
// ✅ Vercel Edge Functions

// 未来迁移零成本
```

#### 3. **与 agent-kit 完美集成**
```typescript
// agent-kit 内部使用 Hono
import { createAgentApp } from '@lucid-dreams/agent-kit';

const { app } = createAgentApp(meta, config);
// app 就是 Hono 实例！

// 我们可以直接添加路由
app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/', serveStatic({ path: './public/index.html' }));
```

#### 4. **静态文件服务内置**
```typescript
import { serveStatic } from 'hono/bun';

// 无需 nginx 或单独静态服务器
app.get('/css/*', serveStatic({ root: './public' }));
app.get('/js/*', serveStatic({ root: './public' }));
app.get('/', serveStatic({ path: './public/index.html' }));
```

#### 5. **TypeScript 友好**
```typescript
// 完全类型安全
import type { Context } from 'hono';

app.get('/api/spaces/:id', async (c: Context) => {
  const id = c.req.param('id');  // Type: string
  return c.json({ id });         // Type-checked
});
```

#### 6. **中间件生态**
```typescript
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';

// 丰富的中间件
app.use('/*', cors());
app.use('/*', logger());
app.use('/*', compress());
```

---

### 🆚 Hono vs 其他框架

| 特性 | Hono | Express | Fastify | Elysia |
|------|------|---------|---------|--------|
| **性能** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **体积** | < 10KB | ~200KB | ~50KB | ~30KB |
| **TypeScript** | ✅ Native | ⚠️ 需要 @types | ✅ Native | ✅ Native |
| **Multi-runtime** | ✅ | ❌ | ❌ | ⚠️ Bun only |
| **agent-kit 集成** | ✅ 完美 | ❌ | ❌ | ❌ |
| **静态文件** | ✅ 内置 | ✅ | ⚠️ 插件 | ⚠️ 手动 |
| **学习曲线** | 简单 | 简单 | 中等 | 简单 |
| **社区生态** | 快速增长 | 庞大 | 大 | 新兴 |

---

### 为什么不选其他框架？

#### Express ❌
- 性能较慢（对比 Hono 慢 3-4x）
- 不支持 multi-runtime
- TypeScript 支持需要额外配置
- agent-kit 不使用 Express

#### Fastify ⚠️
- 性能好，但不如 Hono
- 不支持 multi-runtime（只有 Node.js）
- agent-kit 不支持

#### Elysia ⚠️
- 性能极佳，但只支持 Bun
- 未来迁移困难（锁定 Bun）
- agent-kit 不支持
- 生态较小

#### Next.js/TanStack Start ⚠️
- 过度设计（我们只需要 API + 静态文件）
- 构建复杂度高
- 部署成本高
- agent-kit 有适配但复杂

---

### 实际案例对比

#### 旧架构（多服务 + Express）
```typescript
// Agent service (agent-kit)
const { app: agentApp } = createAgentApp(...);
Bun.serve({ port: 8787, fetch: agentApp.fetch });

// API service (Express)
const express = require('express');
const apiApp = express();
apiApp.listen(3001);

// Dashboard (静态服务器)
python3 -m http.server 3000

// 问题：
// ❌ 3 个服务
// ❌ CORS 复杂
// ❌ 部署成本高
```

#### 新架构（统一 Hono）
```typescript
// 一个 Hono 应用
const { app } = createAgentApp(...);

// 添加免费 API
app.get('/api/health', (c) => c.json({ ok: true }));

// 添加静态文件
app.get('/', serveStatic({ path: './public/index.html' }));

// 启动
Bun.serve({ port: 8787, fetch: app.fetch });

// 优势：
// ✅ 1 个服务
// ✅ 零 CORS
// ✅ 简单部署
// ✅ 成本降低
```

---

### 性能基准测试

```bash
# Requests per second (越高越好)
Hono (Bun):      ~180,000 req/s
Fastify (Node):  ~110,000 req/s
Express (Node):  ~45,000 req/s

# Latency p99 (越低越好)
Hono (Bun):      < 1ms
Fastify (Node):  ~2ms
Express (Node):  ~5ms

# Memory usage (越低越好)
Hono:            ~20 MB
Fastify:         ~35 MB
Express:         ~60 MB
```

---

### Hono 生态系统

#### 官方中间件
```typescript
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { compress } from 'hono/compress';
import { serveStatic } from 'hono/bun';
import { jwt } from 'hono/jwt';
import { validator } from 'hono/validator';
```

#### 社区支持
- ⭐ 15k+ GitHub stars
- 📦 500+ 周下载量
- 📚 完善文档
- 💬 活跃社区

---

### 结论：Hono 完美适合我们

✅ **性能优异** - 满足高并发需求
✅ **轻量简洁** - 不引入不必要复杂度
✅ **agent-kit 集成** - 零配置开始
✅ **静态文件支持** - 无需额外服务器
✅ **TypeScript** - 类型安全
✅ **未来兼容** - 可迁移到其他 runtime

---

## Version History

- **v2.0.0**: Unified Hono architecture, dashboard, chat
- **v1.0.0**: Basic transcription service
