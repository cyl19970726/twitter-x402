# Railway 快速部署指南

## 🚀 一键部署摘要

### 需要创建的服务

1. **PostgreSQL** - 数据库
2. **Agent** - x402 付费 API
3. **API Server** - 免费 HTTP API
4. **Worker** - 后台处理

---

## 📋 快速步骤

### 1. 准备代码

```bash
# 运行准备脚本
bash scripts/prepare-deploy.sh

# 提交到 Git
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 2. 创建 Railway 项目

访问: https://railway.app

1. 点击 "New Project"
2. 选择 "Empty Project"
3. 命名: `twitter-space-platform`

### 3. 添加数据库

1. 点击 "+ New"
2. 选择 "Database" → "PostgreSQL"
3. 等待创建完成 ✅

### 4. 添加 Agent 服务

1. 点击 "+ New" → "GitHub Repo"
2. 连接你的仓库
3. **Settings:**
   - Name: `agent`
   - Start Command: `bun run src/index.ts`
   - Generate Domain ✅

4. **环境变量:**
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
PRIVATE_KEY=你的私钥
OPENAI_API_KEY=你的OpenAI密钥
TWITTER_COOKIES=[...]
NETWORK=base
PAY_TO=你的收款地址
FACILITATOR_URL=https://facilitator.daydreams.systems
PORT=8787
```

5. 点击 "Deploy"

### 5. 添加 API 服务

1. 点击 "+ New" → "GitHub Repo"（同一个）
2. **Settings:**
   - Name: `api`
   - Start Command: `bun run src/api/server.ts`
   - Generate Domain ✅

3. **环境变量:**
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
API_PORT=3001
CORS_ORIGIN=*
```

4. 点击 "Deploy"

### 6. 添加 Worker 服务

1. 点击 "+ New" → "GitHub Repo"（同一个）
2. **Settings:**
   - Name: `worker`
   - Start Command: `bun run scripts/worker.ts`
   - **不生成 Domain**（Worker 不需要）

3. **环境变量:**
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENAI_API_KEY=你的OpenAI密钥
TWITTER_COOKIES=[...]
WORKER_POLL_INTERVAL_MS=10000
```

4. 点击 "Deploy"

### 7. 运行数据库迁移

等所有服务部署完成后：

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 运行迁移
railway run bun run scripts/migrate.ts
```

或在 Railway Web 界面：
- 选择任意服务
- Settings → One-off Commands
- 输入: `bun run scripts/migrate.ts`
- 点击 Run

### 8. 验证部署

```bash
# 测试 Agent
curl https://你的agent域名.railway.app/.well-known/agent.json

# 测试 API
curl https://你的api域名.railway.app/health
```

---

## 🎯 环境变量快速参考

### 所有服务共用

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # 自动引用数据库
```

### Agent 特有

```bash
PRIVATE_KEY=0x...
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
NETWORK=base
PAY_TO=0x...
FACILITATOR_URL=https://facilitator.daydreams.systems
PORT=8787
```

### API 特有

```bash
API_PORT=3001
CORS_ORIGIN=*
```

### Worker 特有

```bash
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
WORKER_POLL_INTERVAL_MS=10000
WORKER_MAX_RETRIES=3
```

---

## ⚡ 常见问题

### Q: 部署失败，显示 "Build failed"

**A:** 检查：
1. TypeScript 是否有错误（运行 `bun run typecheck`）
2. 依赖是否都在 `package.json` 中
3. 查看 Railway 构建日志

### Q: 数据库连接失败

**A:** 确认：
1. `DATABASE_URL` 使用 `${{Postgres.DATABASE_URL}}`
2. 数据库服务正在运行
3. 已运行迁移脚本

### Q: Worker 不处理任务

**A:** 检查：
1. Worker 日志是否显示轮询
2. 环境变量是否完整（OpenAI, Twitter cookies）
3. 数据库中是否有 pending jobs

### Q: 端点返回 404

**A:** 验证：
1. Start Command 是否正确
2. 服务是否成功启动（查看日志）
3. 使用正确的 URL 格式

---

## 💰 成本

Railway Hobby 计划：
- PostgreSQL: $5/月
- Agent: $5/月
- API: $5/月
- Worker: $5/月
- **总计: $20/月**

包含：500 小时运行时间，512MB RAM，1GB 磁盘

---

## 📚 详细文档

完整部署指南：
```bash
cat RAILWAY_DEPLOYMENT.md
```

包含：
- 详细配置步骤
- 故障排查
- 监控设置
- 自定义域名
- 扩展和优化

---

## ✅ 部署检查清单

- [ ] 代码已提交到 Git
- [ ] Railway 项目已创建
- [ ] PostgreSQL 数据库已添加
- [ ] Agent 服务已部署
- [ ] API 服务已部署
- [ ] Worker 服务已部署
- [ ] 所有环境变量已配置
- [ ] 数据库迁移已运行
- [ ] Agent manifest 可访问
- [ ] API health check 通过
- [ ] Worker 日志显示轮询

---

## 🆘 需要帮助？

- 详细指南: `RAILWAY_DEPLOYMENT.md`
- Railway 文档: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
