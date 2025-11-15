# System Architecture - Twitter Space Agent

## Overview

**统一服务架构** - 一个 Hono 应用提供所有功能：
- **x402 付费 API** - 通过 `@lucid-agents/hono` agent-kit 实现
- **免费 HTTP API** - 标准 REST endpoints 用于 Dashboard
- **静态文件服务** - Dashboard 前端页面

## Why Unified Architecture?

### ❌ 原架构问题（3个独立服务）

```
Agent (8787)     API Server (3001)     Worker
   ↓                  ↓                  ↓
需要 CORS          独立部署           复杂配置
3个域名            用户混淆           高成本
```

**问题**：
1. 🌐 **CORS 复杂性** - 前端需要跨域访问两个服务
2. 💰 **部署成本高** - Railway 3个服务 = $15/月（不含数据库）
3. 🔀 **用户体验差** - 需要记住多个 URL
4. 🔧 **配置复杂** - 每个服务独立配置环境变量

### ✅ 新架构优势（统一服务）

```
┌─────────────────────────────────────────────────────────┐
│           Unified Service (Port 8787)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │        Hono App (agent-kit enhanced)             │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  x402 Paid APIs                                  │  │
│  │  ├─ /entrypoints/transcribe-space/invoke         │  │
│  │  ├─ /entrypoints/unlock-space-chat/invoke        │  │
│  │  └─ /entrypoints/chat-with-spaces/invoke         │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Free HTTP APIs                                  │  │
│  │  ├─ /api/spaces/mine                             │  │
│  │  ├─ /api/spaces/:id                              │  │
│  │  ├─ /api/spaces/search                           │  │
│  │  └─ /api/user/info                               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Static Dashboard                                │  │
│  │  ├─ / (index.html)                               │  │
│  │  ├─ /space.html                                  │  │
│  │  └─ /css, /js (assets)                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Worker Service (Background Processing)
  ├─ Audio download
  ├─ Whisper transcription
  └─ GPT-4 formatting
```

**优势**：
1. ✅ **零 CORS 问题** - 所有请求同域名
2. 💰 **成本降低 33%** - Railway 2服务（App + Worker）= $10/月
3. 🎯 **用户体验好** - 一个 URL 访问所有功能
4. 🔧 **配置简单** - 一套环境变量
5. 🚀 **部署简单** - 一个代码库，一个构建

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User (Browser)                         │
│              https://your-app.railway.app                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │  Wallet Connection (Optional)    │
        │  - MetaMask / WalletConnect      │
        │  - x402 payment via wallet       │
        │  - Auth via signature            │
        └──────────────────┬───────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐     ┌──────────┐
   │ Browse  │      │   Pay    │     │  Query   │
   │  Free   │      │  x402    │     │   Free   │
   │ Content │      │  (USDC)  │     │   APIs   │
   └────┬────┘      └─────┬────┘     └─────┬────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │    Unified Hono Application     │
         │  (Single Service - Port 8787)   │
         └────────────┬────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
  ┌─────────────┐          ┌──────────────┐
  │  Database   │          │    Worker    │
  │ PostgreSQL  │◄─────────┤   Service    │
  │  (SQLite)   │          │ (Background) │
  └─────────────┘          └──────────────┘
         │                         │
         └────────┬────────────────┘
                  ▼
         ┌─────────────────┐
         │  File Storage   │
         │  - Audio files  │
         │  - Transcripts  │
         └─────────────────┘
```

---

## Technical Implementation

### agent-kit 核心能力分析

基于对 `/Users/hhh0x/meme/agents/lucid-agents` 源码的深入分析：

#### 1. Hono Adapter 架构

```typescript
// packages/hono/src/app.ts
export function createAgentApp(meta: AgentMeta, opts?: CreateAgentAppOptions) {
  const runtime = createAgentHttpRuntime(meta, opts);
  const app = new Hono();  // ← 标准 Hono 实例

  // 🔑 关键钩子：在挂载 agent 路由之前
  opts?.beforeMount?.(app);

  // agent-kit 自动注册的路由：
  // - /entrypoints/:key/invoke (POST)
  // - /entrypoints/:key/stream (POST)
  // - /.well-known/agent.json (GET)
  // - /health (GET)

  // 🔑 关键钩子：在挂载 agent 路由之后
  opts?.afterMount?.(app);

  return {
    app,           // ← 返回 Hono app，可继续添加路由
    addEntrypoint, // ← 动态添加 entrypoint
    agent,         // ← Runtime agent 实例
    config         // ← 配置对象
  };
}
```

**关键发现**：
- ✅ `createAgentApp()` 返回标准 Hono 实例
- ✅ 提供 `afterMount` 钩子用于添加自定义路由
- ✅ 完全兼容 Hono 生态系统（middleware, static files, etc.）

#### 2. 统一服务实现方案

```typescript
import { createAgentApp } from '@lucid-agents/hono';
import { serveStatic } from 'hono/bun';

// 1. 创建 agent app（自动包含 x402 付费路由）
const { app, addEntrypoint } = createAgentApp(
  {
    name: 'twitter-space-agent',
    version: '1.0.0',
    description: 'Twitter Space transcription with x402',
  },
  {
    config: {
      payments: {
        payTo: process.env.PAY_TO!,
        network: 'base',
        facilitatorUrl: 'https://facilitator.daydreams.systems',
      },
    },
    useConfigPayments: true,

    // 🔑 使用 afterMount 添加自定义路由
    afterMount: (honoApp) => {
      // 2. 添加免费 API 路由
      honoApp.get('/api/spaces/mine', async (c) => {
        const wallet = c.req.query('wallet');
        const spaces = await getSpacesByWallet(wallet);
        return c.json(spaces);
      });

      honoApp.get('/api/spaces/:id', async (c) => {
        const spaceId = c.req.param('id');
        const space = await getSpaceById(spaceId);
        return c.json(space);
      });

      // 3. 添加静态文件服务（Dashboard）
      honoApp.get('/public/*', serveStatic({ root: './' }));
      honoApp.get('/', serveStatic({ path: './public/index.html' }));
    },
  }
);

// 4. 添加 x402 付费 entrypoints
addEntrypoint({
  key: 'transcribe-space',
  description: 'Transcribe a Twitter Space',
  price: '200000', // 0.2 USDC
  input: z.object({
    spaceUrl: z.string().url(),
    title: z.string().optional(),
  }),
  async handler({ input, payment }) {
    // 记录付款并排队任务
    await recordPayment(payment);
    await queueTranscription(input.spaceUrl);
    return { success: true, queued: true };
  },
});

// 5. 启动统一服务
export default app;
```

**实现要点**：
1. **agent-kit 自动处理**：x402 payment middleware, manifest 生成
2. **afterMount 钩子**：添加免费 API 和静态文件服务
3. **零 CORS**：所有路由在同一 Hono app
4. **统一配置**：一套环境变量，一个端口

#### 3. 路由规划

| 路由类型 | 路径模式 | 用途 | 实现方式 |
|---------|---------|------|---------|
| **x402 Paid** | `/entrypoints/:key/invoke` | 付费 API | agent-kit 自动 |
| **Free API** | `/api/*` | Dashboard 数据查询 | afterMount 添加 |
| **Static Files** | `/`, `/space.html`, `/css/*` | Dashboard 前端 | Hono serveStatic |
| **Manifest** | `/.well-known/agent.json` | Agent 元数据 | agent-kit 自动 |
| **Health** | `/health` | 健康检查 | agent-kit 自动 |

---

## 1. Paid APIs (x402 + agent-kit)

These APIs require payment via x402 protocol and are wrapped with `@lucid-dreams/agent-kit`.

### 1.1 Transcribe Space

**Entrypoint**: `format-twitter-space`

**Price**: 0.2 USDC

**Input**:
```typescript
{
  spaceUrl: string  // https://x.com/i/spaces/1RDxlAoOeQRKL
}
```

**Output**:
```typescript
{
  success: boolean,
  spaceId: string,
  message: string,
  estimatedCompletionTime: number  // seconds
}
```

**Flow**:
1. User pays 0.2 USDC via x402
2. Payment verified and recorded
3. API returns immediately with `success: true`
4. Background worker starts processing:
   - Download audio
   - Transcribe with Whisper
   - Format with GPT-4o
   - Save to storage
5. User can check status via Dashboard

**Important**: This API does NOT wait for processing to complete. It returns immediately after payment verification.

---

### 1.2 Unlock Space Chat

**Entrypoint**: `unlock-space-chat`

**Price**: 0.5 USDC (one-time per Space)

**Input**:
```typescript
{
  spaceId: string  // 1RDxlAoOeQRKL
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
  spaceId: string,
  unlockedAt: string  // ISO timestamp
}
```

**Flow**:
1. User pays 0.5 USDC via x402
2. Payment verified
3. Record unlock permission for (wallet_address, space_id)
4. Return success

**Access Control**: Stored in `data/chat_unlocks/<wallet_address>/<space_id>.json`

---

### 1.3 Chat with Spaces

**Entrypoint**: `chat-with-spaces`

**Pricing** (dynamic based on number of Spaces):
- Base cost: 0.9 USDC
- Each Space: +0.1 USDC
- **Examples**:
  - 1 Space: 0.9 + 0.1 = 1.0 USDC
  - 2 Spaces: 0.9 + 0.2 = 1.1 USDC
  - 3 Spaces: 0.9 + 0.3 = 1.2 USDC

**Input**:
```typescript
{
  spaceIds: string[],     // ["1RDxlAoOeQRKL", "1vOGwAbcdEFGH"]
  question: string        // "What are the main topics discussed?"
}
```

**Output**:
```typescript
{
  answer: string,
  sources: {
    spaceId: string,
    excerpt: string
  }[],
  model: string,          // "gpt-4o"
  tokensUsed: number
}
```

**Flow**:
1. Verify user has unlocked all requested Spaces
2. If not: return error with list of locked Spaces
3. User pays (0.9 + 0.1 * spaceIds.length) USDC
4. Query OpenAI Agent SDK with all Space transcripts
5. Return answer with sources

**Access Control**: Must have paid for each Space via `unlock-space-chat` first

---

## 2. Free APIs (Standard HTTP)

These endpoints do NOT require payment and are used by the Dashboard.

### 2.1 List User's Spaces

**Endpoint**: `GET /api/spaces/mine`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,        // User's wallet address
  signature: string,     // Signature proving wallet ownership
  limit?: number,        // Default: 50
  offset?: number        // Default: 0
}
```

**Response**:
```typescript
{
  spaces: SpaceMetadata[],
  total: number,
  hasMore: boolean
}
```

**Logic**: Return all Spaces that this wallet has paid to transcribe

---

### 2.2 Get Space Details

**Endpoint**: `GET /api/spaces/:spaceId`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  metadata: SpaceMetadata,
  transcript: string,      // Markdown
  hasUnlockedChat: boolean,
  error?: string          // If user doesn't have access
}
```

**Access Control**: Only accessible if user has paid to transcribe this Space

---

### 2.3 Search Spaces

**Endpoint**: `GET /api/spaces/search?q=xxx`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  q: string,            // Search query (Space ID, URL, title, participant)
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  spaces: SpaceMetadata[]
}
```

**Logic**: Search only within Spaces the user has access to

---

### 2.4 Get Chat Unlock Status

**Endpoint**: `GET /api/spaces/:spaceId/chat-status`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  spaceId: string,
  hasAccess: boolean,      // Has paid for transcription
  hasUnlockedChat: boolean, // Has paid for chat unlock
  unlockedAt?: string      // ISO timestamp
}
```

---

### 2.5 Dashboard Home

**Endpoint**: `GET /`

**Response**: HTML page (static or server-rendered)

**Features**:
- Wallet connection UI
- List of user's Spaces
- Search bar
- Space detail view
- Chat interface (for unlocked Spaces)

---

## 3. Storage Structure

```
data/
  spaces/
    <space_id>/
      metadata.json          # Space info
      audio.m4a             # Downloaded audio
      transcript.md         # Formatted transcript
      transcript.json       # Structured data

  payments/
    transcriptions/
      <wallet_address>/
        <space_id>.json     # Payment record for transcription

    chat_unlocks/
      <wallet_address>/
        <space_id>.json     # Payment record for chat unlock

  chat_history/
    <wallet_address>/
      <session_id>.json     # Chat session history
```

---

## 4. Payment Records

### Transcription Payment Record

**File**: `data/payments/transcriptions/<wallet>/<space_id>.json`

```typescript
{
  spaceId: string,
  spaceUrl: string,
  walletAddress: string,
  paidAmount: string,        // "0.2"
  currency: "USDC",
  paidAt: string,            // ISO timestamp
  transactionHash: string,
  status: "pending" | "processing" | "completed" | "failed",
  completedAt?: string,
  error?: string
}
```

### Chat Unlock Record

**File**: `data/payments/chat_unlocks/<wallet>/<space_id>.json`

```typescript
{
  spaceId: string,
  walletAddress: string,
  paidAmount: string,        // "0.5"
  currency: "USDC",
  unlockedAt: string,
  transactionHash: string
}
```

### Chat Query Record

**File**: `data/chat_history/<wallet>/<session_id>.json`

```typescript
{
  sessionId: string,
  walletAddress: string,
  spaceIds: string[],
  question: string,
  answer: string,
  paidAmount: string,        // "1.0", "1.1", "1.2", etc.
  queriedAt: string,
  tokensUsed: number
}
```

---

## 5. Authentication & Authorization

### 5.1 Wallet Authentication

All authenticated requests require:
```typescript
{
  wallet: string,          // 0x...
  signature: string,       // EIP-191 signature
  message: string,         // "Authenticate with Twitter Space Agent at {timestamp}"
  timestamp: number
}
```

**Verification**:
1. Check timestamp is within 5 minutes
2. Verify signature matches wallet
3. Allow request

### 5.2 Access Control Rules

**For Transcripts**:
- User can access Space if: `data/payments/transcriptions/{wallet}/{space_id}.json` exists and status is "completed"

**For Chat**:
- User can chat with Space if:
  1. Has paid for transcription (see above)
  2. Has paid for chat unlock: `data/payments/chat_unlocks/{wallet}/{space_id}.json` exists

---

## 6. Background Workers

### 6.1 Transcription Worker

**Trigger**: New payment in `data/payments/transcriptions/`

**Process**:
1. Pick up pending jobs (status: "pending")
2. Update status to "processing"
3. Run `formatSpaceFromUrl()`:
   - Download audio
   - Transcribe with Whisper
   - Format with GPT-4o
4. Save to storage
5. Update status to "completed" or "failed"

**Queue**: Simple file-based queue (check every 10 seconds)

---

## 7. Dashboard UI Flow

### 7.1 Connect Wallet

1. User clicks "Connect Wallet"
2. MetaMask/WalletConnect popup
3. User signs authentication message
4. Store signature + wallet address

### 7.2 View My Spaces

1. Dashboard calls `GET /api/spaces/mine?wallet=0x...&signature=...`
2. Display list of Spaces with:
   - Title
   - Date processed
   - Duration
   - Participants
   - Chat status (locked/unlocked)

### 7.3 View Space Details

1. User clicks on a Space
2. Dashboard calls `GET /api/spaces/{id}?wallet=0x...&signature=...`
3. Display:
   - Full transcript with speaker profiles
   - Metadata
   - "Unlock Chat" button (if not unlocked)

### 7.4 Unlock Chat

1. User clicks "Unlock Chat" (0.5 USDC)
2. Call `unlock-space-chat` entrypoint (x402 payment)
3. Payment processed
4. Chat interface becomes available

### 7.5 Chat with Space

1. User selects 1-3 Spaces to chat with
2. Calculates price: 0.9 + (0.1 * num_spaces) USDC
3. User types question
4. Call `chat-with-spaces` entrypoint (x402 payment)
5. Display answer with sources

---

## 8. Technology Stack

### Backend
- **Runtime**: Bun
- **Framework**: `@lucid-dreams/agent-kit` for paid APIs
- **Standard HTTP**: For free APIs (can use `Hono` or native Bun server)
- **Storage**: File system
- **AI**: OpenAI (Whisper + GPT-4o)
- **Payment**: x402 protocol

### Frontend
- **Framework**: Vanilla JS or React (TBD)
- **Wallet**: ethers.js / viem
- **Styling**: Tailwind CSS

### Infrastructure
- **Deployment**: Vercel / Railway / Render
- **Storage**: Local disk or cloud storage (S3/R2)

---

## 9. API Summary Table

| Endpoint | Type | Price | Auth Required | Purpose |
|----------|------|-------|---------------|---------|
| `format-twitter-space` | Paid (agent-kit) | 0.2 USDC | No (payment is auth) | Transcribe Space |
| `unlock-space-chat` | Paid (agent-kit) | 0.5 USDC | No (payment is auth) | Unlock chat for Space |
| `chat-with-spaces` | Paid (agent-kit) | 0.9 + 0.1n USDC | No (payment is auth) | Query Spaces with AI |
| `GET /api/spaces/mine` | Free | Free | Yes (wallet signature) | List user's Spaces |
| `GET /api/spaces/:id` | Free | Free | Yes (wallet signature) | Get Space details |
| `GET /api/spaces/search` | Free | Free | Yes (wallet signature) | Search Spaces |
| `GET /api/spaces/:id/chat-status` | Free | Free | Yes (wallet signature) | Check chat unlock status |
| `GET /` | Free | Free | No | Dashboard home |

---

## 10. Key Design Decisions

### Why separate Paid and Free APIs?

1. **x402 Payment** - Only paid operations use x402 protocol
2. **Performance** - Dashboard queries don't need payment overhead
3. **UX** - Users authenticate once with wallet, then browse freely
4. **Cost** - No need to pay for every data query

### Why async transcription processing?

1. **Long processing time** - Transcription takes 3-5 minutes
2. **Payment first** - Users pay upfront, check status later
3. **Scalability** - Can queue multiple jobs

### Why file-based storage (MVP)?

1. **Simplicity** - No database setup needed
2. **Fast deployment** - Easy to get started
3. **Migration path** - Can move to DB later if needed

---

## 11. Deployment Architecture

### Railway 部署配置（新架构）

#### 服务数量对比

| 架构 | 服务数量 | 月成本 | 配置复杂度 |
|-----|---------|-------|----------|
| **旧架构** | 4个 (DB + Agent + API + Worker) | $20 | 高 |
| **新架构** | 3个 (DB + App + Worker) | $15 | 中 |

**节省**: $5/月 (25%)

#### 新部署结构

```
Railway Project
├── PostgreSQL Database ($5/月)
├── App Service ($5/月)
│   └── src/index.ts (统一 Hono 应用)
│       ├── x402 付费 API
│       ├── 免费 HTTP API
│       └── 静态 Dashboard
└── Worker Service ($5/月)
    └── scripts/worker.ts (后台处理)
```

#### App Service 配置

**Start Command**: `bun run src/index.ts`

**环境变量**:
```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# x402 Payment
PRIVATE_KEY=0x...
PAY_TO=0x...
NETWORK=base
FACILITATOR_URL=https://facilitator.daydreams.systems

# AI Services
OPENAI_API_KEY=sk-...

# Twitter
TWITTER_COOKIES=[...]

# Server
PORT=8787
```

**特点**:
- ✅ 一个服务提供所有前端和后端功能
- ✅ 自动生成 Railway 域名
- ✅ 零 CORS 配置

#### Worker Service 配置

**Start Command**: `bun run scripts/worker.ts`

**环境变量**:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
WORKER_POLL_INTERVAL_MS=10000
```

### 本地开发环境

#### 启动命令简化

```bash
# 旧架构：需要启动 3 个服务
bun run dev           # Agent (8787)
bun run start:api     # API (3001)
bun run worker        # Worker

# 新架构：只需启动 2 个服务
bun run dev           # App (8787) - 包含所有前端和后端
bun run worker        # Worker
```

#### 统一端口访问

```bash
# 旧架构：多个 URL
http://localhost:8787  # Agent API
http://localhost:3001  # Free API
http://localhost:3000  # Dashboard

# 新架构：一个 URL
http://localhost:8787  # 所有功能
  ├── /entrypoints/*   # x402 API
  ├── /api/*           # Free API
  └── /                # Dashboard
```

---

## 12. Migration Path (旧架构 → 新架构)

### Phase 1: 代码重构 ✅

**目标**: 合并 `src/index.ts` 和 `src/api/server.ts`

**步骤**:
1. ✅ 修改 `src/index.ts` 使用 agent-kit 的 `afterMount`
2. ✅ 将 `src/api/routes/*` 的路由迁移到 `afterMount` 内
3. ✅ 添加静态文件服务（`serveStatic`）
4. ✅ 删除独立的 `src/api/server.ts`

### Phase 2: 测试验证 ⏳

**测试清单**:
- [ ] x402 付费 API 正常工作
- [ ] 免费 API endpoints 响应正确
- [ ] Dashboard 静态页面加载
- [ ] Worker 可以访问数据库
- [ ] 所有路由无 CORS 错误

### Phase 3: 部署更新 ⏳

**Railway 配置修改**:
1. 删除 "API Service"
2. 更新 "Agent Service" → "App Service"
3. 更新 Procfile 和 nixpacks.toml
4. 重新部署并验证

---

## 13. Future Enhancements

1. **Database Migration** - Move from files to PostgreSQL/MongoDB
2. **Search Optimization** - Full-text search with ElasticSearch
3. **Caching Layer** - Redis for frequently accessed Spaces
4. **Batch Processing** - Process multiple Spaces in parallel
5. **Analytics** - Track usage, popular Spaces, revenue
6. **API Rate Limiting** - Prevent abuse
7. **Space Sharing** - Users can share Spaces with others
8. **Multi-region Deployment** - Edge deployment with Cloudflare Workers
9. **WebSocket Support** - Real-time transcription progress
10. **Custom Domain** - Branded agent identity

---

## 14. Key Design Decisions

### Why agent-kit?

1. **x402 Protocol Built-in** - 无需手动实现支付验证
2. **Manifest 自动生成** - 符合 Agent-to-Agent 协议
3. **类型安全** - Zod schema 自动验证输入输出
4. **Multi-Runtime** - 同样代码可部署到 Hono, TanStack, Next.js
5. **On-Chain Identity** - ERC-8004 支持（未来可扩展）

### Why Unified Service?

1. **用户体验** - 一个域名，零配置
2. **开发效率** - 一套代码，一次部署
3. **成本优化** - 减少服务数量
4. **简化 CORS** - 同域请求无需配置
5. **维护简单** - 统一日志和监控

### Why Keep Worker Separate?

1. **资源隔离** - 转录任务消耗大量 CPU/内存
2. **可扩展性** - Worker 可独立扩展实例
3. **容错性** - Worker 崩溃不影响 API 服务
4. **灵活调度** - 可以使用不同的轮询策略

---

## Next Steps

### Immediate (本 session)
1. ✅ 分析 agent-kit 源码
2. ✅ 重写架构文档
3. ⏳ 重构 `src/index.ts` 实现统一服务
4. ⏳ 测试所有功能
5. ⏳ 更新 Railway 部署配置

### Short-term (下周)
1. 部署到 Railway 测试环境
2. 性能测试和优化
3. 编写 API 文档
4. 用户指南更新

### Long-term (下月)
1. PostgreSQL 迁移
2. 添加更多付费功能
3. 社区 feedback 收集
4. 扩展到更多 AI 功能
