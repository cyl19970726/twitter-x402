# 技术架构设计

## 技术栈选型

### 核心决策：Next.js + x402-next

我们选择 **Next.js** 作为全栈框架，并使用 **x402-next** 进行支付集成，**抛弃 agent-kit (lucid-agents)**。

---

## 为什么选择 Next.js？

### Next.js vs Hono + React

| 维度 | Next.js | Hono + React | 决策 |
|------|---------|--------------|------|
| **x402 集成** | ✅ `x402-next` 官方支持 | ⚠️ 需要自己封装 | **Next.js** |
| **开发体验** | 🟢 统一全栈，一个 dev server | 🟡 前后端分离，两个 dev server | **Next.js** |
| **部署** | 🟢 Vercel 一键部署 | 🟡 前端 Vercel + 后端 Railway | **Next.js** |
| **API Routes** | 🟢 原生支持 | 🟢 Hono 原生支持 | 平手 |
| **Middleware** | 🟢 强大的中间件系统 | 🟡 需要手动配置 | **Next.js** |
| **SSR/SSG** | 🟢 支持（但我们不需要） | ❌ 不支持 | 平手 |
| **性能** | 🟡 中等 | 🟢 极快 | Hono 略胜 |
| **灵活性** | 🟡 框架约定多 | 🟢 完全自由 | Hono 略胜 |
| **学习曲线** | 🟡 App Router 需要学习 | 🟢 简单 | Hono 略胜 |

### 最终决策：**Next.js**

**核心原因：x402-next 的完美集成**

```typescript
// Next.js - 只需 3 行配置
import { paymentMiddleware } from 'x402-next';

export const middleware = paymentMiddleware(payTo, routes, facilitator);

// Hono - 需要自己实现
// 1. 检测 402 响应
// 2. 处理支付流程
// 3. 验证支付证明
// 4. 集成钱包连接
// ... 至少 200+ 行代码
```

**次要原因：**
1. **统一部署** - Vercel 一键部署，无需管理两个服务
2. **开发效率** - 一个项目，一个 dev server，类型完全共享
3. **成熟生态** - 大量文档和社区支持

---

## 为什么抛弃 agent-kit？

### agent-kit 的问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **过度设计** | 强制使用 entrypoint 模式 | 代码冗余，不灵活 |
| **文档不足** | Next.js 适配文档很少 | 集成困难，容易出错 |
| **锁定框架** | 绑定到 Hono/TanStack | 无法使用 Next.js 的优势 |
| **复杂性高** | 引入大量概念（manifest, runtime, etc.） | 学习曲线陡峭 |
| **不必要** | 我们只需要支付功能 | 其他功能用不上 |

### x402-next 的优势

```typescript
// ❌ agent-kit - 复杂
import { createAgentApp } from '@lucid-agents/hono';

const { app, addEntrypoint } = createAgentApp({ /* ... */ });

addEntrypoint({
  key: 'transcribe',
  price: '200000',
  input: z.object({ /* ... */ }),
  handler: async ({ input, payment }) => { /* ... */ }
});

// ✅ x402-next - 简单
import { paymentMiddleware } from 'x402-next';

export const middleware = paymentMiddleware(
  payTo,
  {
    '/api/transcribe': { price: '$0.20', network: 'base' }
  },
  { url: facilitatorUrl }
);
```

**优势总结：**
- ✅ **简单** - 只需配置 middleware
- ✅ **灵活** - 可以自由编写 API Route
- ✅ **原生** - 完全 Next.js 原生，无需适配
- ✅ **轻量** - 不引入不必要的概念

---

## 技术栈详细说明

### 1. 框架层

#### Next.js 15
- **App Router** - 使用最新的 App Router
- **Server Components** - 部分组件使用 Server Components
- **API Routes** - 处理所有 API 请求
- **Middleware** - x402 支付验证

**为什么选择 Next.js 15？**
- 最新版本，性能更好
- App Router 更灵活
- 内置优化（图片、字体等）

---

### 2. 支付层

#### x402-next
- **Middleware** - 自动处理 402 响应
- **支付验证** - 自动验证 EIP-3009 签名
- **Facilitator 集成** - 自动调用 facilitator

```typescript
// middleware.ts
import { paymentMiddleware, Network } from 'x402-next';

export const middleware = paymentMiddleware(
  process.env.PAY_TO_ADDRESS as Address,
  {
    '/api/transcribe': {
      price: '$0.20',
      network: 'base' as Network,
      config: {
        description: 'Transcribe Twitter Space',
      },
    },
    '/api/chat': {
      price: '$0.50',
      network: 'base' as Network,
      config: {
        description: 'AI Chat with Space',
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL,
  },
  {
    appName: 'Twitter Space Transcription',
    appLogo: '/logo.png',
  }
);

export const config = {
  matcher: ['/api/transcribe', '/api/chat'],
};
```

**为什么选择 x402-next？**
- ✅ Next.js 官方适配
- ✅ 自动处理支付流程
- ✅ 开箱即用，无需额外配置
- ✅ 文档完善

---

### 3. 数据库层

#### PostgreSQL + Drizzle ORM

**为什么选择 PostgreSQL？**

| 需求 | SQLite | PostgreSQL | 决策 |
|------|--------|------------|------|
| **并发写入** | ❌ 锁竞争 | ✅ MVCC | **PostgreSQL** |
| **Worker 安全** | ❌ 经常锁死 | ✅ 无问题 | **PostgreSQL** |
| **水平扩展** | ❌ 单文件 | ✅ 支持 | **PostgreSQL** |
| **生产环境** | ⚠️ 不推荐 | ✅ 成熟稳定 | **PostgreSQL** |
| **部署** | ⚠️ 需要 Volume | ✅ Railway 原生支持 | **PostgreSQL** |

**为什么选择 Drizzle ORM？**
- ✅ **TypeScript 优先** - 完全类型安全
- ✅ **轻量** - 性能接近原生 SQL
- ✅ **迁移管理** - 自动生成迁移文件
- ✅ **多数据库支持** - 可以切换到 MySQL 等

```typescript
// lib/db/schema.ts
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const spaces = pgTable('spaces', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  spaceId: text('space_id').notNull().unique(),
  spaceUrl: text('space_url').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('pending'),
  transcriptFilePath: text('transcript_file_path'),
  participants: text('participants'),  // JSON string
  audioDurationSeconds: integer('audio_duration_seconds'),
  createdAt: timestamp('created_at').defaultNow(),
  processingStartedAt: timestamp('processing_started_at'),
  completedAt: timestamp('completed_at'),
});
```

---

### 4. 前端层

#### React 19
- **最新版本** - 使用 React 19
- **Server Components** - 适当使用 Server Components
- **Client Components** - 交互部分使用 Client Components

#### Wallet 连接：RainbowKit
```typescript
// app/providers.tsx
'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Twitter Space Transcription',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**为什么选择 RainbowKit？**
- ✅ **行业标准** - Coinbase 推荐
- ✅ **美观** - 最好看的钱包连接 UI
- ✅ **多钱包支持** - MetaMask, Coinbase Wallet, WalletConnect
- ✅ **完美集成 x402** - 自动处理签名

#### UI 组件：shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea
```

**为什么选择 shadcn/ui？**
- ✅ **代码所有权** - 组件代码在项目里，可以自由修改
- ✅ **Tailwind 优先** - 完美配合 Tailwind CSS
- ✅ **高质量** - 美观且可访问性好
- ✅ **按需引入** - 只添加需要的组件

#### 样式：Tailwind CSS 4
```typescript
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#8B5CF6',
          pink: '#EC4899',
        },
      },
    },
  },
  plugins: [],
};
```

---

### 5. AI 层

#### OpenAI Agent SDK
```typescript
// lib/ai/agent.ts
import { Agent } from '@openai/agent-sdk';

export const agent = new Agent({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithSpace(params: {
  transcript: string;
  question: string;
  spaceTitle: string;
}) {
  const systemPrompt = `你是一个 Twitter Space 转录分析助手...`;

  const response = await agent.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: params.question },
    ],
  });

  return response.content;
}
```

**为什么选择 OpenAI Agent SDK？**
- ✅ **官方 SDK** - 最新功能支持
- ✅ **强大** - GPT-4o 性能优秀
- ✅ **简单** - API 简洁易用

---

### 6. 转录层

#### Whisper API
```typescript
// lib/transcription/whisper.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioPath: string) {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
  });

  return response.text;
}
```

#### GPT-4o Formatting
```typescript
// lib/transcription/format.ts
export async function formatTranscript(rawText: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: '识别说话人并格式化转录...',
      },
      {
        role: 'user',
        content: rawText,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

### 7. Worker 层

#### Bun Runtime
```typescript
// scripts/worker.ts
#!/usr/bin/env bun

import { startWorker } from '@/lib/worker';

startWorker();
```

**为什么选择 Bun？**
- ✅ **极快** - 比 Node.js 快 3-4x
- ✅ **内置工具** - test, bundle, install 等
- ✅ **兼容 Node.js** - 可以使用 npm 包

---

## 完整技术栈总结

### 核心技术

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Next.js | 15.x | 全栈框架 |
| **支付** | x402-next | latest | x402 支付集成 |
| **数据库** | PostgreSQL | 16 | 主数据库 |
| **ORM** | Drizzle ORM | latest | 类型安全 ORM |
| **前端** | React | 19 | UI 框架 |
| **钱包** | RainbowKit | 2.2+ | 钱包连接 |
| **UI** | shadcn/ui | latest | UI 组件 |
| **样式** | Tailwind CSS | 4 | CSS 框架 |
| **AI** | OpenAI Agent SDK | latest | AI 问答 |
| **转录** | Whisper API | latest | 语音转文字 |
| **格式化** | GPT-4o | latest | 文本格式化 |
| **Worker** | Bun | latest | 后台任务 |

### 开发工具

| 工具 | 用途 |
|------|------|
| **TypeScript** | 类型检查 |
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Husky** | Git Hooks |
| **Vercel** | 部署前端 |
| **Railway** | 部署 Worker + DB |

---

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                   │
│                   (Vercel Deployment)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  App Router                                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • / (Dashboard)                                 │  │
│  │  • /spaces/[id] (Space Detail + Chat)            │  │
│  │  • /spaces/[id]/processing (Progress)            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Middleware (x402-next)                          │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • 拦截 /api/transcribe                          │  │
│  │  • 拦截 /api/chat                                │  │
│  │  • 验证支付                                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Routes                                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • POST /api/transcribe (付费)                   │  │
│  │  • POST /api/chat (付费)                         │  │
│  │  • GET  /api/spaces (免费)                       │  │
│  │  • GET  /api/spaces/[id] (免费)                  │  │
│  │  • GET  /api/spaces/[id]/status (免费)           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Components                                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  • RainbowKit (Wallet)                           │  │
│  │  • shadcn/ui (UI)                                │  │
│  │  • Tailwind CSS (Style)                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────┬───────────────────────────────────────────┘
               │
               ├─────────────────┐
               │                 │
               ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  PostgreSQL DB   │  │  Worker Service   │
    │  (Railway)       │  │  (Railway)        │
    │                  │  │                  │
    │  • spaces        │  │  • 轮询任务      │
    │  • chat_payments │  │  • 下载音频      │
    │  • transcription │  │  • Whisper 转录  │
    │    _requests     │  │  • GPT-4o 格式化 │
    └──────────────────┘  └──────────────────┘
```

---

## 为什么这个架构是最佳选择？

### 1. 简单
- Next.js 统一全栈
- x402-next 自动处理支付
- 无需复杂的微服务

### 2. 高效
- Vercel 极速部署
- PostgreSQL 高性能
- Bun Worker 极快

### 3. 可扩展
- Next.js 可以轻松添加新页面
- PostgreSQL 支持水平扩展
- Worker 可以独立扩展

### 4. 开发体验好
- 一个项目
- 一个 dev server
- 类型完全共享
- 热更新全栈

### 5. 生产就绪
- Vercel 99.99% uptime
- PostgreSQL 成熟稳定
- 完善的监控和日志
