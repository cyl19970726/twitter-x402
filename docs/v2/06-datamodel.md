# 核心数据模型

## 概览

本文档描述 v2 架构中的核心数据结构,包括:

1. **数据库表结构** - PostgreSQL 表 schema
2. **API 数据格式** - 请求和响应的 JSON 结构
3. **文件存储结构** - 音频和转录文件的组织方式

---

## 数据库表结构

### 1. spaces 表

存储 Twitter Space 转录任务的元数据。

```sql
CREATE TABLE spaces (
  id SERIAL PRIMARY KEY,
  space_id TEXT NOT NULL UNIQUE,           -- Twitter Space ID (从 URL 提取)
  space_url TEXT NOT NULL,                  -- 原始 Space URL
  title TEXT NOT NULL,                      -- Space 标题
  creator TEXT,                             -- 创建者用户名
  participants JSONB,                       -- 参与者列表 (JSON 数组)
  status TEXT NOT NULL DEFAULT 'pending',   -- 状态: pending, processing, completed, failed
  transcript_file_path TEXT,                -- 转录文件路径
  audio_duration_seconds INTEGER,           -- 音频时长(秒)
  processing_started_at TIMESTAMP,          -- 处理开始时间
  completed_at TIMESTAMP,                   -- 完成时间
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_status ON spaces(status);
CREATE INDEX idx_spaces_completed_at ON spaces(completed_at DESC);
```

**字段说明:**

- `space_id`: 唯一标识符,从 Space URL 中提取 (例: "1abcd...")
- `status` 状态流转:
  - `pending` → Worker 还未开始处理
  - `processing` → Worker 正在处理中
  - `completed` → 转录完成
  - `failed` → 处理失败
- `participants`: JSON 数组,格式: `["@user1", "@user2"]`
- `transcript_file_path`: 相对路径,例: `data/spaces/1abcd/transcript.md`

### 2. transcription_requests 表

记录用户支付转录请求的历史。

```sql
CREATE TABLE transcription_requests (
  id SERIAL PRIMARY KEY,
  space_id TEXT NOT NULL,                   -- 关联的 Space ID
  wallet_address TEXT NOT NULL,             -- 支付者钱包地址
  amount_usdc TEXT NOT NULL,                -- 支付金额 (USDC)
  transaction_hash TEXT,                    -- 链上交易哈希
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcription_requests_space_id ON transcription_requests(space_id);
CREATE INDEX idx_transcription_requests_wallet ON transcription_requests(wallet_address);
```

**用途:**
- 记录谁支付了哪个 Space 的转录费用
- 可用于统计、审计、反欺诈
- 注意: 同一个 Space 可能被多个用户重复支付(虽然第二次不会重新转录)

### 3. chat_payments 表

记录 AI 聊天的支付和对话历史。

```sql
CREATE TABLE chat_payments (
  id SERIAL PRIMARY KEY,
  space_id INTEGER NOT NULL,                -- 关联的 spaces.id
  wallet_address TEXT NOT NULL,             -- 支付者钱包地址
  question TEXT NOT NULL,                   -- 用户提问
  answer TEXT NOT NULL,                     -- AI 回答
  amount_usdc TEXT NOT NULL,                -- 支付金额 (USDC)
  transaction_hash TEXT,                    -- 链上交易哈希
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_payments_space_id ON chat_payments(space_id);
CREATE INDEX idx_chat_payments_wallet ON chat_payments(wallet_address);
```

**用途:**
- 记录完整的聊天历史
- 支付审计
- 数据分析(最常问的问题、使用最多的 Space 等)

---

## API 数据格式

### 1. POST /api/transcribe

**请求体:**

```typescript
interface TranscribeRequest {
  spaceUrl: string;  // Twitter Space URL
}
```

**示例:**
```json
{
  "spaceUrl": "https://twitter.com/i/spaces/1abcd..."
}
```

**响应 (成功):**

```typescript
interface TranscribeResponse {
  success: true;
  spaceId: string;      // Space ID
  status: string;       // 'pending' | 'processing' | 'completed'
  message: string;      // 描述信息
}
```

**示例:**
```json
{
  "success": true,
  "spaceId": "1abcd...",
  "status": "pending",
  "message": "转录任务已创建,预计 3-5 分钟完成"
}
```

**响应 (错误):**

```typescript
interface ErrorResponse {
  error: string;        // 错误信息
  code?: string;        // 错误代码
}
```

**示例:**
```json
{
  "error": "Invalid Space URL",
  "code": "INVALID_URL"
}
```

### 2. POST /api/chat

**请求体:**

```typescript
interface ChatRequest {
  spaceId: string;      // Space ID
  question: string;     // 用户问题
}
```

**示例:**
```json
{
  "spaceId": "1abcd...",
  "question": "这个 Space 讨论了哪些主要观点?"
}
```

**响应 (成功):**

```typescript
interface ChatResponse {
  success: true;
  answer: string;       // AI 回答 (Markdown 格式)
  spaceTitle: string;   // Space 标题
}
```

**示例:**
```json
{
  "success": true,
  "answer": "根据转录内容,这个 Space 主要讨论了:\n\n1. **Web3 支付协议**...",
  "spaceTitle": "Web3 支付的未来"
}
```

**响应 (错误):**

```typescript
interface ChatErrorResponse {
  error: string;
  code?: 'SPACE_NOT_FOUND' | 'SPACE_NOT_READY' | 'INVALID_REQUEST';
}
```

**示例:**
```json
{
  "error": "Space 转录尚未完成,请稍后再试",
  "code": "SPACE_NOT_READY"
}
```

### 3. GET /api/spaces

**查询参数:**

```typescript
interface SpacesQuery {
  limit?: number;      // 返回数量 (默认: 50, 最大: 100)
  offset?: number;     // 分页偏移 (默认: 0)
}
```

**响应:**

```typescript
interface SpacesResponse {
  spaces: Space[];
  total: number;       // 总数
}

interface Space {
  spaceId: string;
  title: string;
  creator: string | null;
  participants: string[];
  duration: number;    // 秒
  completedAt: string; // ISO 8601 格式
}
```

**示例:**
```json
{
  "spaces": [
    {
      "spaceId": "1abcd...",
      "title": "Web3 支付的未来",
      "creator": "@vitalik",
      "participants": ["@vitalik", "@naval", "@balajis"],
      "duration": 3600,
      "completedAt": "2025-11-15T10:30:00Z"
    }
  ],
  "total": 150
}
```

### 4. GET /api/spaces/[id]

**路径参数:**
- `id`: Space ID

**响应:**

```typescript
interface SpaceDetailResponse {
  space: {
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    completedAt: string | null;
  };
  transcript?: string;  // Markdown 格式的转录内容 (仅当 status=completed)
}
```

**示例:**
```json
{
  "space": {
    "spaceId": "1abcd...",
    "title": "Web3 支付的未来",
    "creator": "@vitalik",
    "participants": ["@vitalik", "@naval"],
    "duration": 3600,
    "status": "completed",
    "completedAt": "2025-11-15T10:30:00Z"
  },
  "transcript": "# Web3 支付的未来\n\n## 参与者\n- @vitalik\n- @naval\n\n## 对话\n\n**@vitalik**:..."
}
```

### 5. GET /api/spaces/[id]/status

**路径参数:**
- `id`: Space ID

**响应:**

```typescript
interface SpaceStatusResponse {
  spaceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;     // 0-100 (仅在 processing 时)
  message?: string;      // 状态描述
}
```

**示例 (处理中):**
```json
{
  "spaceId": "1abcd...",
  "status": "processing",
  "progress": 60,
  "message": "正在格式化转录..."
}
```

**示例 (完成):**
```json
{
  "spaceId": "1abcd...",
  "status": "completed",
  "message": "转录已完成"
}
```

---

## 文件存储结构

### 目录组织

```
data/
└── spaces/
    ├── 1abcd.../                 # Space ID 作为目录名
    │   ├── audio.m4a             # 原始音频文件
    │   ├── transcript.md         # 格式化的转录文本
    │   └── raw_transcript.txt    # 原始 Whisper 输出 (可选,用于调试)
    ├── 2efgh.../
    │   ├── audio.m4a
    │   └── transcript.md
    └── ...
```

### 转录文件格式 (transcript.md)

```markdown
# [Space 标题]

**创建者**: @username
**时长**: XX 分 XX 秒
**完成时间**: YYYY-MM-DD HH:mm:ss

## 参与者

- @user1
- @user2
- @user3

## 对话

**@user1** (00:00:15):
这是第一段发言内容...

**@user2** (00:02:30):
这是第二段回复...

**@user1** (00:05:10):
继续讨论...
```

**格式规范:**
- 使用 Markdown 格式
- 时间戳格式: `(HH:MM:SS)`
- 说话人使用 `**@username**`
- 段落之间空一行

---

## 数据关系图

```
┌────────────────────┐
│     spaces         │
│  (核心转录数据)     │
└──────┬─────────────┘
       │
       │ 1:N
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────────────┐  ┌─────────────────┐
│transcription_requests│  │  chat_payments  │
│  (转录支付记录)      │  │  (聊天支付记录) │
└──────────────────────┘  └─────────────────┘
```

**关系说明:**
- 一个 Space 可以有多个转录支付请求 (多人重复支付)
- 一个 Space 可以有多个聊天对话 (多人多次提问)
- `transcription_requests` 和 `chat_payments` 通过 `space_id` 关联到 `spaces`

---

## TypeScript 类型定义

### Database Types

```typescript
// lib/db/schema.ts
export interface Space {
  id: number;
  spaceId: string;
  spaceUrl: string;
  title: string;
  creator: string | null;
  participants: string[] | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptFilePath: string | null;
  audioDurationSeconds: number | null;
  processingStartedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptionRequest {
  id: number;
  spaceId: string;
  walletAddress: string;
  amountUsdc: string;
  transactionHash: string | null;
  createdAt: Date;
}

export interface ChatPayment {
  id: number;
  spaceId: number;
  walletAddress: string;
  question: string;
  answer: string;
  amountUsdc: string;
  transactionHash: string | null;
  createdAt: Date;
}
```

### API Types

```typescript
// lib/types/api.ts
export namespace API {
  // Transcribe
  export interface TranscribeRequest {
    spaceUrl: string;
  }

  export interface TranscribeResponse {
    success: true;
    spaceId: string;
    status: string;
    message: string;
  }

  // Chat
  export interface ChatRequest {
    spaceId: string;
    question: string;
  }

  export interface ChatResponse {
    success: true;
    answer: string;
    spaceTitle: string;
  }

  // Spaces List
  export interface SpacesResponse {
    spaces: SpaceListItem[];
    total: number;
  }

  export interface SpaceListItem {
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;
    completedAt: string;
  }

  // Space Detail
  export interface SpaceDetailResponse {
    space: SpaceDetail;
    transcript?: string;
  }

  export interface SpaceDetail {
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;
    status: string;
    completedAt: string | null;
  }

  // Error
  export interface ErrorResponse {
    error: string;
    code?: string;
  }
}
```

---

## 数据验证规则

### Space ID 验证

```typescript
function isValidSpaceId(spaceId: string): boolean {
  // Twitter Space ID 通常是 13 位字母数字组合
  return /^[a-zA-Z0-9]{13}$/.test(spaceId);
}
```

### Space URL 验证

```typescript
function extractSpaceId(url: string): string | null {
  const patterns = [
    /twitter\.com\/i\/spaces\/([a-zA-Z0-9]+)/,
    /x\.com\/i\/spaces\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
```

### 钱包地址验证

```typescript
import { isAddress } from 'viem';

function isValidWalletAddress(address: string): boolean {
  return isAddress(address);
}
```

---

## 索引优化建议

### 常用查询优化

**查询 1: 获取待处理任务**
```sql
SELECT * FROM spaces WHERE status = 'pending' ORDER BY created_at LIMIT 1;
```
索引: `CREATE INDEX idx_spaces_status_created ON spaces(status, created_at);`

**查询 2: 获取最新完成的 Spaces**
```sql
SELECT * FROM spaces WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 50;
```
索引: `CREATE INDEX idx_spaces_completed ON spaces(status, completed_at DESC);`

**查询 3: 查找用户的支付历史**
```sql
SELECT * FROM transcription_requests WHERE wallet_address = ? ORDER BY created_at DESC;
```
索引: `CREATE INDEX idx_transcription_wallet_created ON transcription_requests(wallet_address, created_at DESC);`

---

## 数据迁移

### 初始化数据库

```bash
# 1. 生成迁移文件
npm run db:generate

# 2. 应用迁移
npm run db:migrate

# 3. 查看迁移状态
npm run db:studio
```

### package.json scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```
