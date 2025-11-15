# 开发环境搭建

## 前置要求

- **Bun** >= 1.0
- **Node.js** >= 20 (可选，主要用 Bun)
- **Git**
- **FFmpeg** (用于音频处理)

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd twitter-space-agent
```

### 2. 安装依赖

```bash
bun install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必需的环境变量：

```bash
# OpenAI API Key (必需)
OPENAI_API_KEY=sk-...

# Twitter Cookies (必需)
TWITTER_COOKIES=[{"name":"auth_token","value":"..."}]

# x402 支付配置 (必需)
PRIVATE_KEY=0x...
PAY_TO=0x...
NETWORK=base
FACILITATOR_URL=https://facilitator.daydreams.systems

# 数据库 (开发环境使用 SQLite)
DATABASE_URL=./data/database/spaces.db

# WalletConnect (前端)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 4. 初始化数据库

```bash
bun run scripts/migrate.ts
```

### 5. 启动开发服务器

```bash
# 方式 1: 启动所有服务（后端 + 前端 + Worker）
bun run dev:all

# 方式 2: 分别启动

# 终端 1 - 后端 API
bun run dev

# 终端 2 - 前端
bun run dev:frontend

# 终端 3 - 后台 Worker（可选）
bun run worker
```

### 6. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8787
- **Agent Manifest**: http://localhost:8787/.well-known/agent.json

---

## 开发工具

### 数据库管理

```bash
# 启动 Drizzle Studio（可视化数据库管理）
bun run db:studio

# 生成新的 migration
bun run db:generate

# 应用 migrations
bun run db:migrate
```

### 测试

```bash
# 运行所有测试
bun test

# 测试特定功能
bun run tests/testDownload.ts
bun run tests/testTranscribe.ts

# 端到端测试
bun run scripts/test-direct.ts
```

### 日志查看

```bash
# 实时查看日志
tail -f logs/agent.log
tail -f logs/worker.log
tail -f logs/frontend.log
```

---

## 目录结构

```
twitter-space-agent/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── index.html
├── src/               # 后端源码
│   ├── agent/         # x402 Agent
│   ├── api/           # 免费 API
│   ├── db/            # 数据库层
│   ├── services/      # 业务逻辑
│   ├── utils/         # 工具函数
│   └── worker/        # 后台任务
├── scripts/           # 实用脚本
├── tests/             # 测试文件
├── docs/              # 文档
└── data/              # 数据存储
```

---

## 环境变量说明

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-proj-...` |
| `TWITTER_COOKIES` | Twitter 认证 cookies | `[{...}]` |
| `PRIVATE_KEY` | 钱包私钥（用于接收支付） | `0x...` |
| `PAY_TO` | 收款地址 | `0x...` |

### 可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8787` | 后端端口 |
| `NETWORK` | `base` | 区块链网络 |
| `DATABASE_URL` | `./data/database/spaces.db` | 数据库路径 |
| `AUDIO_CHUNK_DURATION_MINUTES` | `10` | 音频切片时长 |

---

## 常见问题

### Q: 如何获取 Twitter Cookies？

1. 登录 Twitter
2. 打开浏览器开发者工具 (F12)
3. 找到 Cookies 中的 `auth_token`
4. 按照 JSON 格式配置到 `.env`

### Q: 如何获取 WalletConnect Project ID？

1. 访问 https://cloud.walletconnect.com
2. 注册账号并创建项目
3. 复制 Project ID 到 `.env`

### Q: FFmpeg 如何安装？

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# 下载并安装: https://ffmpeg.org/download.html
```

### Q: 数据库错误怎么办？

```bash
# 删除旧数据库重新创建
rm -rf data/database
mkdir -p data/database
bun run scripts/migrate.ts
```

---

## 下一步

- 阅读 [项目结构](project-structure.md) 了解代码组织
- 查看 [API 端点](../api/endpoints.md) 了解 API 使用
- 参考 [数据流详解](../technical/data-pipeline.md) 理解处理流程
