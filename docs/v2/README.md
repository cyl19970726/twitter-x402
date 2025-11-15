# Twitter Space Transcription Platform - v2 文档

## 🎯 架构重构说明

**v2 的核心变化：**
- ✅ **抛弃 agent-kit (lucid-agents)** - 改用原生 x402-next
- ✅ **从 Hono + React 切换到 Next.js** - 统一全栈框架
- ✅ **PostgreSQL 替代 SQLite** - 生产环境就绪
- ✅ **OpenAI Agent SDK** - 更强大的 AI 问答
- ✅ **shadcn/ui** - 高质量 UI 组件

---

## 📚 文档导航

### 核心文档（按顺序阅读）

1. **[00-requirement.md](00-requirement.md)** - 产品需求
   - 产品定位
   - 核心功能（公开转录 + 付费 AI chat）
   - 用户故事
   - 关键指标

2. **[01-datastream.md](01-datastream.md)** - 数据流设计
   - 用户支付流（x402 支付转录/聊天）
   - Worker 转录任务流（后台异步处理）
   - Dashboard 显示流（公开浏览）
   - AI 聊天流（付费问答）

3. **[02-architect.md](02-architect.md)** - 技术架构
   - 为什么选择 Next.js？
   - 为什么抛弃 agent-kit？
   - 完整技术栈（Next.js + x402-next + PostgreSQL + RainbowKit + shadcn/ui）
   - 架构图

4. **[03-packages.md](03-packages.md)** - 项目结构
   - 目录组织
   - package.json 配置
   - 配置文件（next.config.ts, drizzle.config.ts, middleware.ts）
   - 环境变量
   - 开发和部署脚本

5. **[04-deploy.md](04-deploy.md)** - 部署指南
   - 部署架构（Vercel + Railway）
   - PostgreSQL 数据库部署
   - Next.js 应用部署
   - Worker 后台服务部署
   - 域名和 SSL 配置
   - 监控和日志
   - 成本优化

6. **[05-api.md](05-api.md)** - API 文档
   - 所有 API 端点详细说明
   - 请求/响应格式
   - x402 支付集成示例
   - 错误处理
   - 前端集成示例
   - 测试脚本

7. **[06-datamodel.md](06-datamodel.md)** - 数据模型
   - 数据库表结构（spaces, transcription_requests, chat_payments）
   - API 数据格式
   - 文件存储结构
   - TypeScript 类型定义
   - 数据验证规则
   - 索引优化

---

## 🚀 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone <repository-url>
cd twitter-space-transcription
bun install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入必需的环境变量
```

### 3. 启动数据库（本地开发）

```bash
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=spaces \
  -p 5432:5432 \
  postgres:16
```

### 4. 运行数据库迁移

```bash
bun run db:generate
bun run db:migrate
```

### 5. 启动开发服务器

```bash
# 终端 1 - Next.js App
bun run dev

# 终端 2 - Worker
bun run worker
```

### 6. 访问应用

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

---

## 🎨 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Next.js | 15.x | 全栈框架 |
| **支付** | x402-next | latest | x402 支付集成（替代 agent-kit） |
| **数据库** | PostgreSQL | 16 | 主数据库 |
| **ORM** | Drizzle ORM | latest | 类型安全 ORM |
| **前端** | React | 19 | UI 框架 |
| **钱包** | RainbowKit | 2.2+ | 钱包连接 |
| **UI** | shadcn/ui | latest | UI 组件库 |
| **样式** | Tailwind CSS | 4 | CSS 框架 |
| **AI** | OpenAI Agent SDK | latest | AI 问答 |
| **转录** | Whisper API | latest | 语音转文字 |
| **Worker** | Bun | latest | 后台任务 |

---

## 📁 项目结构

```
twitter-space-transcription/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Dashboard
│   ├── spaces/[id]/        # Space 详情页
│   └── api/                # API Routes
│       ├── transcribe/     # 付费转录
│       ├── chat/           # 付费聊天
│       └── spaces/         # 免费查询
├── components/             # React 组件
│   ├── ui/                 # shadcn/ui
│   ├── dashboard/          # Dashboard 组件
│   └── space/              # Space 组件
├── lib/                    # 核心库
│   ├── db/                 # 数据库
│   ├── transcription/      # 转录逻辑
│   ├── ai/                 # AI Agent
│   └── worker/             # Worker
├── scripts/                # 脚本
│   └── worker.ts           # Worker 启动脚本
├── middleware.ts           # x402 支付中间件
└── drizzle.config.ts       # 数据库配置
```

---

## 🔄 v1 → v2 迁移对比

| 方面 | v1 | v2 | 变化 |
|------|----|----|------|
| **框架** | Hono + React | Next.js | 统一全栈 |
| **支付** | agent-kit | x402-next | 更简单 |
| **数据库** | SQLite | PostgreSQL | 生产就绪 |
| **前端** | Vanilla React | Next.js + shadcn/ui | 更现代 |
| **部署** | Railway (3服务) | Vercel + Railway (2服务) | 更简单 |

---

## 🎯 核心改进

### 1. 支付集成简化

```typescript
// ❌ v1 - agent-kit（复杂）
import { createAgentApp } from '@lucid-agents/hono';
const { app, addEntrypoint } = createAgentApp(...);
addEntrypoint({ key: 'transcribe', price: '200000', ... });

// ✅ v2 - x402-next（简单）
import { paymentMiddleware } from 'x402-next';
export const middleware = paymentMiddleware(payTo, routes, facilitator);
```

### 2. 统一全栈

```typescript
// ❌ v1 - 前后端分离
// 前端: localhost:3000
// 后端: localhost:8787
// 需要配置 CORS

// ✅ v2 - 统一 Next.js
// 一个项目: localhost:3000
// 零 CORS 配置
```

### 3. 更好的 UI

```typescript
// ❌ v1 - 手写组件
<button className="bg-purple-600 hover:bg-purple-700 ...">

// ✅ v2 - shadcn/ui
<Button>转录</Button>  // 自动处理样式、可访问性等
```

---

## 📖 相关资源

### 官方文档
- [Next.js 15 文档](https://nextjs.org/docs)
- [x402 协议文档](https://docs.cdp.coinbase.com/x402)
- [RainbowKit 文档](https://rainbowkit.com)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Drizzle ORM 文档](https://orm.drizzle.team)

### 示例代码
- [x402 Next.js 示例](/Users/hhh0x/meme/agents/dreams/src/x402/examples/typescript/fullstack/next/)

---

## 🤝 贡献指南

参考 v1 文档的开发规范：`../v1/development/`

---

## 📝 下一步

阅读完文档后，开始实现：
1. 设置 Next.js 项目
2. 配置 x402-next middleware
3. 实现数据库 schema
4. 实现 API routes
5. 实现前端页面
6. 部署到 Vercel + Railway

详细步骤参考各个文档。
