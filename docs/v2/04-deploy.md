# 部署指南

## 概览

本文档描述如何将 Twitter Space 转录平台部署到生产环境。

**部署架构:**
- **Next.js 应用**: Vercel (前端 + API)
- **PostgreSQL 数据库**: Railway / Neon / Supabase
- **Worker**: Railway / VPS (后台转录任务)
- **文件存储**: 本地文件系统 / S3 (可选)

---

## 部署方式选择

### 方案 A: Vercel + Railway (推荐)

**优点:**
- 最简单的部署流程
- Next.js 在 Vercel 上性能最佳
- Railway 提供免费的 PostgreSQL
- 一键部署,自动 CI/CD

**缺点:**
- Worker 需要单独部署
- 文件存储受限 (可用 S3)

**成本估算:**
- Vercel: 免费套餐 (100GB 流量)
- Railway: $5/月 (PostgreSQL + Worker)
- 总计: **$5/月**

### 方案 B: 全部 Railway

**优点:**
- 统一管理
- 单一账单

**缺点:**
- Next.js 性能不如 Vercel
- 成本略高

**成本估算:**
- Railway: $10-15/月
- 总计: **$10-15/月**

### 方案 C: VPS 自托管

**优点:**
- 完全控制
- 成本可控

**缺点:**
- 需要运维经验
- 需要自己配置 SSL, 域名等

**成本估算:**
- Hetzner/DigitalOcean: $5-10/月
- 总计: **$5-10/月**

---

## 方案 A 详细部署步骤 (Vercel + Railway)

### 第 1 步: 部署 PostgreSQL 数据库 (Railway)

#### 1.1 创建 Railway 项目

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 点击 "New Project"
4. 选择 "Provision PostgreSQL"

#### 1.2 获取数据库连接字符串

1. 点击 PostgreSQL 服务
2. 进入 "Connect" 标签
3. 复制 "Postgres Connection URL"

格式: `postgresql://postgres:[password]@[host]:[port]/railway`

#### 1.3 运行数据库迁移

```bash
# 本地设置数据库 URL
export DATABASE_URL="postgresql://postgres:..."

# 生成迁移文件
npm run db:generate

# 应用迁移
npm run db:migrate
```

或者使用 Drizzle Studio 直接推送 schema:

```bash
npm run db:push
```

### 第 2 步: 部署 Next.js 应用 (Vercel)

#### 2.1 推送代码到 GitHub

```bash
git add .
git commit -m "feat: v2 Next.js implementation"
git push origin v2-development
```

#### 2.2 连接 Vercel

1. 访问 https://vercel.com
2. 使用 GitHub 登录
3. 点击 "Add New Project"
4. 选择你的仓库
5. 选择 `v2-development` 分支

#### 2.3 配置环境变量

在 Vercel 项目设置中添加:

```env
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway
PAY_TO_ADDRESS=0x1234567890123456789012345678901234567890
FACILITATOR_URL=https://facilitator.daydreams.systems
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### 2.4 部署

点击 "Deploy" 按钮,等待部署完成。

部署后 URL: `https://your-project.vercel.app`

### 第 3 步: 部署 Worker (Railway)

Worker 负责后台转录任务,需要持续运行。

#### 3.1 创建 Worker 服务

在 Railway 项目中:

1. 点击 "New Service"
2. 选择 "GitHub Repo"
3. 选择同一个仓库
4. 分支选择 `v2-development`

#### 3.2 配置 Worker

创建 `railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install"

[deploy]
startCommand = "npm run worker"
restartPolicyType = "ALWAYS"
restartPolicyMaxRetries = 10
```

#### 3.3 添加 npm scripts

在 `package.json` 添加:

```json
{
  "scripts": {
    "worker": "tsx scripts/worker.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

#### 3.4 设置环境变量

在 Railway Worker 服务中添加:

```env
DATABASE_URL=postgresql://postgres:...
OPENAI_API_KEY=sk-...
TWITTER_COOKIES=[...]
DATA_STORAGE_PATH=/app/data/spaces
AUDIO_CHUNK_DURATION_MINUTES=10
```

#### 3.5 添加持久化存储 (可选)

如果需要保存文件到 Railway:

1. 在服务中添加 "Volume"
2. 挂载路径: `/app/data`
3. 大小: 5-10 GB

> **注意**: Railway 的存储比较贵,建议使用 S3。

#### 3.6 部署 Worker

提交代码并推送,Railway 会自动部署。

### 第 4 步: 验证部署

#### 4.1 检查数据库连接

```bash
# 使用 Drizzle Studio
npm run db:studio
```

访问 https://local.drizzle.studio 查看数据库。

#### 4.2 测试 API 端点

```bash
# 获取 Spaces 列表
curl https://your-project.vercel.app/api/spaces

# 检查状态
curl https://your-project.vercel.app/api/spaces/test123/status
```

#### 4.3 检查 Worker 日志

在 Railway Worker 服务中:
1. 点击 "Logs" 标签
2. 查看是否有错误
3. 确认 Worker 正常启动

预期日志:
```
🚀 Worker started
Checking for pending jobs...
No pending jobs, waiting...
```

---

## 环境变量完整清单

### Next.js (Vercel)

| 变量名 | 必填 | 示例 | 描述 |
|--------|------|------|------|
| `DATABASE_URL` | ✅ | `postgresql://...` | PostgreSQL 连接 |
| `PAY_TO_ADDRESS` | ✅ | `0x1234...` | x402 收款地址 |
| `FACILITATOR_URL` | ✅ | `https://facilitator...` | x402 Facilitator |
| `OPENAI_API_KEY` | ✅ | `sk-...` | OpenAI API Key |
| `TWITTER_COOKIES` | ✅ | `[...]` | Twitter Cookies |
| `NEXT_PUBLIC_APP_URL` | ❌ | `https://...` | 应用 URL |

### Worker (Railway)

| 变量名 | 必填 | 示例 | 描述 |
|--------|------|------|------|
| `DATABASE_URL` | ✅ | `postgresql://...` | PostgreSQL 连接 |
| `OPENAI_API_KEY` | ✅ | `sk-...` | OpenAI API Key |
| `TWITTER_COOKIES` | ✅ | `[...]` | Twitter Cookies |
| `DATA_STORAGE_PATH` | ❌ | `/app/data/spaces` | 文件存储路径 |
| `AUDIO_CHUNK_DURATION_MINUTES` | ❌ | `10` | 音频切片时长 |

---

## 域名配置

### 1. 在 Vercel 添加自定义域名

1. 进入 Vercel 项目设置
2. 点击 "Domains"
3. 输入域名 (例: `transcribe.yourdomain.com`)
4. 按照提示添加 DNS 记录

### 2. DNS 配置示例

在你的域名提供商 (Cloudflare/Namecheap) 添加:

**A 记录:**
```
Type: A
Name: transcribe
Value: 76.76.21.21 (Vercel IP)
```

或 **CNAME 记录:**
```
Type: CNAME
Name: transcribe
Value: cname.vercel-dns.com
```

### 3. SSL 证书

Vercel 会自动提供 SSL 证书 (Let's Encrypt),无需额外配置。

---

## S3 文件存储 (可选)

如果 Space 数量很多,建议使用 S3 存储音频和转录文件。

### 1. 创建 S3 Bucket

**AWS S3:**
1. 访问 AWS S3 控制台
2. 创建新 Bucket (例: `twitter-spaces-transcripts`)
3. 区域选择最近的 (如 `us-east-1`)
4. 公开访问: 关闭

**Cloudflare R2 (更便宜):**
1. 访问 Cloudflare Dashboard
2. 进入 R2
3. 创建 Bucket
4. 获取 Access Key ID 和 Secret Access Key

### 2. 安装 AWS SDK

```bash
npm install @aws-sdk/client-s3
```

### 3. 配置环境变量

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=twitter-spaces-transcripts
```

### 4. 修改文件保存逻辑

```typescript
// lib/storage/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

---

## 监控和日志

### 1. Vercel 日志

访问 Vercel 项目 → "Logs" 查看:
- API 请求日志
- 错误日志
- 构建日志

### 2. Railway 日志

访问 Railway 服务 → "Logs" 查看:
- Worker 运行日志
- 数据库查询日志
- 错误信息

### 3. 错误监控 (Sentry)

#### 3.1 安装 Sentry

```bash
npm install @sentry/nextjs
```

#### 3.2 初始化

```bash
npx @sentry/wizard@latest -i nextjs
```

#### 3.3 配置

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 4. 性能监控 (Vercel Analytics)

在 `app/layout.tsx` 添加:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 数据库备份

### 自动备份 (Railway)

Railway 提供自动备份:
1. 进入 PostgreSQL 服务
2. 点击 "Backups"
3. 启用自动备份 (每日)

### 手动备份

```bash
# 导出数据库
pg_dump $DATABASE_URL > backup.sql

# 恢复数据库
psql $DATABASE_URL < backup.sql
```

### 定时备份脚本

```bash
#!/bin/bash
# scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$DATE.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE

# 上传到 S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# 删除本地文件
rm $BACKUP_FILE

echo "Backup completed: $BACKUP_FILE"
```

添加到 cron:
```cron
0 2 * * * /path/to/backup-db.sh
```

---

## 扩展和优化

### 1. Worker 水平扩展

当转录任务很多时,可以运行多个 Worker 实例:

```typescript
// scripts/worker.ts
// 添加锁机制,防止多个 Worker 处理同一任务

import { db } from '@/lib/db';

async function claimJob(jobId: number) {
  // 使用数据库锁
  const result = await db.execute(`
    UPDATE spaces
    SET status = 'processing',
        processing_started_at = NOW()
    WHERE id = ${jobId}
      AND status = 'pending'
    RETURNING *
  `);

  return result.length > 0;
}
```

在 Railway 中,增加 Worker 实例数量:
1. 进入 Worker 服务
2. 点击 "Settings" → "Scaling"
3. 增加 Replicas 数量

### 2. CDN 缓存

使用 Vercel Edge Network 自动缓存:

```typescript
// app/api/spaces/route.ts
export const revalidate = 60; // 缓存 60 秒
```

### 3. 数据库连接池

```typescript
// lib/db/index.ts
import postgres from 'postgres';

const client = postgres(connectionString, {
  max: 10, // 最大连接数
  idle_timeout: 20,
  connect_timeout: 10,
});
```

### 4. Redis 缓存 (可选)

对于频繁访问的数据,使用 Redis 缓存:

```bash
npm install ioredis
```

```typescript
// lib/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const fresh = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}
```

---

## 故障排查

### 问题 1: 数据库连接失败

**错误信息:**
```
Error: connect ECONNREFUSED
```

**解决方案:**
1. 检查 `DATABASE_URL` 是否正确
2. 确认 Railway 数据库状态
3. 检查网络连接

### 问题 2: Worker 无法下载 Space

**错误信息:**
```
Failed to download space: 403 Forbidden
```

**解决方案:**
1. 检查 `TWITTER_COOKIES` 是否有效
2. Cookies 可能过期,重新导出
3. Space 可能已被删除或设为私密

### 问题 3: OpenAI API 超时

**错误信息:**
```
OpenAI API timeout
```

**解决方案:**
1. 检查 API Key 额度
2. 增加超时时间
3. 使用音频切片减小请求大小

### 问题 4: 文件存储空间不足

**错误信息:**
```
ENOSPC: no space left on device
```

**解决方案:**
1. 清理旧的音频文件
2. 迁移到 S3 存储
3. 增加 Railway Volume 大小

---

## 生产环境检查清单

部署前检查:

- [ ] 所有环境变量已设置
- [ ] 数据库迁移已完成
- [ ] Worker 正常运行
- [ ] x402 支付测试通过
- [ ] API 端点测试通过
- [ ] 域名和 SSL 配置完成
- [ ] 错误监控已启用
- [ ] 数据库备份已配置
- [ ] 日志记录正常工作

性能检查:

- [ ] API 响应时间 < 500ms
- [ ] 数据库查询优化
- [ ] 静态资源 CDN 缓存
- [ ] 图片优化 (Next.js Image)

安全检查:

- [ ] 环境变量不在代码中
- [ ] CORS 配置正确
- [ ] SQL 注入防护 (Drizzle ORM)
- [ ] XSS 防护 (React 默认)
- [ ] HTTPS 强制启用

---

## 更新和发布

### 部署新版本

```bash
# 1. 提交更改
git add .
git commit -m "feat: add new feature"

# 2. 推送到 GitHub
git push origin v2-development

# 3. Vercel 和 Railway 自动部署
```

### 回滚

如果新版本有问题:

1. Vercel: 进入 Deployments → 选择之前的版本 → Promote to Production
2. Railway: 进入 Deployments → 选择之前的版本 → Redeploy

---

## 成本优化建议

1. **使用 Vercel 免费套餐** (100GB 流量/月)
2. **使用 Cloudflare R2 代替 AWS S3** (0 egress 费用)
3. **优化音频文件大小** (转码为低比特率)
4. **定期清理旧文件** (保留最近 30 天)
5. **使用 Redis 缓存热门数据**
6. **优化数据库查询** (索引、分页)

**预计成本:**
- Vercel: $0 (免费套餐)
- Railway: $5/月 (PostgreSQL + Worker)
- Cloudflare R2: $1-2/月 (存储)
- **总计: ~$6-7/月**
