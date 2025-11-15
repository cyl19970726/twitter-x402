# 流式端点测试指南

## 📋 环境变量配置

### 必需的环境变量

在 `.env` 文件中添加以下配置：

```bash
# ============================================
# 必需变量 (Required)
# ============================================

# 1. 私钥 - 用于 x402 支付签名
PRIVATE_KEY=0x1234567890abcdef...

# 2. Agent 服务器地址
RESOURCE_SERVER_URL=http://localhost:8787

# ============================================
# 可选变量 (Optional)
# ============================================

# 3. 测试用的 Twitter Space URL（可选，有默认值）
TEST_SPACE_URL=https://x.com/i/spaces/1RDxlAoOeQRKL

# ============================================
# Agent 运行所需的其他变量
# ============================================

# OpenAI API Key（用于 Whisper 和 GPT-4o）
OPENAI_API_KEY=sk-proj-...

# Twitter Cookies（用于下载 Space）
TWITTER_COOKIES=[{"key":"auth_token","value":"..."},{"key":"ct0","value":"..."}]

# 支付网络配置
NETWORK=base-sepolia
PAY_TO=0xYourWalletAddress
FACILITATOR_URL=https://facilitator.daydreams.systems
```

## 🔑 如何获取环境变量

### 1. PRIVATE_KEY

这是用于签署 x402 支付的私钥。

**生成新钱包**（如果你没有）:
```bash
# 使用 cast (foundry)
cast wallet new

# 或使用任何 EVM 钱包生成器
```

**注意**:
- ⚠️ 不要使用存有大量资金的钱包
- ⚠️ 只用于测试的专用钱包
- ⚠️ 不要将私钥提交到 Git

### 2. RESOURCE_SERVER_URL

这是 Agent 服务器的地址。

**本地开发**:
```bash
RESOURCE_SERVER_URL=http://localhost:8787
```

**远程部署**:
```bash
RESOURCE_SERVER_URL=https://your-agent.example.com
```

### 3. TEST_SPACE_URL（可选）

用于测试的 Twitter Space URL。

**默认值**: `https://x.com/i/spaces/1RDxlAoOeQRKL`

**自定义**:
```bash
TEST_SPACE_URL=https://x.com/i/spaces/YOUR_SPACE_ID
```

**要求**:
- ✅ Space 必须已结束
- ✅ Space 必须可以重播（`is_space_available_for_replay: true`）
- ✅ Space 录音可用

## 🚀 运行测试

### 步骤 1: 启动 Agent 服务器

在一个终端窗口中：

```bash
bun run src/index.ts
```

你应该看到：
```
🚀 Agent ready at http://localhost:8787/.well-known/agent.json
```

### 步骤 2: 运行测试脚本

在另一个终端窗口中：

#### 测试流式端点（默认）
```bash
bun run tests/testStreamingEndpoint.ts stream
```

#### 测试非流式端点
```bash
bun run tests/testStreamingEndpoint.ts invoke
```

#### 同时测试两个端点
```bash
bun run tests/testStreamingEndpoint.ts both
```

## 📊 预期输出

### 流式端点输出示例

```
🧪 Twitter Space 流式 API 测试
============================================================

✅ 环境变量配置:
   PRIVATE_KEY: 0x1234567...
   RESOURCE_SERVER_URL: http://localhost:8787
   TEST_SPACE_URL: https://x.com/i/spaces/1RDxlAoOeQRKL

🧪 测试 1: 流式端点 (SSE)

Endpoint: http://localhost:8787/entrypoints/format-twitter-space/stream
Space URL: https://x.com/i/spaces/1RDxlAoOeQRKL

📡 开始接收流式数据...

============================================================

⏳ Step 1/3: Downloading Space audio...

✓ Step 1/3: Audio downloaded successfully
  Title: "Launch an <x402 startup> in 20 minutes"
  Size: 35.24 MB

⏳ Step 2/3: Transcribing audio with Whisper API...

✓ Step 2/3: Transcription complete
  Characters: 45,230
  Duration: 36m 0s

⏳ Step 3/3: Formatting transcript with GPT-4o...

✓ Step 3/3: Formatting complete
  Participants: 8
  Speakers: Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey

✅ Processing complete in 245.3s!

============================================================

✅ 处理完成!

📊 最终结果:
   Run ID: run_abc123
   Status: completed
   Title: Launch an <x402 startup> in 20 minutes
   Duration: 2160.7s
   Participants: 8
   Speakers: Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey

💰 成本估算:
   Whisper API: $0.216
   GPT-4o: $0.48
   Total: $0.696

⏱️  处理时间: 245.3s
📝 输出字符数: 45,230

============================================================

⏱️  总耗时: 246.1s
```

### 非流式端点输出示例

```
🧪 测试 2: 非流式端点 (JSON)

Endpoint: http://localhost:8787/entrypoints/format-twitter-space/invoke
Space URL: https://x.com/i/spaces/1RDxlAoOeQRKL

⏳ 等待处理完成（无进度更新）...

============================================================

✅ 处理完成!

📊 结果:
   Run ID: run_def456
   Status: completed
   Title: Launch an <x402 startup> in 20 minutes
   Duration: 2160.7s
   Participants: 8
   Speakers: Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey

💰 成本估算:
   Whisper API: $0.216
   GPT-4o: $0.48
   Total: $0.696

⏱️  处理时间: 245.3s
   总耗时: 246.1s

============================================================
```

## ⚠️ 常见问题

### Q1: "Missing required environment variables"

**原因**: 缺少 `PRIVATE_KEY` 环境变量

**解决**:
```bash
# 在 .env 文件中添加
PRIVATE_KEY=0x...
```

### Q2: "ECONNREFUSED"

**原因**: Agent 服务器未运行

**解决**:
```bash
# 在另一个终端启动服务器
bun run src/index.ts
```

### Q3: "Failed to fetch Audio Space"

**原因**: Twitter cookies 无效或过期

**解决**:
1. 参考 `docs/COOKIE_EXPORT_GUIDE.md` 重新导出 cookies
2. 更新 `.env` 中的 `TWITTER_COOKIES`

### Q4: "Space is not available for replay"

**原因**: 测试的 Space 不可重播

**解决**:
```bash
# 使用另一个可重播的 Space
TEST_SPACE_URL=https://x.com/i/spaces/ANOTHER_SPACE_ID
```

## 💡 使用技巧

### 1. 测试不同长度的 Space

```bash
# 短 Space（~10 分钟）
TEST_SPACE_URL=https://x.com/i/spaces/SHORT_ID bun run tests/testStreamingEndpoint.ts stream

# 长 Space（~1 小时）
TEST_SPACE_URL=https://x.com/i/spaces/LONG_ID bun run tests/testStreamingEndpoint.ts stream
```

### 2. 对比流式 vs 非流式

```bash
# 运行对比测试
bun run tests/testStreamingEndpoint.ts both
```

观察：
- 流式端点提供实时进度
- 非流式端点等待时间相同，但无反馈
- 最终结果完全一致

### 3. 监控支付情况

测试脚本会显示支付信息：
```
💳 支付信息:
   Transaction: 0x123...
   Amount: 200000
```

### 4. 性能测试

使用不同网络条件测试：
```bash
# 本地
RESOURCE_SERVER_URL=http://localhost:8787 bun run tests/testStreamingEndpoint.ts

# 远程
RESOURCE_SERVER_URL=https://your-agent.railway.app bun run tests/testStreamingEndpoint.ts
```

## 📝 环境变量完整示例

**`.env` 文件完整示例**:

```bash
# ============================================
# 测试脚本需要
# ============================================
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
RESOURCE_SERVER_URL=http://localhost:8787
TEST_SPACE_URL=https://x.com/i/spaces/1RDxlAoOeQRKL

# ============================================
# Agent 服务器需要
# ============================================

# OpenAI
OPENAI_API_KEY=sk-proj-abc123xyz...

# Twitter
TWITTER_COOKIES=[{"key":"auth_token","value":"abc123...","domain":".twitter.com","path":"/"},{"key":"ct0","value":"xyz789...","domain":".twitter.com","path":"/"}]

# x402 支付
NETWORK=base-sepolia
PAY_TO=0xYourWalletAddress123...
FACILITATOR_URL=https://facilitator.daydreams.systems
DEFAULT_PRICE=1000000
PRICE_FORMAT_SPACE=200000
PRICE_SUMMARIZE_SPACE=150000

# HTTP
PORT=8787
```

## 🎯 下一步

1. ✅ 配置环境变量
2. ✅ 启动 Agent 服务器
3. ✅ 运行测试脚本
4. ✅ 观察流式输出
5. ✅ 对比 invoke vs stream
6. 🚀 集成到你的应用中！

## 📚 相关文档

- [USAGE_GUIDE.md](../docs/USAGE_GUIDE.md) - Agent 使用指南
- [COOKIE_EXPORT_GUIDE.md](../docs/COOKIE_EXPORT_GUIDE.md) - Cookie 导出指南
- [testStreaming.md](./testStreaming.md) - 流式 API 详细文档
