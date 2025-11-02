# 快速开始指南

## 前置要求

- ✅ [Bun](https://bun.sh/) >= 1.0
- ✅ OpenAI API Key
- ✅ Twitter/X 账号（用于导出 cookies）
- ✅ FFmpeg（用于下载 Space 音频）

## 1️⃣ 安装依赖

```bash
# 克隆或进入项目目录
cd /Users/hhh0x/meme/agents/dreams

# 安装依赖
bun install
```

## 2️⃣ 配置环境变量

### 方法 1: 复制模板（推荐）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
# 至少需要填写以下两个必填项：
# 1. OPENAI_API_KEY
# 2. TWITTER_COOKIES
```

### 方法 2: 手动创建

创建 `.env` 文件，包含以下内容：

```bash
# ===== 必填项 =====

# OpenAI API Key（用于 Whisper 转录和 GPT 处理）
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Twitter Cookies（用于下载 Space）
TWITTER_COOKIES=[{"key":"auth_token","value":"YOUR_AUTH_TOKEN","domain":".twitter.com","path":"/"},{"key":"ct0","value":"YOUR_CT0_TOKEN","domain":".twitter.com","path":"/"}]

# ===== 可选项（有默认值）=====

# HTTP 服务配置
PORT=8787
API_BASE_URL=http://localhost:8787

# x402 支付配置
NETWORK=base-sepolia
PAY_TO=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429
FACILITATOR_URL=https://facilitator.daydreams.systems
DEFAULT_PRICE=1000000

# Per-entrypoint 定价
PRICE_FORMAT_SPACE=2000       # 0.002 USDC
PRICE_SUMMARIZE_SPACE=1500    # 0.0015 USDC
PRICE_HEALTH=0                # 免费
```

## 3️⃣ 获取 Twitter Cookies

### 快速方法

```bash
# 运行 Cookie 构建工具
bun run src/buildCookies.ts <auth_token> <ct0>

# 示例
bun run src/buildCookies.ts 9a7774acf94b12a2e9848af60c6e43f2dedaed50 d054557eb4a9a8c21576e73f0d2a303055f25984d2979b1b0597b6d98feb80ab4b46ccdfed05438aa51618dcd414c26bcfb6ddbbe0a7d1257a85db3ef3737633f3facf2e1d336b1de21df34e0ae88e1a
```

### 手动方法

1. 在浏览器中登录 Twitter/X
2. 打开开发者工具 (F12)
3. 进入 Application/Storage → Cookies → https://x.com
4. 找到并复制这两个 cookie：
   - `auth_token`
   - `ct0`
5. 按照上面的 JSON 格式填入 `.env`

详细步骤参考：[docs/COOKIE_EXPORT_GUIDE.md](./COOKIE_EXPORT_GUIDE.md)

## 4️⃣ 验证配置

### 测试 1: 验证环境变量

```bash
bun run tests/testPricing.ts
```

预期输出：
```
=== 测试定价配置 ===

环境变量:
  NETWORK: base-sepolia
  PRICE_FORMAT_SPACE: 2000
  PRICE_SUMMARIZE_SPACE: 1500
  PRICE_HEALTH: 0

转换为 USDC:
  format-twitter-space: $0.0020 (2000 base units)
  summarize-twitter-space: $0.0015 (1500 base units)
  health: $0.0000 (free)

✅ 定价配置测试通过
```

### 测试 2: 验证 Twitter 认证

```bash
bun run tests/testAuth.ts
```

预期输出：
```
=== Testing Twitter Authentication ===

Cookie format verified:
✓ Found 2 cookies

Testing authentication...
✓ Successfully authenticated as: your_username
✓ User ID: 123456789

✅ Authentication test passed!
```

### 测试 3: 测试完整下载流程（可选）

```bash
# 使用真实的 Space URL 测试
bun run tests/testDownload.ts https://x.com/i/spaces/1RDxlAoOeQRKL
```

## 5️⃣ 启动服务

### 使用基础版本 (agent.ts)

```bash
# 启动服务
bun run src/index.ts
```

### 使用改进版本 (agent-improved.ts)

首先修改 `src/index.ts`：

```typescript
// 将第 1 行从：
import { app } from "./agent";

// 改为：
import { app } from "./agent-improved";
```

然后启动：

```bash
bun run src/index.ts
```

预期输出：

```
💰 Payment configuration:
   Network: base-sepolia
   Pay to: 0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429
   Facilitator: https://facilitator.daydreams.systems
   Default price: 1000000 base units

💵 Per-entrypoint pricing:
   format-twitter-space: 2000 base units (0.0020 USDC)
   summarize-twitter-space: 1500 base units (0.0015 USDC)
   health: 0 base units (free)

🚀 Agent ready at http://localhost:8787/.well-known/agent.json
```

## 6️⃣ 测试 Agent

### 查看 Agent Manifest

```bash
curl http://localhost:8787/.well-known/agent.json | jq .
```

预期输出：

```json
{
  "name": "twitter-space-summarizer",
  "version": "1.0.0",
  "description": "AI-powered agent that downloads, transcribes, and summarizes Twitter Spaces...",
  "entrypoints": [
    {
      "key": "format-twitter-space",
      "description": "Download and transcribe a Twitter Space...",
      "price": "2000",
      "network": "base-sepolia",
      "input": {...},
      "output": {...}
    },
    {
      "key": "summarize-twitter-space",
      ...
    },
    {
      "key": "health",
      ...
    }
  ]
}
```

### 测试健康检查（免费）

```bash
curl -X POST http://localhost:8787/invoke/health \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

预期输出：

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "capabilities": [
    "Twitter Space Download",
    "Audio Transcription (Whisper)",
    "Speaker Identification (GPT-4o)",
    "AI Summarization (GPT-4o-mini)",
    "x402 Payments"
  ],
  "paymentNetwork": "base-sepolia"
}
```

### 测试格式化 Space

```bash
# 注意：这需要 x402 支付，如果没有配置支付，会返回 402 Payment Required
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"}' | jq .
```

## 7️⃣ 使用独立测试脚本

如果只想测试特定功能（不需要启动完整服务）：

```bash
# 1. 测试下载
bun run tests/testDownload.ts https://x.com/i/spaces/1RDxlAoOeQRKL

# 2. 测试转录（需要先下载音频）
bun run tests/testTranscribe.ts /tmp/space_1RDxlAoOeQRKL.m4a

# 3. 测试格式化（需要转录文本）
bun run tests/testFormat.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt

# 4. 测试总结（需要转录文本）
bun run tests/testSummarize.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt

# 5. 端到端测试（完整流程）
bun run tests/testEndToEnd.ts https://x.com/i/spaces/1RDxlAoOeQRKL
```

## 常见问题排查

### ❌ "Missing OPENAI_API_KEY"

**问题**: 没有配置 OpenAI API key

**解决**:
```bash
# 在 .env 中添加
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

### ❌ "Missing TWITTER_COOKIES"

**问题**: 没有配置 Twitter cookies

**解决**: 参考步骤 3 导出 Twitter cookies

### ❌ "Failed to fetch Audio Space"

**可能原因**:
1. Cookies 过期 → 重新导出 cookies
2. Space URL 错误 → 检查 URL 格式
3. Space 不可重播 → 只能处理可重播的 Space

**验证**:
```bash
# 验证 cookies 是否有效
bun run tests/testAuth.ts
```

### ❌ "Audio file is too large"

**问题**: Space 音频超过 25MB（Whisper API 限制）

**解决**: 目前只支持约 40 分钟以内的 Space

### ❌ Port 8787 已被占用

**解决**:
```bash
# 修改 .env 中的端口
PORT=3000

# 或者杀掉占用端口的进程
lsof -ti:8787 | xargs kill -9
```

## 项目结构

```
dreams/
├── src/
│   ├── agent.ts                # 基础版 Agent
│   ├── agent-improved.ts       # 改进版 Agent（推荐）
│   ├── index.ts                # HTTP 服务入口
│   └── utils/                  # 核心功能
│       ├── downloadSpace.ts    # 下载 Space
│       ├── transcribeAudio.ts  # Whisper 转录
│       ├── formatTranscript.ts # GPT-4o 格式化
│       └── summarizeTranscript.ts # GPT-4o-mini 总结
├── tests/                      # 测试脚本
│   ├── testAuth.ts
│   ├── testDownload.ts
│   ├── testEndToEnd.ts
│   └── testPricing.ts
├── docs/                       # 文档
│   ├── QUICKSTART.md          # 本文档
│   ├── ENVIRONMENT_VARIABLES.md
│   ├── COOKIE_EXPORT_GUIDE.md
│   └── AGENT_IMPROVEMENTS.md
└── .env                        # 环境变量配置
```

## 下一步

1. **测试完整流程**
   ```bash
   bun run tests/testEndToEnd.ts https://x.com/i/spaces/YOUR_SPACE_URL
   ```

2. **部署到生产环境**
   - 配置域名和 HTTPS
   - 设置环境变量
   - 配置支付钱包

3. **自定义定价**
   - 修改 `.env` 中的定价配置
   - 重启服务生效

4. **监控和日志**
   - 检查日志输出
   - 监控 API 使用量
   - 跟踪成本

## 获取帮助

- 📖 [完整文档](./README.md)
- 🔑 [环境变量说明](./ENVIRONMENT_VARIABLES.md)
- 🍪 [Cookie 导出指南](./COOKIE_EXPORT_GUIDE.md)
- 🚀 [Agent 改进说明](./AGENT_IMPROVEMENTS.md)

## 快速参考

```bash
# 常用命令
bun install                     # 安装依赖
bun run src/index.ts           # 启动服务
bun run tests/testAuth.ts      # 测试认证
bun run tests/testEndToEnd.ts <url>  # 端到端测试

# 环境变量
OPENAI_API_KEY=...             # OpenAI API key
TWITTER_COOKIES=...            # Twitter cookies
PRICE_FORMAT_SPACE=2000        # 格式化价格
PRICE_SUMMARIZE_SPACE=1500     # 总结价格
```

Happy coding! 🎉
