# 部署到 Railway - 完整指南

## 📁 已创建的部署文件

✅ `railway.json` - Railway 配置
✅ `Procfile` - 进程定义
✅ `nixpacks.toml` - 构建配置
✅ `.railwayignore` - 忽略文件
✅ `RAILWAY_DEPLOYMENT.md` - 详细部署指南
✅ `RAILWAY_QUICK_START.md` - 快速开始指南

---

## 🚀 快速部署（5 步骤）

### 1️⃣ 准备代码
```bash
bash scripts/prepare-deploy.sh
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 2️⃣ 创建 Railway 项目
访问 https://railway.app → New Project → Empty Project

### 3️⃣ 创建 4 个服务
按顺序创建：
1. **PostgreSQL** (数据库)
2. **Agent** (GitHub Repo → `bun run src/index.ts`)
3. **API** (GitHub Repo → `bun run src/api/server.ts`)
4. **Worker** (GitHub Repo → `bun run scripts/worker.ts`)

### 4️⃣ 配置环境变量
每个服务添加：
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- Agent 和 Worker 需要额外添加：
  - `PRIVATE_KEY`
  - `OPENAI_API_KEY`
  - `TWITTER_COOKIES`
  - 其他配置（见详细文档）

### 5️⃣ 运行数据库迁移
```bash
railway run bun run scripts/migrate.ts
```

---

## 📊 服务架构

```
Railway Project: twitter-space-platform
├── Service 1: PostgreSQL (数据库)
├── Service 2: Agent (x402 API) - 端口 8787
├── Service 3: API (HTTP API) - 端口 3001
└── Service 4: Worker (后台处理)
```

---

## 💰 成本

| 服务 | 费用 |
|------|------|
| PostgreSQL | $5/月 |
| Agent | $5/月 |
| API | $5/月 |
| Worker | $5/月 |
| **总计** | **$20/月** |

---

## 📖 详细文档

### 快速开始
```bash
cat RAILWAY_QUICK_START.md
```

### 完整指南（推荐）
```bash
cat RAILWAY_DEPLOYMENT.md
```

包含：
- 详细步骤说明
- 环境变量完整列表
- 故障排查指南
- 监控和日志
- 自定义域名配置
- 扩展和优化建议

---

## ✅ 验证部署

部署完成后测试：

```bash
# 1. Agent Manifest
curl https://你的域名.railway.app/.well-known/agent.json

# 2. API Health
curl https://你的域名.railway.app/health

# 3. 测试端点
curl -X POST https://你的域名.railway.app/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl":"https://twitter.com/i/spaces/1RDxlAoOeQRKL"}'
```

---

## 🆘 需要帮助？

1. 查看详细指南: `cat RAILWAY_DEPLOYMENT.md`
2. Railway 文档: https://docs.railway.app
3. Railway Discord: https://discord.gg/railway

---

## 下一步

部署完成后：
- [ ] 更新 README 添加生产 URL
- [ ] 配置自定义域名（可选）
- [ ] 设置监控和告警
- [ ] 测试完整流程
- [ ] 部署前端到 Vercel
