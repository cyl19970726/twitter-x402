# Vercel 部署指南

## ✅ Vercel **可以支持**这个项目！

### 2025年Vercel新功能：Fluid Compute

Vercel 现在支持更长的执行时间：

| 套餐 | 最大超时时间 | 是否足够 |
|------|-------------|---------|
| **Hobby** | 300秒（5分钟） | ⚠️ 勉强够用 |
| **Pro** | **800秒（13.3分钟）** | ✅ 完全够用 |
| **Enterprise** | 900秒（15分钟） | ✅ 绰绰有余 |

我们的 Twitter Space 处理需要 **4-5分钟**，因此：
- ✅ **Hobby套餐**：可用（但建议升级到Pro）
- ✅ **Pro套餐**：推荐（有足够余量）

---

## 🚀 部署步骤

### 方法 1: 使用 Vercel Dashboard（推荐）

1. **登录 Vercel**: https://vercel.com

2. **导入项目**:
   - 点击 "Add New Project"
   - 连接你的 GitHub/GitLab/Bitbucket 仓库
   - 选择这个项目仓库

3. **配置环境变量**:
   在 "Environment Variables" 部分添加：

   ```bash
   OPENAI_API_KEY=sk-proj-...
   TWITTER_COOKIES=[{"key":"auth_token","value":"..."}]
   PRIVATE_KEY=0x...
   NETWORK=base
   PAY_TO=0x...
   FACILITATOR_URL=https://facilitator.daydreams.systems
   DEFAULT_PRICE=1000000
   PRICE_FORMAT_SPACE=2000
   PRICE_SUMMARIZE_SPACE=1500
   ```

4. **Deploy**:
   - 点击 "Deploy"
   - Vercel 会自动检测配置并部署

---

### 方法 2: 使用 Vercel CLI

#### 1. 安装 Vercel CLI

```bash
npm i -g vercel
# 或
bun add -g vercel
```

#### 2. 登录

```bash
vercel login
```

#### 3. 配置环境变量

你可以通过 CLI 添加环境变量：

```bash
vercel env add OPENAI_API_KEY
vercel env add TWITTER_COOKIES
vercel env add PRIVATE_KEY
vercel env add NETWORK
vercel env add PAY_TO
# ... 添加其他环境变量
```

或者手动创建 `.env.production` 文件（不要提交到 Git）：

```bash
cp .env .env.production
# 编辑 .env.production 填入生产环境的值
```

然后使用以下命令导入：

```bash
vercel env pull
```

#### 4. 部署到预览环境

```bash
vercel
```

这会部署到一个预览 URL（例如 `your-project-xxx.vercel.app`）

#### 5. 部署到生产环境

```bash
vercel --prod
```

---

## 📋 配置说明

### `vercel.json` 配置

```json
{
  "version": 2,
  "installCommand": "bun install",
  "buildCommand": "echo 'Build complete'",
  "functions": {
    "api/index.js": {
      "maxDuration": 600,    // 10分钟超时（Pro套餐最大800秒）
      "memory": 1024          // 1GB 内存
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

### 关键配置项

1. **`maxDuration: 600`**:
   - 设置为 10 分钟（600秒）
   - Pro 套餐可以设置最大 800 秒
   - Hobby 套餐最大 300 秒

2. **`memory: 1024`**:
   - 分配 1GB 内存
   - 音频处理和 Whisper 转录需要较多内存

3. **`rewrites`**:
   - 将所有请求转发到 `/api/index.js`
   - 这样可以保持与本地开发一致的路由

---

## 🔧 项目结构

```
dreams/
├── api/
│   └── index.js          # Vercel Serverless Function 入口
├── src/
│   ├── agent-improved.ts # Agent 主逻辑
│   ├── index.ts          # 本地开发入口
│   └── utils/            # 工具函数
├── vercel.json           # Vercel 配置
└── package.json
```

### `api/index.js` 说明

这是 Vercel Serverless Function 的入口文件：

```javascript
// Vercel Serverless Function Entry Point
import { app } from '../src/agent-improved.ts';

// Export the Hono app's fetch handler for Vercel
export default app.fetch;
```

它导出了 Hono app 的 `fetch` 处理器，Vercel 会自动将 HTTP 请求转发给它。

---

## ✅ 部署后验证

### 1. 检查健康状态

```bash
curl https://your-project.vercel.app/health
```

预期输出：
```json
{"ok":true,"version":"1.0.0"}
```

### 2. 查看 Agent Manifest

```bash
curl https://your-project.vercel.app/.well-known/agent.json
```

### 3. 测试付费端点

```bash
curl -X POST https://your-project.vercel.app/entrypoints/format-twitter-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"}'
```

预期返回 **402 Payment Required** （需要 x402 支付证明）

---

## 🎯 Pro 套餐特性

如果你使用 **Vercel Pro** 套餐（$20/月），可以获得：

1. ✅ **800秒超时** - 足够处理长视频
2. ✅ **更多内存** - 最高 3GB
3. ✅ **自定义域名** - 无限制
4. ✅ **更高并发** - 更好的性能
5. ✅ **团队协作** - 多人管理

### 如何启用 Pro 套餐

1. 进入 Vercel Dashboard
2. 选择你的项目
3. Settings → General → Plan
4. 点击 "Upgrade to Pro"

---

## 📊 性能监控

### 查看函数执行时间

1. 进入 Vercel Dashboard
2. 选择你的项目
3. Analytics → Functions
4. 查看每个请求的执行时间

### 设置告警

如果函数执行时间接近超时限制（例如 > 500秒），Vercel 会发送告警。

---

## ⚠️ 注意事项

### 1. **冷启动**
Vercel Serverless Functions 有冷启动时间（~1-2秒）。对于不常用的端点，第一次请求可能较慢。

**解决方案**:
- 使用 Vercel Cron Jobs 定期唤醒函数
- 考虑升级到 Vercel Pro（减少冷启动）

### 2. **并发限制**
Hobby 套餐有并发限制。如果同时处理多个 Twitter Space，可能会排队。

**解决方案**:
- 升级到 Pro 套餐
- 或使用 Railway/Render 等平台（无并发限制）

### 3. **成本控制**
每次函数调用都会消耗执行时间。处理一个 5 分钟的 Space 会消耗 5 分钟的函数执行时间。

**Vercel 定价**:
- **Hobby**: 100GB-Hrs/月 免费
- **Pro**: 1000GB-Hrs/月，超出后 $0.40/GB-Hr

**估算**:
- 处理一个 Space: ~5分钟 = 0.083 小时
- Hobby 套餐: ~1200 次处理/月
- Pro 套餐: ~12000 次处理/月

---

## 🔄 CI/CD 自动部署

### 自动部署到预览环境

每次推送到 Git 分支，Vercel 会自动创建一个预览部署：

```bash
git push origin feature-branch
# Vercel 自动部署到: your-project-xxx-feature.vercel.app
```

### 自动部署到生产环境

推送到 `main` 分支会自动部署到生产环境：

```bash
git push origin main
# Vercel 自动部署到: your-project.vercel.app
```

---

## 🆚 Vercel vs 其他平台

| 特性 | Vercel Pro | Railway | Render |
|------|-----------|---------|--------|
| 最大超时 | 800秒 | 无限制 | 无限制 |
| 内存 | 最高 3GB | 最高 32GB | 最高 16GB |
| 并发 | 较高 | 无限制 | 较高 |
| 冷启动 | 有 | 无 | 有（免费套餐） |
| 价格 | $20/月 | $5起/月 | 免费起 |
| 适用场景 | ✅ 推荐 | ✅ 推荐 | ⭐ 推荐 |

---

## 🐛 常见问题

### Q: 为什么返回 504 超时错误？

A: 检查以下几点：
1. 是否设置了 `maxDuration`？
2. 是否使用了 Hobby 套餐（最大 300 秒）？
3. Space 是否太长（>30分钟）？

**解决方案**:
- 升级到 Pro 套餐
- 增加 `maxDuration` 到 600-800 秒
- 对于超长 Space，考虑使用 Railway

### Q: 如何调试 Serverless Function？

A: 使用 Vercel 日志：

```bash
vercel logs
```

或在 Dashboard 查看实时日志。

### Q: 可以使用自定义域名吗？

A: 可以！

1. 进入项目 Settings → Domains
2. 添加你的域名（例如 `api.example.com`）
3. 更新 DNS 记录（Vercel 会提供指引）

---

## 📚 更多资源

- [Vercel 函数配置文档](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel 环境变量](https://vercel.com/docs/projects/environment-variables)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [agent-kit 部署指南](https://github.com/lucid-dreams/agent-kit)

---

## 🎉 总结

**Vercel 是一个很好的选择！**

- ✅ Pro 套餐支持 800 秒超时（足够处理 Twitter Space）
- ✅ 简单易用，自动 HTTPS
- ✅ 与 GitHub 集成，自动 CI/CD
- ✅ 全球 CDN，访问速度快

**推荐套餐**:
- 🆓 **测试/个人项目**: Hobby 套餐（免费）
- 💼 **生产环境**: Pro 套餐（$20/月）
