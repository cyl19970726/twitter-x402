# 启动指南

## 🎯 快速启动（一键启动所有服务）

```bash
bun run dev:all
```

这会启动：
- ✅ Agent (x402 付费 API) - 端口 8787
- ✅ API Server (免费 API) - 端口 3001
- ✅ Background Worker (后台处理)
- ✅ 数据库自动连接（SQLite）

**停止所有服务：**
```bash
bun run stop
```

或按 `Ctrl+C` 停止

---

## 📋 各服务说明

### 1. Agent (x402 付费 API)
```bash
bun run dev        # 热重载模式
bun run start      # 生产模式
```
- **端口**: 8787
- **功能**: 处理付费请求（转录、聊天解锁、聊天查询）
- **测试**: `curl http://localhost:8787/.well-known/agent.json`

### 2. API Server (免费 HTTP API)
```bash
bun run start:api
```
- **端口**: 3001
- **功能**: 提供免费查询接口（用户统计、Space 列表）
- **测试**: `curl http://localhost:3001/health`

### 3. Background Worker
```bash
bun run worker
```
- **功能**: 处理转录队列（每 10 秒轮询）
- **日志**: 显示处理进度

### 4. 数据库
- **类型**: SQLite（文件数据库）
- **位置**: `./data/database/spaces.db`
- **管理**: `bun run db:studio`
- **说明**: 无需单独启动，服务会自动连接

---

## 🔍 检查环境

```bash
bun run check
```

会检查：
- ✅ 数据库连接
- ✅ 环境变量
- ✅ 端口状态

---

## 🧪 测试

```bash
# 运行所有测试
bun test

# 仅单元测试
bun test:unit

# 集成测试
bun test:integration

# TypeScript 检查
bun run typecheck
```

---

## 📝 日志

使用一键启动时，日志保存在 `logs/` 目录：

```bash
tail -f logs/agent.log      # Agent 日志
tail -f logs/api.log        # API Server 日志
tail -f logs/worker.log     # Worker 日志
```

---

## 🎬 完整启动流程

### 首次启动

```bash
# 1. 检查环境
bun run check

# 2. 运行测试（可选）
bun test:unit

# 3. 启动所有服务
bun run dev:all
```

### 验证服务

在新终端中：

```bash
# 检查 Agent
curl http://localhost:8787/.well-known/agent.json | jq

# 检查 API
curl http://localhost:3001/health | jq

# 查看数据库
bun run db:studio
```

---

## ⚙️ 单独启动（开发调试）

如果需要分别启动（方便查看日志）：

**终端 1 - Agent:**
```bash
bun run dev
```

**终端 2 - API Server:**
```bash
bun run start:api
```

**终端 3 - Worker:**
```bash
bun run worker
```

---

## 🛑 停止服务

### 一键停止
```bash
bun run stop
```

### 手动停止
```bash
# 杀死特定端口的进程
lsof -ti:8787 | xargs kill    # Agent
lsof -ti:3001 | xargs kill    # API Server
```

---

## 📊 端口说明

| 服务 | 端口 | 用途 |
|------|------|------|
| Agent | 8787 | x402 付费 API |
| API Server | 3001 | 免费 HTTP API |
| Drizzle Studio | 4983 | 数据库管理界面 |

---

## 🚨 常见问题

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i:8787
lsof -i:3001

# 杀死进程
lsof -ti:8787 | xargs kill -9
```

### 数据库锁定

```bash
# 删除锁文件
rm -f data/database/spaces.db-wal
rm -f data/database/spaces.db-shm

# 重启服务
bun run dev:all
```

### 环境变量缺失

检查 `.env` 文件是否包含：
- `PRIVATE_KEY`
- `OPENAI_API_KEY`
- `TWITTER_COOKIES`

```bash
# 检查环境
bun run check
```

---

## 📖 更多文档

- `QUICKSTART.md` - 详细测试流程
- `README.md` - 项目概览
- `docs/API.md` - API 文档
- `docs/DEPLOYMENT.md` - 部署指南
