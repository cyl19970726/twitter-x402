# 部署指南

## 🎯 部署平台选择

这个 Twitter Space Summarizer Agent 有以下特点：
- ⏱️ **长时间运行**: 处理一个 30 分钟的 Space 需要 4-5 分钟
- 🎵 **音频下载**: 需要下载大文件
- 🗣️ **Whisper 转录**: CPU/内存密集型任务

### ✅ **2025年更新: Vercel 现在支持！**

Vercel 在 2025 年推出了 **Fluid Compute**，大幅提升了超时限制：

| 套餐 | 超时限制 | 是否适用 |
|------|---------|---------|
| **Hobby** | 300秒（5分钟） | ⚠️ 勉强够用 |
| **Pro** | **800秒（13.3分钟）** | ✅ 完全够用 |
| **Enterprise** | 900秒（15分钟） | ✅ 绰绰有余 |

我们的处理时间：**4-5分钟**，因此 Vercel Pro 套餐完全可以支持！

---

### ❌ 不推荐的平台

#### Netlify Functions
- **问题**: 最大超时 26 秒（Background Functions 最长 15 分钟但需要额外配置）
- **不适合**: 标准 Serverless Functions

### ✅ 推荐的部署平台

#### 0. **Vercel Pro** (推荐 - 最简单)
- ✅ 800秒超时（足够处理 Twitter Space）
- ✅ 零配置部署（连接 GitHub 即可）
- ✅ 自动 HTTPS 和 CDN
- ✅ 与 GitHub 完美集成
- 💰 $20/月（Pro 套餐）
- 📖 **详细指南**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

**部署步骤**:
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署（会自动提示配置环境变量）
vercel

# 4. 部署到生产环境
vercel --prod
```

#### 1. **Railway** (推荐 - 长期运行)
- ✅ 无超时限制
- ✅ 支持长时间运行的服务器
- ✅ 自动 HTTPS
- ✅ 简单的环境变量配置
- 💰 免费额度: $5/月

**部署步骤**:
```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 添加环境变量
railway variables set OPENAI_API_KEY=sk-...
railway variables set TWITTER_COOKIES='[...]'
railway variables set NETWORK=base
# ... 添加所有环境变量

# 5. 部署
railway up
```

#### 2. **Render**
- ✅ 免费套餐可用
- ✅ 支持 Bun
- ✅ 自动 HTTPS
- ⚠️ 免费套餐有休眠机制

**部署步骤**:
```bash
# render.yaml 配置已包含在项目中
# 直接在 Render Dashboard 连接 GitHub 仓库即可
```

#### 3. **Fly.io**
- ✅ 全球边缘部署
- ✅ 支持 Bun
- ✅ 免费额度充足
- 📝 需要 Dockerfile

**部署步骤**:
```bash
# 1. 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 2. 登录
flyctl auth login

# 3. 启动应用
flyctl launch

# 4. 设置环境变量
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl secrets set TWITTER_COOKIES='[...]'

# 5. 部署
flyctl deploy
```

#### 4. **传统 VPS** (DigitalOcean, Linode, AWS EC2)
- ✅ 完全控制
- ✅ 无限制
- 💰 需要付费（$5-10/月起）

---

## 🚀 推荐配置：Railway 部署

### 步骤 1: 准备配置文件

已包含在项目中：
- ✅ `railway.json` - Railway 配置
- ✅ `package.json` - 构建脚本

### 步骤 2: 环境变量

在 Railway Dashboard 中配置以下环境变量：

```bash
# 必填
OPENAI_API_KEY=sk-proj-...
TWITTER_COOKIES=[{"key":"auth_token","value":"..."}]
PRIVATE_KEY=0x...

# 推荐配置
NETWORK=base
PAY_TO=0x...
FACILITATOR_URL=https://facilitator.daydreams.systems
DEFAULT_PRICE=1000000
PRICE_FORMAT_SPACE=2000
PRICE_SUMMARIZE_SPACE=1500

# HTTP 配置
PORT=8787
API_BASE_URL=https://your-app.railway.app
```

### 步骤 3: 部署

```bash
# 方法 1: CLI 部署
railway up

# 方法 2: Git 推送自动部署
git push railway main
```

### 步骤 4: 验证部署

```bash
# 获取部署的 URL
railway domain

# 测试健康检查
curl https://your-app.railway.app/health

# 查看 manifest
curl https://your-app.railway.app/.well-known/agent.json
```

---

## 🐳 Docker 部署（可选）

如果你想使用 Docker：

### 创建 Dockerfile

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# 安装依赖
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 8787

# 启动服务
CMD ["bun", "run", "src/index.ts"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t twitter-space-agent .

# 运行容器
docker run -p 8787:8787 --env-file .env twitter-space-agent
```

---

## 📊 部署平台对比

| 平台 | 超时限制 | Bun 支持 | HTTPS | 免费/付费 | 推荐指数 |
|------|---------|----------|-------|----------|---------|
| **Vercel Pro** | **800s** ✅ | ⚠️ (Node.js) | ✅ | $20/月 | ⭐⭐⭐⭐⭐ |
| Railway | 无限制 | ✅ | ✅ | $5起/月 | ⭐⭐⭐⭐⭐ |
| Render | 无限制 | ✅ | ✅ | 免费起 | ⭐⭐⭐⭐ |
| Fly.io | 无限制 | ✅ | ✅ | 免费额度 | ⭐⭐⭐⭐ |
| Vercel Hobby | 300s | ⚠️ (Node.js) | ✅ | 免费 | ⭐⭐⭐ (勉强够用) |
| VPS | 无限制 | ✅ | 需配置 | $5起/月 | ⭐⭐⭐ |

---

## 🔧 性能优化建议

### 1. 使用 CDN 加速音频下载
```typescript
// 配置代理或 CDN
const PROXY_URL = process.env.PROXY_URL;
```

### 2. 启用请求缓存
```typescript
// 缓存已处理的 Space
const cache = new Map();
```

### 3. 监控和日志
```typescript
// 使用日志服务
import { Logger } from '@railway/logger';
```

---

## ❓ 常见问题

### Q: 为什么不能用 Vercel?
A: Vercel Serverless Functions 有严格的超时限制（最多 60 秒），而处理 Twitter Space 需要 4-5 分钟。

### Q: Railway 免费额度够用吗?
A: Railway 提供 $5/月免费额度，一个小型 agent 足够使用。如果流量大，可以升级到 Hobby 计划。

### Q: 如何设置自定义域名?
A: 在 Railway/Render Dashboard 的 Settings → Domains 中添加自定义域名。

### Q: 如何监控服务状态?
A: 使用平台自带的日志和监控功能，或集成 Sentry、Datadog 等服务。

---

## 📚 更多资源

- [Railway 文档](https://docs.railway.app/)
- [Render 文档](https://render.com/docs)
- [Fly.io 文档](https://fly.io/docs/)
- [agent-kit 部署指南](https://github.com/lucid-dreams/agent-kit)
