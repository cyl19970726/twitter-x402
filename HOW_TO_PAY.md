# 如何支付测试

有 **3 种方式** 测试支付功能：

## 方式 1: 直接测试（推荐，无需支付）⭐

最简单的测试方式，直接调用数据库创建记录：

```bash
bun run scripts/test-direct.ts
```

这会：
1. ✅ 创建测试用户
2. ✅ 创建 Space 记录
3. ✅ 记录"支付"（模拟）
4. ✅ 入队转录任务
5. ✅ Worker 自动处理

**优点**：
- 无需真实支付
- 立即测试完整流程
- 适合开发调试

**查看结果**：
```bash
# 查看 Worker 日志
tail -f logs/worker.log

# 查看数据库
bun run db:studio
```

---

## 方式 2: 真实 x402 支付

使用 x402 协议进行真实 USDC 支付：

```bash
bun run scripts/test-payment.ts
```

**前提条件**：
- ✅ 钱包有足够 USDC（>0.2 USDC）
- ✅ 钱包有 ETH 用于 gas 费
- ✅ PRIVATE_KEY 配置正确
- ✅ Agent 运行在 8787 端口

**流程**：
1. 脚本读取你的 PRIVATE_KEY
2. 使用 x402Fetch 发送支付请求
3. 链上确认 USDC 转账
4. Agent 收到支付，创建任务

**价格**：
- Transcribe Space: 0.2 USDC
- Unlock Chat: 0.5 USDC
- Chat Query: 0.9 + 0.1n USDC

---

## 方式 3: 手动 cURL 测试（无支付）

直接调用 API 端点（会失败，但可以看到支付要求）：

```bash
# 测试 transcribe-space
curl -X POST http://localhost:8787/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "title": "Test Space"
  }'
```

**返回**：
```json
{
  "error": "Payment required",
  "x402": {
    "price": "0.2",
    "currency": "USDC",
    "network": "base",
    "payee": "0x58d2ff253998bc2f3b8f5bdbe9c52cad7b022739"
  }
}
```

这个方式可以验证 Agent 是否正常响应。

---

## 完整测试流程

### 1. 确保服务运行

```bash
# 终端 1: 启动后端
bun run dev:all

# 验证服务
curl http://localhost:8787/.well-known/agent.json
curl http://localhost:3001/health
```

### 2. 运行直接测试

```bash
bun run scripts/test-direct.ts
```

### 3. 观察处理过程

```bash
# 终端 2: 查看 Worker 日志
tail -f logs/worker.log
```

你会看到：
```
⏳ Waiting for jobs...
🔄 Processing job 1 for Space: 1RDxlAoOeQRKL
📥 Downloading Space audio...
🎤 Transcribing audio...
✨ Formatting transcript...
✅ Job 1 completed successfully
```

### 4. 验证结果

```bash
# 查看数据库
bun run db:studio

# 或查询 Space 状态
sqlite3 data/database/spaces.db "SELECT spaceId, status, title FROM spaces;"
```

---

## 测试不同功能

### 测试转录
```bash
bun run scripts/test-direct.ts
```

### 测试聊天解锁
```typescript
// 修改 test-direct.ts，添加：
import { recordChatUnlock } from '../src/services/paymentService';

await recordChatUnlock(TEST_WALLET, TEST_SPACE_ID, 'TEST_UNLOCK_TX');
```

### 测试聊天查询
```typescript
// 修改 test-direct.ts，添加：
import { chatWithSpaces } from '../src/services/chatService';

const result = await chatWithSpaces(
  [TEST_SPACE_ID],
  'What topics were discussed in this space?'
);
console.log(result.answer);
```

---

## 监控和调试

### 查看所有日志
```bash
# Agent 日志
tail -f logs/agent.log

# API 日志
tail -f logs/api.log

# Worker 日志
tail -f logs/worker.log
```

### 查看数据库状态
```bash
# 启动数据库管理界面
bun run db:studio

# 或直接查询
sqlite3 data/database/spaces.db
> SELECT * FROM spaces;
> SELECT * FROM jobs;
> SELECT * FROM transcription_payments;
```

### 检查文件生成
```bash
# 音频文件
ls -lh data/audio/

# 转录文件
ls -lh data/transcripts/
```

---

## 常见问题

### Q: Worker 不处理任务？

检查：
```bash
# Worker 是否运行？
ps aux | grep worker

# 任务是否在队列中？
sqlite3 data/database/spaces.db "SELECT * FROM jobs WHERE status='pending';"

# 查看 Worker 日志
tail -f logs/worker.log
```

### Q: 真实支付失败？

检查：
1. 钱包 USDC 余额
2. PRIVATE_KEY 是否正确
3. 网络配置（base 或 base-sepolia）
4. Facilitator 服务是否可用

### Q: 如何重置测试？

```bash
# 清空数据库
rm -rf data/database/spaces.db*
bun run scripts/migrate.ts

# 清空文件
rm -rf data/audio/*
rm -rf data/transcripts/*
```

---

## 推荐测试顺序

1. ✅ **先用直接测试**验证功能
   ```bash
   bun run scripts/test-direct.ts
   ```

2. ✅ **确认 Worker 正常处理**
   ```bash
   tail -f logs/worker.log
   ```

3. ✅ **查看生成的文件**
   ```bash
   ls data/transcripts/
   ```

4. ✅ **（可选）真实支付测试**
   ```bash
   bun run scripts/test-payment.ts
   ```

---

## 获取帮助

- 查看日志了解错误
- 使用 `bun run db:studio` 检查数据
- 运行 `bun run check` 验证环境
- 参考 `QUICKSTART.md` 了解详细流程
