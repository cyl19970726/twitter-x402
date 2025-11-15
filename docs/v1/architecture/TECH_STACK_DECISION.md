# 技术栈决策：Next.js vs Hono + React

## 产品需求确认

### 核心功能
1. **Dashboard（公开）** - 显示所有已转录的 spaces
2. **Space 详情页（公开）** - 查看转录文字稿
3. **转录新 space** - 付费（x402）
4. **AI Chat** - 付费（x402）

### 数据流
```
用户付费转录 (x402)
    ↓
记录到数据库 (status: pending)
    ↓
Worker 轮询 → 发现任务 → 转录 → 更新状态 (completed)
    ↓
Dashboard 显示（公开，任何人可见）
    ↓
用户点进 Space → 查看转录（公开，免费）
    ↓
用户想聊天 → 付费 (x402) → AI 问答
```

---

## Option A: Next.js (统一架构)

### 项目结构
```
app/
├── (routes)/
│   ├── page.tsx                    # Dashboard
│   ├── spaces/
│   │   └── [id]/
│   │       └── page.tsx            # Space 详情 + Chat
│   └── api/
│       ├── entrypoints/            # x402 付费接口
│       │   ├── transcribe-space/route.ts
│       │   └── chat-with-space/route.ts
│       └── spaces/
│           ├── route.ts            # GET /api/spaces
│           └── [id]/route.ts       # GET /api/spaces/:id
├── components/
│   ├── Dashboard.tsx
│   ├── SpaceDetail.tsx
│   └── ChatInterface.tsx
└── lib/
    ├── db/                         # Drizzle ORM
    ├── services/                   # 业务逻辑
    └── x402/                       # x402 集成
```

### agent-kit 在 Next.js 中的集成

**问题**: agent-kit 官方示例主要是 Hono/TanStack Start，Next.js 支持如何？

查看 agent-kit 源码：
```typescript
// @lucid-agents/next 包
import { createNextRouteHandler } from '@lucid-agents/next';

// app/api/entrypoints/[...path]/route.ts
export const { GET, POST } = createNextRouteHandler({
  entrypoints: [transcribeSpace, chatWithSpace],
  config: {
    payments: {
      payTo: process.env.PAY_TO!,
      network: 'base',
    }
  }
});
```

### ✅ 优点
1. **统一部署** - 一个 Vercel 项目搞定
2. **SSR/SSG** - Dashboard 可以预渲染，更快
3. **代码共享** - 类型、工具函数完全共享
4. **开发体验** - 一个 dev server，热更新全栈
5. **SEO 友好** - 转录内容可以被搜索引擎索引

### ❌ 缺点
1. **agent-kit 集成复杂** - 需要用 `@lucid-agents/next`，文档较少
2. **较重** - Next.js 打包体积大
3. **学习曲线** - App Router + Server Components 需要理解
4. **灵活性低** - 框架约定多

---

## Option B: Hono + React (当前架构)

### 项目结构
```
backend/ (Hono)
├── src/
│   ├── agent/
│   │   ├── entrypoints/
│   │   │   ├── transcribeSpace.ts
│   │   │   └── chatWithSpace.ts
│   │   └── agent.ts                # Hono app
│   ├── api/
│   │   └── routes/
│   │       └── spaces.ts           # GET /api/spaces
│   ├── db/
│   ├── services/
│   └── worker/
└── index.ts

frontend/ (React + Vite)
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── SpaceDetail.tsx
│   ├── components/
│   │   └── ChatInterface.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── usePayment.ts
│   └── lib/
│       └── api.ts                  # API client
└── index.html
```

### agent-kit 在 Hono 中的集成

```typescript
// src/agent/agent.ts - 完美支持
import { createAgentApp } from '@lucid-agents/hono';

const { app, addEntrypoint } = createAgentApp({ /* ... */ });

addEntrypoint(transcribeSpace);
addEntrypoint(chatWithSpace);

// 添加免费 API
app.get('/api/spaces', async (c) => { /* ... */ });
app.get('/api/spaces/:id', async (c) => { /* ... */ });

export default app;
```

### ✅ 优点
1. **agent-kit 原生支持** - `@lucid-agents/hono` 是官方首推
2. **极快** - Hono 是最快的 Node.js 框架之一
3. **极轻** - 核心只有 10KB
4. **灵活** - 前后端完全解耦
5. **简单** - 没有复杂的框架约定
6. **Worker 独立** - 可以单独扩展

### ❌ 缺点
1. **两个项目** - 需要管理两个代码库（或 monorepo）
2. **CORS** - 需要配置跨域
3. **部署** - 需要部署两个服务（前端 Vercel，后端 Railway）
4. **SSR** - 没有服务端渲染（但我们不需要）

---

## 对比分析

| 维度 | Next.js | Hono + React | 推荐 |
|------|---------|--------------|------|
| **agent-kit 集成** | ⚠️ 需要 @lucid-agents/next | ✅ 原生支持 @lucid-agents/hono | **Hono** |
| **x402 支付** | ⚠️ 文档少，需要研究 | ✅ 官方示例多 | **Hono** |
| **性能** | 🟡 中等（SSR 开销） | 🟢 极快 | **Hono** |
| **开发体验** | 🟢 统一 dev server | 🟡 两个 dev server | **Next.js** |
| **部署** | 🟢 一键部署 Vercel | 🟡 前端 Vercel + 后端 Railway | **Next.js** |
| **SEO** | 🟢 SSR/SSG 优秀 | ⚠️ CSR only | **Next.js** |
| **灵活性** | 🟡 框架约定多 | 🟢 完全自由 | **Hono** |
| **学习曲线** | 🔴 较陡（App Router） | 🟢 简单 | **Hono** |
| **代码共享** | 🟢 完全共享 | 🟡 需要配置 | **Next.js** |
| **Worker 隔离** | ⚠️ 需要单独部署 | 🟢 天然分离 | **Hono** |

---

## 决策

### 我的推荐：**Hono + React**（继续当前架构）

### 理由

#### 1. agent-kit 最佳实践
```typescript
// ✅ Hono - 官方文档主推
import { createAgentApp } from '@lucid-agents/hono';

// ⚠️ Next.js - 文档较少，可能有坑
import { createNextRouteHandler } from '@lucid-agents/next';
```

agent-kit 的所有示例和最佳实践都是基于 Hono，使用 Next.js 会遇到更多未知问题。

#### 2. x402 支付集成简单
Hono 版本的 x402 集成已经在 lucid-agents 仓库中验证过，稳定可靠。

#### 3. Worker 天然分离
```
Hono App (8787)          Worker (独立进程)
     ↓                        ↓
  数据库 ← ← ← ← ← ← ← ← 数据库
```
Worker 可以独立扩展，不会影响 API 服务。

#### 4. 我们不需要 SSR
- Dashboard 是动态数据（转录状态实时变化）
- Space 详情可以用 CSR 渲染（首屏速度够快）
- 不需要 SEO（私有工具，不需要 Google 收录）

#### 5. 部署也很简单
```bash
# 前端 - Vercel
cd frontend && vercel deploy

# 后端 - Railway
git push railway main
```

虽然是两个服务，但部署都很简单。

---

## 最终架构

### 统一 Hono Service (8787)

```typescript
// src/index.ts
import { createAgentApp } from '@lucid-agents/hono';
import { serveStatic } from 'hono/bun';
import transcribeSpace from './agent/entrypoints/transcribeSpace';
import chatWithSpace from './agent/entrypoints/chatWithSpace';

const { app, addEntrypoint } = createAgentApp({
  name: 'twitter-space-agent',
  config: {
    payments: {
      payTo: process.env.PAY_TO!,
      network: 'base',
      facilitatorUrl: 'https://facilitator.daydreams.systems',
    }
  }
});

// ✅ x402 付费接口（agent-kit 自动处理）
addEntrypoint(transcribeSpace);    // POST /entrypoints/transcribe-space/invoke
addEntrypoint(chatWithSpace);      // POST /entrypoints/chat-with-space/invoke

// ✅ 免费查询接口
app.get('/api/spaces', async (c) => {
  const spaces = await getAllCompletedSpaces();
  return c.json({ spaces });
});

app.get('/api/spaces/:id', async (c) => {
  const spaceId = c.req.param('id');
  const space = await getSpaceBySpaceId(spaceId);

  if (!space || space.status !== 'completed') {
    return c.json({ error: 'Space not found or not ready' }, 404);
  }

  // 返回转录内容（公开）
  const transcript = await readTranscriptFile(space.transcriptFilePath);
  return c.json({
    spaceId: space.spaceId,
    title: space.title,
    transcript,
    participants: JSON.parse(space.participants || '[]'),
  });
});

app.get('/api/spaces/:id/status', async (c) => {
  const spaceId = c.req.param('id');
  const space = await getSpaceBySpaceId(spaceId);

  return c.json({
    status: space?.status || 'not_found',
    progress: calculateProgress(space),
  });
});

// ✅ 服务前端静态文件
app.get('/*', serveStatic({ root: './public/app' }));

export default app;
```

### 前端页面（React + Vite）

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/spaces/:id" element={<SpaceDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
```

```typescript
// frontend/src/pages/Dashboard.tsx
export function Dashboard() {
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    // 公开接口，不需要认证
    fetch('/api/spaces')
      .then(res => res.json())
      .then(data => setSpaces(data.spaces));
  }, []);

  return (
    <div>
      <h1>Twitter Space 转录库</h1>
      <div className="grid">
        {spaces.map(space => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
      <TranscribeButton />  {/* 付费转录新 space */}
    </div>
  );
}
```

```typescript
// frontend/src/pages/SpaceDetail.tsx
export function SpaceDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);

  useEffect(() => {
    // 公开接口，不需要认证
    fetch(`/api/spaces/${id}`)
      .then(res => res.json())
      .then(data => setSpace(data));
  }, [id]);

  return (
    <div>
      <h1>{space?.title}</h1>

      {/* 转录内容（公开） */}
      <div className="transcript">
        {space?.transcript}
      </div>

      {/* AI 聊天（需要付费） */}
      <ChatInterface spaceId={id} />
    </div>
  );
}
```

```typescript
// frontend/src/components/ChatInterface.tsx
export function ChatInterface({ spaceId }: { spaceId: string }) {
  const [question, setQuestion] = useState('');
  const { invokeEntrypoint, isProcessing } = usePayment();

  const handleChat = async () => {
    // 调用 x402 付费接口
    const result = await invokeEntrypoint('chat-with-space', {
      spaceId,
      question,
    });

    // 显示回答
    setAnswer(result.answer);
  };

  return (
    <div className="chat-interface">
      <h2>AI 问答</h2>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="问这个 Space 任何问题..."
      />
      <button onClick={handleChat} disabled={isProcessing}>
        {isProcessing ? '处理中...' : '提问（0.5 USDC）'}
      </button>
    </div>
  );
}
```

---

## Worker 设计

```typescript
// src/worker/transcriptionWorker.ts
export async function startWorker() {
  console.log('🚀 Worker started');

  while (true) {
    try {
      // 1. 从数据库查找 pending 任务
      const job = await db
        .select()
        .from(spaces)
        .where(eq(spaces.status, 'pending'))
        .orderBy(spaces.createdAt)
        .limit(1);

      if (job[0]) {
        console.log(`Processing space: ${job[0].spaceId}`);

        // 2. 更新状态为 processing
        await db
          .update(spaces)
          .set({ status: 'processing', processingStartedAt: new Date() })
          .where(eq(spaces.id, job[0].id));

        // 3. 转录
        const result = await formatSpaceFromUrl(job[0].spaceUrl);

        // 4. 保存文件
        await saveTranscript(job[0].spaceId, result);

        // 5. 更新状态为 completed
        await db
          .update(spaces)
          .set({
            status: 'completed',
            completedAt: new Date(),
            transcriptFilePath: `data/spaces/${job[0].spaceId}/transcript.md`,
            participants: JSON.stringify(result.participants),
          })
          .where(eq(spaces.id, job[0].id));

        console.log(`✓ Completed: ${job[0].spaceId}`);
      }
    } catch (error) {
      console.error('Worker error:', error);
    }

    // 6. 等待 10 秒再检查
    await sleep(10000);
  }
}
```

---

## 部署架构

```
┌─────────────────────────────────┐
│  Vercel (Frontend)              │
│  https://spaces.vercel.app      │
│                                 │
│  - React App (CSR)              │
│  - 构建产物：static files        │
└────────────┬────────────────────┘
             │
             │ API 请求
             ▼
┌─────────────────────────────────┐
│  Railway (Backend)              │
│  https://api.railway.app        │
│                                 │
│  Service 1: Hono App            │
│    - x402 付费接口              │
│    - 免费查询接口                │
│    - Port: 8787                 │
│                                 │
│  Service 2: Worker              │
│    - 转录队列处理                │
│    - 独立进程                    │
│                                 │
│  Service 3: PostgreSQL          │
│    - 数据库                      │
└─────────────────────────────────┘
```

### 环境变量配置

```bash
# Vercel (Frontend)
VITE_API_URL=https://api.railway.app
VITE_WALLETCONNECT_PROJECT_ID=xxx

# Railway Hono App
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
PAY_TO=0x...
PRIVATE_KEY=0x...
NETWORK=base
PORT=8787

# Railway Worker
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
```

---

## 总结

**✅ 推荐：Hono + React**

**理由**：
1. agent-kit 原生支持，稳定可靠
2. x402 集成简单，文档完善
3. 性能极佳，轻量灵活
4. Worker 天然分离，易于扩展
5. 我们不需要 SSR

**下一步**：
1. 简化数据库 schema（去掉复杂的权限表）
2. 实现 2 个 x402 付费接口
3. 实现公开的查询接口
4. 优化 Worker
5. 部署到 Railway + Vercel
