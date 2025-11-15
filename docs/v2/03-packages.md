# 项目结构与包管理

## 项目组织方式

我们使用 **单一 Next.js 项目** + **独立 Worker 脚本**，不使用 Monorepo。

### 为什么不用 Monorepo？

| 需求 | Monorepo | 单一项目 | 决策 |
|------|----------|---------|------|
| **代码共享** | 🟢 包之间共享 | 🟢 Next.js 内共享 | 不需要 |
| **部署独立性** | 🟢 可以独立部署 | 🟡 Worker 需要单独配置 | 可接受 |
| **复杂度** | 🔴 需要配置 workspace | 🟢 简单 | **单一项目** |
| **工具链** | 🔴 需要 Turborepo/Nx | 🟢 原生 Next.js | **单一项目** |

**结论：单一项目足够简单且满足需求**

---

## 项目目录结构

```
twitter-space-transcription/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # 路由组
│   │   ├── page.tsx              # Dashboard (/)
│   │   └── spaces/
│   │       └── [id]/
│   │           ├── page.tsx      # Space 详情
│   │           └── processing/
│   │               └── page.tsx  # 转录进度页
│   ├── api/                      # API Routes
│   │   ├── transcribe/
│   │   │   └── route.ts          # POST /api/transcribe (付费)
│   │   ├── chat/
│   │   │   └── route.ts          # POST /api/chat (付费)
│   │   └── spaces/
│   │       ├── route.ts          # GET /api/spaces (免费)
│   │       └── [id]/
│   │           ├── route.ts      # GET /api/spaces/[id]
│   │           └── status/
│   │               └── route.ts  # GET /api/spaces/[id]/status
│   ├── layout.tsx                # Root Layout
│   ├── globals.css               # 全局样式
│   └── providers.tsx             # Context Providers
│
├── components/                   # React 组件
│   ├── ui/                       # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── textarea.tsx
│   ├── dashboard/
│   │   ├── SpaceCard.tsx
│   │   ├── SpaceGrid.tsx
│   │   └── TranscribeModal.tsx
│   └── space/
│       ├── SpaceHeader.tsx
│       ├── TranscriptView.tsx
│       └── ChatInterface.tsx
│
├── lib/                          # 核心库
│   ├── db/                       # 数据库
│   │   ├── client.ts             # Drizzle 客户端
│   │   ├── schema/               # Schema 定义
│   │   │   ├── spaces.ts
│   │   │   ├── payments.ts
│   │   │   └── index.ts
│   │   └── migrations/           # SQL migrations
│   │       └── 0000_initial.sql
│   ├── transcription/            # 转录逻辑
│   │   ├── download.ts           # 下载 Space 音频
│   │   ├── whisper.ts            # Whisper API 调用
│   │   ├── format.ts             # GPT-4o 格式化
│   │   └── pipeline.ts           # 完整流程封装
│   ├── ai/                       # AI 相关
│   │   └── agent.ts              # OpenAI Agent SDK
│   ├── worker/                   # Worker 逻辑
│   │   └── transcription.ts      # 转录 Worker
│   └── utils/                    # 工具函数
│       ├── extractSpaceId.ts
│       ├── formatDuration.ts
│       └── sleep.ts
│
├── hooks/                        # React Hooks
│   ├── useWallet.ts              # 钱包连接
│   ├── useSpaces.ts              # Spaces 数据
│   └── useChat.ts                # AI 聊天
│
├── scripts/                      # 独立脚本
│   ├── worker.ts                 # Worker 启动脚本
│   ├── migrate.ts                # 运行数据库迁移
│   └── seed.ts                   # 种子数据
│
├── public/                       # 静态资源
│   ├── logo.png
│   └── favicon.ico
│
├── data/                         # 数据存储（gitignore）
│   └── spaces/
│       └── [space_id]/
│           ├── audio.m4a
│           └── transcript.md
│
├── middleware.ts                 # Next.js Middleware (x402)
├── drizzle.config.ts             # Drizzle ORM 配置
├── next.config.ts                # Next.js 配置
├── tailwind.config.ts            # Tailwind CSS 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 依赖管理
├── .env.local                    # 环境变量（gitignore）
├── .env.example                  # 环境变量示例
└── README.md                     # 项目文档
```

---

## package.json

### 完整配置

```json
{
  "name": "twitter-space-transcription",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "worker": "bun run scripts/worker.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run scripts/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.2.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "@rainbow-me/rainbowkit": "^2.2.9",
    "wagmi": "^2.19.4",
    "viem": "^2.21.26",
    "@tanstack/react-query": "^5.90.9",

    "x402-next": "^0.7.0",
    "@coinbase/x402": "^0.7.0",

    "drizzle-orm": "^0.30.0",
    "postgres": "^3.4.3",

    "@openai/agent-sdk": "^1.0.0",
    "openai": "^4.0.0",

    "@pacoyang/agent-twitter-client": "^0.0.18",

    "zod": "^3.22.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",

    "drizzle-kit": "^0.20.0",

    "tailwindcss": "^4.1.17",
    "@tailwindcss/postcss": "^4.1.17",
    "postcss": "^8",
    "autoprefixer": "^10",

    "eslint": "^9",
    "eslint-config-next": "^15.2.4",
    "prettier": "^3.5.2",

    "@svgr/webpack": "^8.1.0"
  }
}
```

### 依赖说明

#### 核心框架
- **next** - Next.js 15 框架
- **react** & **react-dom** - React 19

#### 钱包和支付
- **@rainbow-me/rainbowkit** - 钱包连接 UI
- **wagmi** - React Hooks for Ethereum
- **viem** - 以太坊客户端库
- **@tanstack/react-query** - 数据获取和缓存
- **x402-next** - x402 支付中间件
- **@coinbase/x402** - x402 核心库

#### 数据库
- **drizzle-orm** - TypeScript ORM
- **postgres** - PostgreSQL 客户端
- **drizzle-kit** - 迁移工具（dev）

#### AI
- **@openai/agent-sdk** - OpenAI Agent SDK
- **openai** - OpenAI API 客户端

#### Twitter
- **@pacoyang/agent-twitter-client** - Twitter Space 下载

#### 工具
- **zod** - Schema 验证
- **clsx** & **tailwind-merge** - 样式合并

---

## 配置文件

### 1. next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    // SVGR 支持
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_FACILITATOR_URL: process.env.NEXT_PUBLIC_FACILITATOR_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },

  // 图片优化
  images: {
    domains: ['pbs.twimg.com'], // Twitter 头像
  },
};

export default nextConfig;
```

---

### 2. drizzle.config.ts

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

---

### 3. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

---

### 4. tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
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
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

### 5. middleware.ts

```typescript
import { Address } from 'viem';
import { paymentMiddleware, Network } from 'x402-next';

const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL!;
const payTo = process.env.RESOURCE_WALLET_ADDRESS as Address;
const network = process.env.NETWORK as Network;

export const middleware = paymentMiddleware(
  payTo,
  {
    '/api/transcribe': {
      price: '$0.20',
      network,
      config: {
        description: 'Transcribe Twitter Space',
      },
    },
    '/api/chat': {
      price: '$0.50',
      network,
      config: {
        description: 'AI Chat with Space',
      },
    },
  },
  {
    url: facilitatorUrl,
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

---

## 环境变量

### .env.example

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spaces

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Twitter
TWITTER_COOKIES=[{"name":"auth_token","value":"..."}]

# x402 Payment
RESOURCE_WALLET_ADDRESS=0x...
PRIVATE_KEY=0x...
NETWORK=base
NEXT_PUBLIC_FACILITATOR_URL=https://facilitator.daydreams.systems

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Storage
STORAGE_ROOT=./data

# Worker (可选)
WORKER_POLL_INTERVAL_MS=10000
AUDIO_CHUNK_DURATION_MINUTES=10
```

### 环境变量说明

| 变量 | 用途 | 必需 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | ✅ | `postgresql://...` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | ✅ | `sk-proj-...` |
| `TWITTER_COOKIES` | Twitter 认证 cookies | ✅ | `[{...}]` |
| `RESOURCE_WALLET_ADDRESS` | 收款钱包地址 | ✅ | `0x...` |
| `PRIVATE_KEY` | 钱包私钥（仅 Worker） | ✅ | `0x...` |
| `NETWORK` | 区块链网络 | ✅ | `base` |
| `NEXT_PUBLIC_FACILITATOR_URL` | Facilitator URL | ✅ | `https://...` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect ID | ✅ | `...` |
| `STORAGE_ROOT` | 文件存储路径 | ❌ | `./data` |
| `WORKER_POLL_INTERVAL_MS` | Worker 轮询间隔 | ❌ | `10000` |

---

## 开发脚本

### 本地开发

```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 3. 启动数据库（Docker）
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=spaces \
  -p 5432:5432 \
  postgres:16

# 4. 运行数据库迁移
bun run db:generate
bun run db:migrate

# 5. 启动开发服务器
bun run dev

# 6. 启动 Worker（新终端）
bun run worker
```

### 生产构建

```bash
# 构建
bun run build

# 启动
bun run start
```

---

## 部署配置

### Vercel (Next.js App)

```bash
# 部署到 Vercel
vercel deploy --prod
```

**环境变量配置（Vercel Dashboard）：**
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `TWITTER_COOKIES`
- `RESOURCE_WALLET_ADDRESS`
- `NETWORK`
- `NEXT_PUBLIC_FACILITATOR_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

---

### Railway (Worker + PostgreSQL)

#### Service 1: PostgreSQL
- 使用 Railway 的 PostgreSQL 模板
- 复制 `DATABASE_URL` 到 Vercel

#### Service 2: Worker
```bash
# Start Command
bun run worker

# 环境变量
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
PRIVATE_KEY=0x...
```

---

## shadcn/ui 组件

### 安装

```bash
# 初始化
npx shadcn@latest init

# 选择配置
✔ Which style would you like to use? › Default
✔ Which color would you like to use as base color? › Slate
✔ Would you like to use CSS variables for colors? › yes

# 添加组件
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add dialog
npx shadcn@latest add toast
```

### 使用

```typescript
// components/dashboard/TranscribeModal.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function TranscribeModal() {
  return (
    <Dialog>
      <DialogContent>
        <Input placeholder="Space URL..." />
        <Button>转录</Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 数据库迁移

### 生成迁移

```bash
# 修改 schema 后
bun run db:generate
```

### 运行迁移

```bash
# 本地
bun run db:migrate

# 生产环境（Railway）
# 使用 Railway CLI
railway run bun run db:migrate
```

---

## 总结

### 项目特点
- ✅ **单一项目** - 简单明了
- ✅ **Next.js 15** - 最新最快
- ✅ **TypeScript** - 完全类型安全
- ✅ **shadcn/ui** - 高质量组件
- ✅ **Drizzle ORM** - 类型安全的数据库操作

### 开发体验
- 🚀 一个 dev server
- 🚀 热更新
- 🚀 类型提示完善
- 🚀 代码组织清晰

### 部署简单
- Vercel 一键部署 Next.js
- Railway 托管 Worker + DB
- 环境变量清晰明确
