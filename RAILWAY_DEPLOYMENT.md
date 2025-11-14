# Railway 部署指南

## 🚀 部署架构

你需要创建 **4 个 Railway 服务**：

```
┌─────────────────────────────────────────┐
│         Railway Project                  │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Service 1: PostgreSQL Database  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Service 2: Agent (x402 API)     │   │
│  │  Port: 8787                      │   │
│  │  CMD: bun run src/index.ts       │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Service 3: API Server           │   │
│  │  Port: 3001                      │   │
│  │  CMD: bun run src/api/server.ts  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Service 4: Worker               │   │
│  │  CMD: bun run scripts/worker.ts  │   │
│  └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

---

## 步骤 1: 创建 Railway Project

### 1.1 安装 Railway CLI（可选）

```bash
npm install -g @railway/cli
railway login
```

或直接使用 Railway Web 界面：https://railway.app

### 1.2 在 Railway 创建新项目

1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 "Empty Project"
4. 命名项目：`twitter-space-platform`

---

## 步骤 2: 添加 PostgreSQL 数据库

### 2.1 添加数据库服务

1. 在项目中点击 "+ New"
2. 选择 "Database" → "PostgreSQL"
3. 等待数据库创建完成

### 2.2 获取数据库连接字符串

数据库创建后，Railway 会自动生成环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串

**记住这个变量！** 其他服务会引用它。

---

## 步骤 3: 准备代码（修改配置）

### 3.1 更新 Drizzle 配置使用 PostgreSQL

编辑 `drizzle.config.ts`：

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',  // 改为 postgresql
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### 3.2 更新数据库客户端

编辑 `src/db/client.ts`：

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';  // 改为 postgres-js
import postgres from 'postgres';  // 需要安装
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// 创建连接
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

console.log('✓ Database connected:', connectionString.split('@')[1]?.split('/')[0] || 'PostgreSQL');
```

### 3.3 安装 PostgreSQL 依赖

```bash
bun add postgres
```

### 3.4 提交更改

```bash
git add .
git commit -m "Configure for Railway PostgreSQL deployment"
git push
```

---

## 步骤 4: 部署 Service 2 - Agent (x402)

### 4.1 创建 Agent 服务

1. 点击 "+ New"
2. 选择 "GitHub Repo"
3. 连接你的仓库
4. 选择分支（通常是 `main`）

### 4.2 配置 Agent 服务

**Settings → General:**
- Service Name: `twitter-space-agent`
- Start Command: `bun run src/index.ts`

**Settings → Networking:**
- Generate Domain（会生成一个 URL，如 `twitter-space-agent.up.railway.app`）
- 端口会自动从 `PORT` 环境变量读取

### 4.3 设置环境变量

**Settings → Variables:**

```bash
# 必需变量
PRIVATE_KEY=你的钱包私钥
OPENAI_API_KEY=你的OpenAI密钥
TWITTER_COOKIES=[你的Twitter cookies JSON]

# 数据库（引用 PostgreSQL 服务）
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 网络配置
NETWORK=base
PAY_TO=你的收款地址
FACILITATOR_URL=https://facilitator.daydreams.systems

# 可选配置
PORT=8787
API_BASE_URL=https://twitter-space-agent.up.railway.app
DEFAULT_PRICE=200000
AUDIO_CHUNK_DURATION_MINUTES=10
```

**重要：** `${{Postgres.DATABASE_URL}}` 会自动引用数据库服务的连接字符串

### 4.4 部署

点击 "Deploy" 或推送代码触发自动部署。

查看日志确认启动成功：
```
✓ Database connected: PostgreSQL
🚀 Agent ready at https://twitter-space-agent.up.railway.app/.well-known/agent.json
```

### 4.5 运行迁移

部署成功后，运行一次性命令创建数据库表：

```bash
# 使用 Railway CLI
railway run bun run scripts/migrate.ts

# 或在 Railway Web 界面
# Settings → One-off Commands
# 输入: bun run scripts/migrate.ts
```

---

## 步骤 5: 部署 Service 3 - API Server

### 5.1 创建 API 服务

1. 点击 "+ New"
2. 选择 "GitHub Repo"（同一个仓库）
3. 选择分支

### 5.2 配置 API 服务

**Settings → General:**
- Service Name: `twitter-space-api`
- Start Command: `bun run src/api/server.ts`

**Settings → Networking:**
- Generate Domain（如 `twitter-space-api.up.railway.app`）

### 5.3 设置环境变量

```bash
# 数据库
DATABASE_URL=${{Postgres.DATABASE_URL}}

# API 配置
API_PORT=3001
CORS_ORIGIN=*

# 可选
LOG_LEVEL=info
```

### 5.4 部署并验证

查看日志确认：
```
✓ Database connected: PostgreSQL
🚀 Free API server started on http://0.0.0.0:3001
```

测试 API：
```bash
curl https://twitter-space-api.up.railway.app/health
```

---

## 步骤 6: 部署 Service 4 - Worker

### 6.1 创建 Worker 服务

1. 点击 "+ New"
2. 选择 "GitHub Repo"（同一个仓库）
3. 选择分支

### 6.2 配置 Worker 服务

**Settings → General:**
- Service Name: `twitter-space-worker`
- Start Command: `bun run scripts/worker.ts`

**重要：** Worker 不需要对外暴露端口，不要生成 Domain

### 6.3 设置环境变量

```bash
# 数据库
DATABASE_URL=${{Postgres.DATABASE_URL}}

# OpenAI
OPENAI_API_KEY=你的OpenAI密钥

# Twitter
TWITTER_COOKIES=[你的Twitter cookies JSON]

# Worker 配置
WORKER_POLL_INTERVAL_MS=10000
WORKER_MAX_RETRIES=3
WORKER_RETRY_DELAY_MS=60000

# 存储路径（Railway 持久化）
AUDIO_STORAGE_PATH=/data/audio
TRANSCRIPT_STORAGE_PATH=/data/transcripts

# 可选
LOG_LEVEL=info
```

### 6.4 添加持久化存储（可选）

如果需要保存音频和转录文件：

1. Settings → Volumes
2. 点击 "+ New Volume"
3. Mount Path: `/data`
4. 这样 `/data/audio` 和 `/data/transcripts` 会持久化

**或者：使用 S3/R2 存储**（推荐生产环境）

### 6.5 部署并验证

查看日志确认：
```
✓ Database connected: PostgreSQL
🚀 Worker started. Polling every 10000ms...
⏳ Waiting for jobs...
```

---

## 步骤 7: 部署前端（可选）

前端可以部署到：

### 选项 A: Vercel（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd public
vercel --prod
```

配置环境变量：
```bash
NEXT_PUBLIC_API_URL=https://twitter-space-api.up.railway.app
NEXT_PUBLIC_AGENT_URL=https://twitter-space-agent.up.railway.app
```

### 选项 B: Railway 静态服务

1. 创建新服务
2. Start Command: `cd public && python3 -m http.server $PORT`
3. 生成 Domain

---

## 步骤 8: 验证部署

### 8.1 测试 Agent

```bash
# Agent Manifest
curl https://twitter-space-agent.up.railway.app/.well-known/agent.json

# 测试端点（会返回支付要求）
curl -X POST https://twitter-space-agent.up.railway.app/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl":"https://twitter.com/i/spaces/1RDxlAoOeQRKL"}'
```

### 8.2 测试 API

```bash
curl https://twitter-space-api.up.railway.app/health
```

### 8.3 测试 Worker

在 Railway 日志中查看 Worker 是否轮询：
```
⏳ Waiting for jobs...
⏳ Waiting for jobs...
```

### 8.4 端到端测试

```bash
# 使用本地脚本测试生产环境
AGENT_URL=https://twitter-space-agent.up.railway.app \
  bun run scripts/test-direct.ts
```

---

## 步骤 9: 配置自定义域名（可选）

### Agent 域名

1. 进入 Agent 服务
2. Settings → Networking
3. Custom Domain → 添加你的域名
4. 按提示配置 DNS

### API 域名

同样的步骤为 API 服务配置域名

---

## 环境变量总结

### 🔒 所有服务共用（敏感）

```bash
PRIVATE_KEY=0x...
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### 🎯 Agent 特有

```bash
NETWORK=base
PAY_TO=0x...
FACILITATOR_URL=https://facilitator.daydreams.systems
PORT=8787
API_BASE_URL=https://your-domain.railway.app
```

### 🔓 API Server 特有

```bash
API_PORT=3001
CORS_ORIGIN=*
```

### ⚙️ Worker 特有

```bash
WORKER_POLL_INTERVAL_MS=10000
WORKER_MAX_RETRIES=3
WORKER_RETRY_DELAY_MS=60000
AUDIO_STORAGE_PATH=/data/audio
TRANSCRIPT_STORAGE_PATH=/data/transcripts
```

---

## 💰 成本估算

| 服务 | Railway 计划 | 月费 |
|------|-------------|------|
| PostgreSQL | Hobby | $5 |
| Agent | Hobby | $5 |
| API Server | Hobby | $5 |
| Worker | Hobby | $5 |
| **总计** | | **$20/月** |

**Hobby 计划包含：**
- 500 小时运行时间
- 512 MB RAM
- 1 GB 磁盘

**如需更多资源：**升级到 Pro 计划（$20/服务/月）

---

## 🔧 故障排查

### 问题 1: 数据库连接失败

**检查：**
```bash
# 在 Railway Shell 中测试
railway run bun run scripts/test-setup.ts
```

**解决：**
- 确认 `DATABASE_URL` 正确引用
- 检查数据库服务是否运行

### 问题 2: Worker 不处理任务

**检查：**
- Worker 日志是否显示轮询
- 数据库中是否有 pending jobs
- 环境变量是否完整

### 问题 3: Agent 404

**检查：**
- Start Command 是否正确
- PORT 环境变量
- Agent 日志

### 问题 4: 存储空间不足

**解决：**
- 添加 Volume（Railway 持久化存储）
- 或使用 S3/Cloudflare R2

---

## 📊 监控

### Railway 自带监控

- CPU 使用率
- 内存使用
- 网络流量
- 部署历史

### 日志查看

```bash
# 使用 CLI
railway logs --service agent
railway logs --service api
railway logs --service worker

# 或在 Web 界面查看
```

### 添加外部监控（可选）

- **Sentry** - 错误追踪
- **BetterStack** - 日志管理
- **Datadog** - 全面监控

---

## 🚀 自动部署

### GitHub Actions（推荐）

Railway 会自动检测 Git 推送并重新部署。

### 手动触发

```bash
# 使用 CLI
railway up

# 或在 Web 界面点击 "Deploy"
```

---

## 📝 部署检查清单

- [ ] PostgreSQL 数据库已创建
- [ ] 运行过数据库迁移
- [ ] Agent 服务部署成功
- [ ] API Server 部署成功
- [ ] Worker 部署成功
- [ ] 所有环境变量已配置
- [ ] Agent manifest 可访问
- [ ] API health check 返回 OK
- [ ] Worker 日志显示轮询
- [ ] 测试端到端流程
- [ ] 配置自定义域名（可选）
- [ ] 设置监控和告警

---

## 🆘 获取帮助

- Railway 文档: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- 项目 Issues: GitHub Issues

---

## 下一步

部署完成后：
1. 更新 `.env.example` 添加生产 URL
2. 更新 README.md 添加部署说明
3. 测试所有功能
4. 监控服务健康状态
5. 备份数据库
