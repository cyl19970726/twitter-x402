# 快速启动指南

## 前置准备

### 1. 检查环境变量

确保 `.env` 文件已配置（如果没有，复制 `.env.example`）：

```bash
# 检查 .env 是否存在
ls -la .env

# 如果不存在，复制示例文件
cp .env.example .env
```

**必需的环境变量：**
- `PRIVATE_KEY` - 钱包私钥
- `TWITTER_COOKIES` - Twitter 认证 cookies
- `OPENAI_API_KEY` - OpenAI API 密钥

**可选的环境变量（使用默认值）：**
- `DATABASE_URL` - 默认：`./data/database/spaces.db`
- `API_PORT` - 默认：`3001`
- `PORT` - 默认：`8787`

### 2. 初始化数据库

```bash
# 运行数据库迁移
bun run scripts/migrate.ts
```

你应该看到：
```
✅ Database connected: ./data/database/spaces.db
🔄 Running migrations...
✅ Migrations completed successfully!
```

### 3. 验证安装

```bash
# 检查 TypeScript 编译
bun run typecheck

# 运行单元测试
bun test:unit
```

---

## 启动服务

系统需要启动 **3 个服务**。推荐使用 **3 个终端窗口**：

### 终端 1: 启动 x402 Agent（付费 API）

```bash
bun run dev
```

**预期输出：**
```
✅ Database connected: ./data/database/spaces.db
🚀 Agent server started on http://localhost:8787
📋 Agent manifest: http://localhost:8787/.well-known/agent.json
```

**验证：**
```bash
# 在新终端中测试
curl http://localhost:8787/.well-known/agent.json
```

应该返回 agent 清单，包含 3 个 entrypoints：
- `transcribe-space` (0.2 USDC)
- `unlock-space-chat` (0.5 USDC)
- `chat-with-spaces` (0.9 + 0.1n USDC)

---

### 终端 2: 启动免费 API Server

```bash
bun run src/api/server.ts
```

**预期输出：**
```
✅ Database connected: ./data/database/spaces.db
🚀 Free API server started on http://localhost:3001
📝 CORS enabled for: http://localhost:3000
```

**验证：**
```bash
# 测试健康检查
curl http://localhost:3001/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "database": "connected"
}
```

---

### 终端 3: 启动 Background Worker

```bash
bun run worker
```

**预期输出：**
```
✅ Database connected: ./data/database/spaces.db
🚀 Worker started. Polling every 10000ms...
⏳ Waiting for jobs...
```

Worker 会每 10 秒轮询一次队列，处理待转录的 Spaces。

---

## 测试流程

### 测试 1: 运行单元测试

```bash
# 所有测试
bun test

# 仅单元测试
bun test:unit

# 仅集成测试
bun test:integration
```

**预期结果：**
```
✓ 11 tests pass (unit tests)
```

---

### 测试 2: 测试付费 API（需要支付）

**2.1 测试转录 Space**

```bash
curl -X POST http://localhost:8787/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "title": "Test Space"
  }'
```

**注意：** 这需要 x402 支付（0.2 USDC）。如果没有配置支付，会返回支付要求。

**无支付测试（仅验证代码）：**
- 查看 `src/agent/entrypoints/transcribeSpace.ts`
- 检查输入验证逻辑

---

### 测试 3: 测试免费 API（需要 Mock 认证）

免费 API 需要钱包签名认证。为了测试，我们可以：

**选项 A: 使用浏览器 + MetaMask**
1. 打开 `public/index.html` 在浏览器中
2. 连接 MetaMask
3. 查看控制台的 API 调用

**选项 B: 临时禁用认证中间件（仅用于测试）**

编辑 `src/api/routes/spaces.ts` 和 `src/api/routes/user.ts`，临时注释掉认证检查：

```typescript
// 临时禁用认证用于测试
spacesRouter.get('/mine', async (c: any) => {
  // const userId = c.get('userId') as number;
  const userId = 1; // 临时硬编码
  // ...
});
```

然后测试：

```bash
# 测试获取用户统计
curl http://localhost:3001/api/user/stats

# 测试获取 Spaces 列表
curl http://localhost:3001/api/spaces/mine

# 测试热门 Spaces
curl http://localhost:3001/api/spaces/popular
```

**记得测试后恢复认证中间件！**

---

### 测试 4: 测试 Worker 处理任务

**4.1 手动创建测试任务**

创建测试脚本 `scripts/test-worker.ts`：

```typescript
import { db } from '../src/db/client';
import { spaces, jobs } from '../src/db/schema';

async function createTestJob() {
  // 创建测试 Space
  const [space] = await db.insert(spaces).values({
    spaceId: 'TEST_' + Date.now(),
    spaceUrl: 'https://twitter.com/i/spaces/TEST',
    title: 'Test Space',
    status: 'pending',
  }).returning();

  console.log('✅ Created test Space:', space.spaceId);

  // 创建测试 Job
  const [job] = await db.insert(jobs).values({
    spaceId: space.id,
    status: 'pending',
    attemptCount: 0,
  }).returning();

  console.log('✅ Created test Job:', job.id);
  console.log('\n👀 Watch the worker terminal to see it process this job...');
}

createTestJob();
```

**运行：**
```bash
bun run scripts/test-worker.ts
```

**观察：**
- Worker 终端应该在 10 秒内检测到任务
- 会尝试处理（可能失败，因为是测试 URL）
- 检查重试逻辑是否工作

---

### 测试 5: 端到端流程（需要真实 Space URL）

如果你有真实的 Twitter Space URL：

**5.1 使用真实 URL 测试完整流程**

```bash
# 1. 确保所有服务都在运行
# 2. 使用真实 Space URL（需要支付）

curl -X POST http://localhost:8787/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://twitter.com/i/spaces/YOUR_REAL_SPACE_ID",
    "title": "Real Test"
  }'
```

**观察流程：**
1. Agent 接收请求，创建 Space 记录
2. Job 入队（status: pending）
3. Worker 检测到任务（10秒内）
4. Worker 处理：下载 → 转录 → 格式化
5. 数据保存到数据库和文件系统
6. Space status 更新为 'completed'

**监控：**
```bash
# 监控数据库
bun run db:studio

# 查看生成的文件
ls -la data/audio/
ls -la data/transcripts/
```

---

## 使用 Dashboard 测试

### 启动 Dashboard

**选项 A: 使用 Bun 静态服务器**

```bash
# 安装 serve（如果还没有）
bun add -g serve

# 启动静态服务器
serve public -p 3000
```

**选项 B: 使用 Python 简单服务器**

```bash
cd public
python3 -m http.server 3000
```

**访问：**
1. 打开浏览器：`http://localhost:3000`
2. 连接 MetaMask 钱包
3. 查看你的 Spaces（需要先通过 Agent 购买转录）

---

## 快速测试检查清单

- [ ] 环境变量已配置（`.env` 文件）
- [ ] 数据库迁移已运行
- [ ] TypeScript 编译无错误
- [ ] 单元测试通过（11/11）
- [ ] Agent 服务启动（端口 8787）
- [ ] API 服务启动（端口 3001）
- [ ] Worker 服务启动（轮询中）
- [ ] Agent manifest 可访问
- [ ] API health check 返回 OK
- [ ] 可以创建测试任务
- [ ] Worker 可以处理任务

---

## 常见问题

### Q1: Database locked 错误

**原因：** 多个进程同时访问 SQLite

**解决：**
```bash
# 停止所有服务
# 删除数据库锁文件
rm -f data/database/spaces.db-wal
rm -f data/database/spaces.db-shm

# 重新启动服务
```

### Q2: Worker 不处理任务

**检查：**
```bash
# 1. Worker 是否在运行？
# 查看终端 3 是否有输出

# 2. 任务是否在队列中？
bun run db:studio
# 查看 jobs 表

# 3. 查看 Worker 日志
# 应该每 10 秒输出一次轮询信息
```

### Q3: API 返回 401 Unauthorized

**原因：** 认证中间件需要钱包签名

**临时解决（仅测试）：**
- 按"测试 3"中的方法临时禁用认证
- 或使用 Dashboard 通过 MetaMask 获取真实签名

### Q4: TypeScript 编译错误

```bash
# 清理并重新编译
rm -rf node_modules/.cache
bun run typecheck
```

---

## 下一步

测试通过后，你可以：

1. **配置真实支付** - 设置 x402 钱包和 USDC
2. **部署到生产** - 参考 `docs/DEPLOYMENT.md`
3. **添加更多功能** - 查看集成测试了解扩展点
4. **设置监控** - 添加日志和错误追踪

---

## 获取帮助

- 查看日志：检查 3 个终端的输出
- 数据库调试：`bun run db:studio`
- 文件系统：`ls -la data/`
- 测试：`bun test`

Happy testing! 🚀
