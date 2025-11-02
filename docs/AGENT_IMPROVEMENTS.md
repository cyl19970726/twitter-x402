# agent-improved.ts 改进说明

## 概述

`src/agent-improved.ts` 是 `src/agent.ts` 的改进版本，展示了如何更好地利用 agent-kit 的高级功能。

## 主要改进

### 1. ✅ Per-entrypoint 定价

**之前 (agent.ts)**:
```typescript
const configOverrides: AgentKitConfig = {
  payments: {
    defaultPrice: "0.1",  // 所有 entrypoint 使用同一价格
  },
};

addEntrypoint({
  key: "format-twitter-space",
  // 没有 price 字段
});
```

**现在 (agent-improved.ts)**:
```typescript
// 💰 从环境变量读取定价配置
const NETWORK = process.env.NETWORK ?? "base-sepolia";
const PRICE_FORMAT_SPACE = process.env.PRICE_FORMAT_SPACE ?? "2000000"; // 0.002 USDC
const PRICE_SUMMARIZE_SPACE = process.env.PRICE_SUMMARIZE_SPACE ?? "1500000"; // 0.0015 USDC
const PRICE_HEALTH = process.env.PRICE_HEALTH ?? "0"; // 免费

addEntrypoint({
  key: "format-twitter-space",
  price: PRICE_FORMAT_SPACE,  // 从环境变量读取
  network: NETWORK,
});

addEntrypoint({
  key: "summarize-twitter-space",
  price: PRICE_SUMMARIZE_SPACE,  // 从环境变量读取
  network: NETWORK,
});

addEntrypoint({
  key: "health",
  price: PRICE_HEALTH,  // 从环境变量读取，默认免费
});
```

**优势**:
- 🎯 根据服务复杂度差异化定价
- 💰 格式化（包含说话人识别）比总结更贵
- 🆓 健康检查免费，方便用户测试
- ⚙️ 所有定价通过环境变量配置，灵活调整
- 📊 启动时显示完整的定价信息

### 2. ✅ 成本透明度

**之前 (agent.ts)**:
```typescript
output: z.object({
  formattedTranscript: z.string(),
  participants: z.array(z.string()),
  title: z.string(),
  duration: z.number().optional(),
});

return {
  output: {
    formattedTranscript: result.formattedTranscriptMarkdown,
    participants: result.formattedTranscript.participants,
    title: result.metadata.title,
    duration: result.transcription.duration,
  }
};
```

**现在 (agent-improved.ts)**:
```typescript
output: z.object({
  formattedTranscript: z.string(),
  participants: z.array(z.string()),
  title: z.string(),
  duration: z.number().optional(),
  // 新增：成本透明度
  costBreakdown: z.object({
    whisper: z.number().describe("Whisper API cost in USD"),
    gpt4o: z.number().describe("GPT-4o formatting cost in USD"),
    total: z.number().describe("Total processing cost in USD"),
  }).optional(),
});

// 计算实际成本
const audioDurationMin = (result.transcription.duration || 0) / 60;
const whisperCost = audioDurationMin * 0.006; // $0.006/min
const gpt4oCost = 0.48; // 估算

return {
  output: {
    // ...其他字段
    costBreakdown: {
      whisper: parseFloat(whisperCost.toFixed(4)),
      gpt4o: gpt4oCost,
      total: parseFloat((whisperCost + gpt4oCost).toFixed(4)),
    }
  }
};
```

**优势**:
- 📊 用户可以看到你的实际成本
- 🤝 建立信任（透明定价）
- 💡 帮助 AI Agent 做成本决策

### 3. ✅ 使用情况报告

**之前 (agent.ts)**:
```typescript
return {
  output: { ... }
};
```

**现在 (agent-improved.ts)**:
```typescript
return {
  output: { ... },
  usage: {
    total_tokens: result.transcription.text.length,
    processing_time_seconds: duration,
  },
  model: "whisper-1 + gpt-4o + gpt-4o-mini"
};
```

**优势**:
- 📈 跟踪资源使用
- ⏱️ 记录处理时间
- 🔍 标识使用的模型

### 4. ✅ 免费健康检查

**新增 entrypoint**:
```typescript
addEntrypoint({
  key: "health",
  description: "Health check endpoint",
  price: "0",  // 免费
  
  input: z.object({}),
  output: z.object({
    status: z.string(),
    version: z.string(),
    capabilities: z.array(z.string()),
    paymentNetwork: z.string(),
  }),
  
  async handler() {
    return {
      output: {
        status: "healthy",
        version: "1.0.0",
        capabilities: [
          "Twitter Space Download",
          "Audio Transcription (Whisper)",
          "Speaker Identification (GPT-4o)",
          "AI Summarization (GPT-4o-mini)",
          "x402 Payments"
        ],
        paymentNetwork: config.payments?.network || "none",
      }
    };
  }
});
```

**优势**:
- 🏥 监控服务健康状态
- 🆓 免费调用，方便测试
- 📋 显示服务能力清单

### 5. ⚠️ 高级功能（已注释）

#### ERC-8004 Trust Configuration

用于链上身份注册和信任系统，需要额外配置：

```typescript
// 已注释，如需启用请取消注释并配置环境变量
trust: {
  registrations: [{
    namespace: "dns",
    identifier: process.env.AGENT_DOMAIN,
    chainId: 84532,
    registryAddress: process.env.IDENTITY_REGISTRY_ADDRESS,
    agentId: process.env.AGENT_ID,
    agentAddress: process.env.AGENT_ADDRESS,
  }],
  trustModels: [{
    name: "community-reputation",
    version: "1.0"
  }]
}
```

#### AP2 Extension

声明 Agent Payments Protocol 角色：

```typescript
// 已注释
ap2: {
  version: "0.1.0",
  roles: [{
    role: "merchant",
    required: true,
    description: "Payment receiver"
  }]
}
```

## 移除的内容

### ❌ createAxLLMClient

**原因**: 我们的 LLM 调用在 `utils/` 中使用 OpenAI SDK 直接完成。

**之前**:
```typescript
const axClient = createAxLLMClient({ ... });
```

**现在**: 已移除，添加了说明注释。

**何时需要 axClient**:
- 如果在 entrypoint handler 中直接调用 LLM
- 如果需要 x402 支付的 LLM 调用
- 如果需要统一的 LLM 客户端接口

## 环境变量配置

### 基础配置（必需）

```bash
# x402 支付配置
FACILITATOR_URL=https://facilitator.daydreams.systems
PAY_TO=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429
NETWORK=base-sepolia
DEFAULT_PRICE=1000000  # 0.001 USDC

# Per-entrypoint 定价（基本单位，1 USDC = 1000000）
PRICE_FORMAT_SPACE=2000000      # 0.002 USDC - 格式化服务
PRICE_SUMMARIZE_SPACE=1500000   # 0.0015 USDC - 总结服务
PRICE_HEALTH=0                  # 免费 - 健康检查
```

### 高级配置（可选）

```bash
# ERC-8004 身份注册
REGISTER_IDENTITY=true
AGENT_DOMAIN=twitter-space-agent.example.com
CHAIN_ID=84532  # Base Sepolia
IDENTITY_REGISTRY_ADDRESS=0x...
AGENT_ID=your-agent-id
AGENT_ADDRESS=0x...

# 信任验证
VALIDATION_URI=https://your-service.com/validate
FEEDBACK_URI=https://your-service.com/feedback
```

## 使用方式

### 启动服务

```bash
# 使用改进版
bun run src/index.ts
# 修改 index.ts 引入 agent-improved.ts 而不是 agent.ts
```

### 测试 entrypoint

```bash
# 1. 健康检查（免费）
curl -X POST http://localhost:8787/invoke/health \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. 格式化 Space（0.002 USDC）
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -H "Payment-Hash: YOUR_PAYMENT_HASH" \
  -d '{"spaceUrl": "https://x.com/i/spaces/ABC123"}'

# 3. 总结 Space（0.0015 USDC）
curl -X POST http://localhost:8787/invoke/summarize-twitter-space \
  -H "Content-Type: application/json" \
  -H "Payment-Hash: YOUR_PAYMENT_HASH" \
  -d '{"spaceUrl": "https://x.com/i/spaces/ABC123"}'
```

## 对比总结

| 功能 | agent.ts | agent-improved.ts |
|------|----------|-------------------|
| **Per-entrypoint 定价** | ❌ | ✅ |
| **成本透明度** | ❌ | ✅ |
| **使用情况报告** | ❌ | ✅ |
| **健康检查** | ❌ | ✅ (免费) |
| **ERC-8004 Trust** | ❌ | ⚠️ (已注释) |
| **AP2 扩展** | ❌ | ⚠️ (已注释) |
| **axClient** | ✅ (未使用) | ❌ (已移除) |

## 最佳实践

1. **定价策略**
   - 根据服务复杂度差异化定价
   - 提供免费的健康检查
   - 显示成本透明度建立信任

2. **用户体验**
   - 报告处理时间
   - 显示使用的模型
   - 提供详细的成本分解

3. **可维护性**
   - 清晰的注释
   - 高级功能可选
   - 简化的配置

## 下一步改进

1. **流式传输** - 为长时间运行的任务添加 SSE 进度更新
2. **错误处理** - 更详细的错误信息和重试机制
3. **缓存** - 缓存已处理的 Space 结果
4. **监控** - 添加日志和指标收集

## 参考资料

- [agent-kit 文档](https://docs.claude.com/en/docs/claude-code/agent-kit)
- [x402 协议](https://x402.org)
- [ERC-8004 标准](https://eips.ethereum.org/EIPS/eip-8004)
