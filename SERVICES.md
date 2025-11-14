# 服务说明

## 🚀 快速启动

```bash
bun run dev:all
```

## 📊 服务架构

你的平台有 **4 个部分**：

### 1. Agent (x402 付费 API) - 端口 8787 ✅
- **功能**: 处理付费请求（转录、聊天解锁、聊天查询）
- **访问**: http://localhost:8787
- **测试**:
  ```bash
  curl http://localhost:8787/.well-known/agent.json
  ```
- **状态**: ✅ 运行中

### 2. API Server (免费 HTTP API) - 端口 3001 ✅
- **功能**: 为 Dashboard 提供后端数据
- **访问**: http://localhost:3001
- **这是后端 API**，不是网页！
- **测试**:
  ```bash
  curl http://localhost:3001/health
  ```
- **返回**: JSON 数据
- **状态**: ✅ 运行中

### 3. Background Worker ✅
- **功能**: 处理转录队列（每 10 秒轮询）
- **状态**: ✅ 运行中
- 查看日志: `tail -f logs/worker.log`

### 4. Dashboard (前端) - 端口 3000 🎨
- **这才是你要访问的网页！**
- **位置**: `public/` 目录
- **访问**: http://localhost:3000
- **状态**: ⚠️ 需要单独启动

---

## 🎨 启动 Dashboard (前端)

Dashboard 需要单独启动静态服务器：

### 方法 1: 使用 Python (推荐)

```bash
cd public
python3 -m http.server 3000
```

然后打开浏览器访问: **http://localhost:3000**

### 方法 2: 使用 Bun

```bash
bun run start:dashboard
```

### 方法 3: 使用 serve

```bash
npx serve public -p 3000
```

---

## 🧪 验证所有服务

```bash
# 1. 检查 Agent
curl http://localhost:8787/.well-known/agent.json

# 2. 检查 API Server
curl http://localhost:3001/health

# 3. 打开 Dashboard（在浏览器中）
open http://localhost:3000
```

---

## 📝 当前状态

运行 `bun run dev:all` 后，你有：

- ✅ Agent (8787) - 付费 API
- ✅ API Server (3001) - 后端 API
- ✅ Worker - 后台处理

**还需要**:
- ⏳ Dashboard (3000) - 前端网页（需要手动启动）

---

## 🛑 停止服务

```bash
bun run stop
```

---

## 📖 完整启动流程

### 终端 1: 启动后端服务
```bash
bun run dev:all
```

### 终端 2: 启动前端 Dashboard
```bash
cd public
python3 -m http.server 3000
```

### 浏览器
打开: **http://localhost:3000**

---

## ❓ 常见问题

### Q: http://localhost:3001 无法访问？

A: 这是正常的！3001 是 **后端 API**，不是网页。你应该访问 **http://localhost:3000** (Dashboard 前端)。

### Q: Dashboard 在哪里？

A: 需要单独启动静态服务器托管 `public/` 目录：
```bash
cd public && python3 -m http.server 3000
```

### Q: 如何查看日志？

A: 日志保存在 `logs/` 目录：
```bash
tail -f logs/agent.log
tail -f logs/api.log
tail -f logs/worker.log
```

### Q: 端口被占用？

A: 运行清理命令：
```bash
lsof -ti:8787 | xargs kill
lsof -ti:3001 | xargs kill
lsof -ti:3000 | xargs kill
```

---

## 🎯 完整测试流程

1. **启动后端**:
   ```bash
   bun run dev:all
   ```

2. **验证后端**:
   ```bash
   curl http://localhost:8787/.well-known/agent.json
   curl http://localhost:3001/health
   ```

3. **启动前端** (新终端):
   ```bash
   cd public && python3 -m http.server 3000
   ```

4. **访问 Dashboard**:
   打开浏览器: http://localhost:3000

5. **连接 MetaMask** 钱包查看功能

---

## 💡 提示

- ✅ Agent (8787) = 付费 API (x402)
- ✅ API Server (3001) = 后端 API (JSON数据)
- 🎨 Dashboard (3000) = 前端网页 (用户界面)

**记住**: 访问 Dashboard 请打开 **http://localhost:3000** ！
