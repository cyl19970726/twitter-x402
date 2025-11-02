# 理解 agent-kit：为 AI Agent 构建可发现的服务

## 1. 引言：agent-kit 解决什么问题？

### 传统 API 的局限性

当我们构建传统的 REST API 时，通常是为**人类开发者**设计的：

```typescript
// 传统 Express API
app.post('/api/summarize', (req, res) => {
  const { text } = req.body;
  const summary = summarize(text);
  res.json({ summary });
});

// 使用方式：
// 1. 开发者阅读 API 文档
// 2. 手动构造 HTTP 请求
// 3. 处理支付（注册账号、绑定信用卡）
// 4. 集成到应用中
```

**问题**：AI Agent 如何使用这个 API？

- ❌ AI Agent 怎么**发现**这个服务的存在？
- ❌ AI Agent 怎么**理解**输入/输出格式？
- ❌ AI Agent 怎么**自动支付**？
- ❌ AI Agent 怎么**验证信任**（这个服务可靠吗）？

### AI Agent 时代的新需求

想象一个 AI Agent 需要完成任务："总结这个 Twitter Space"

```typescript
// AI Agent 的理想工作流程
async function completeTask(task: string) {
  // 1. 自动发现可用的服务
  const services = await discoverServices("twitter space transcription");

  // 2. 理解服务的能力和价格
  const service = services[0];
  console.log(service.capabilities);  // ["format", "summarize"]
  console.log(service.price);         // "0.002 USDC"

  // 3. 自动支付
  const payment = await payForService(service.price);

  // 4. 调用服务
  const result = await callService(service, { spaceUrl: "..." });

  return result;
}

// ✅ 全程自动化，无需人类干预
```

### agent-kit 的核心价值主张

**agent-kit 让你的服务可以被 AI Agent 自动发现、理解和调用。**

```
传统 API：人类 → 文档 → 手动集成 → 调用
          ↓
agent-kit：AI Agent → 自动发现 → 自动支付 → 调用
```

## 2. 核心概念澄清

### 2.1 agent-kit 不是什么

❌ **不是 AI Agent 框架**
```typescript
// agent-kit 不是用来创建这种 AI Agent
const agent = new OpenAIAgent({
  tools: [calculator, webSearch],
  llm: new ChatOpenAI(),
  systemPrompt: "You are a helpful assistant..."
});
// ↑ 这是 LangChain、AutoGPT、Crew AI 的工作
```

❌ **不提供 AI 推理能力**
- 没有 LLM 调用（你需要自己集成 OpenAI/Claude）
- 没有 Agent 规划能力
- 没有自主决策能力

### 2.2 agent-kit 是什么

✅ **Agent-to-Agent 服务框架**

agent-kit 帮助你构建**被 AI Agent 调用的服务**：

```typescript
// 你用 agent-kit 创建的服务
const service = createAgentApp({
  name: "twitter-space-summarizer"
});

// 这个服务会被其他 AI Agent 当作 tool 使用
const aiAgent = new OpenAIAgent({
  tools: [
    calculator,
    webSearch,
    yourAgentKitService  // ← 你的服务在这里
  ]
});
```

✅ **标准化的服务发布框架**

```
agent-kit = Express/Fastify（Web 框架）
            + 自动服务发现（Manifest）
            + 内置支付协议（x402）
            + 身份信任系统（ERC-8004）
```

### 2.3 命名的困惑：createAgentApp

```typescript
// ❌ 容易误解的命名
const { app } = createAgentApp({  // "Agent App"？听起来像创建 AI Agent
  name: "twitter-space-summarizer"
});

// ✅ 更准确的理解
// 实际上是：createToolService()、createA2AService()
// 创建的是："可被 AI Agent 调用的工具服务"
```

**为什么叫 "Agent App"？**

在 **Agent-to-Agent (A2A)** 生态中，"Agent" 可以指：
- 🤖 **AI Agent**（服务消费者）— 调用工具的 Agent
- 🛠️ **Service Agent**（服务提供者）— 提供工具的 Agent ← 你的服务

但这确实容易与 "AI Agent" 混淆！

### 2.4 关键术语

| 术语 | 含义 | 示例 |
|------|------|------|
| **Service Provider** | 提供工具的服务（你的 agent-kit 服务） | twitter-space-summarizer |
| **AI Agent** | 调用工具的智能代理 | LangChain Agent, Claude |
| **Entrypoint** | 服务对外暴露的功能单元 | format-twitter-space |
| **Tool** | AI Agent 可以调用的能力 | 从 Agent 视角看，Entrypoint 就是 Tool |
| **A2A** | Agent-to-Agent 协议 | 标准化的 Agent 间通信协议 |
| **x402** | HTTP 支付协议 | 基于 HTTP 402 状态码的支付机制 |
| **Manifest** | 服务能力描述文件 | /.well-known/agent.json |

## 3. agent-kit 的架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│  Level 1: 用户 (Human)                                      │
│  "请帮我总结这个 Twitter Space"                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Level 2: AI Agent (真正的 Agent)                           │
│  - LangChain/AutoGPT/Claude                                 │
│  - 有自主决策能力                                           │
│  - 可以规划、推理、调用工具                                 │
│                                                             │
│  Available Tools:                                           │
│  ├─ calculator                                              │
│  ├─ web_search                                              │
│  └─ twitter-space-summarizer  ← 你的 agent-kit 服务        │
│                                                             │
│  Agent 决定: "我需要调用 twitter-space-summarizer"         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Level 3: 你的 agent-kit 服务 (Tool Provider)               │
│                                                             │
│  const { app, addEntrypoint } = createAgentApp({...})      │
│                                                             │
│  Entrypoints (对外提供的工具):                              │
│  ├─ format-twitter-space                                    │
│  └─ summarize-twitter-space                                 │
│                                                             │
│  内部实现:                                                  │
│  download() → transcribe() → format() → summarize()         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件

```
┌───────────────────────────────────────────────────────────────┐
│                    agent-kit Core                             │
│                                                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Hono App       │  │  Entrypoint  │  │  Manifest       │ │
│  │  (HTTP Server)  │  │  Registry    │  │  Generator      │ │
│  └────────┬────────┘  └──────┬───────┘  └────────┬────────┘ │
│           │                  │                    │          │
│  ┌────────┴──────────────────┴────────────────────┴────────┐ │
│  │              Middleware Layers                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  1. x402 Payment Verification                    │  │ │
│  │  │     - Check Payment-Hash header                  │  │ │
│  │  │     - Verify with facilitator                    │  │ │
│  │  │     - Return 402 if payment missing/invalid      │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  2. Schema Validation (Zod)                      │  │ │
│  │  │     - Validate input against schema              │  │ │
│  │  │     - Return 400 if invalid                      │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  3. Handler Execution                            │  │ │
│  │  │     - Call your async handler(ctx)               │  │ │
│  │  │     - Handle streaming if enabled                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  4. Output Validation & Response                 │  │ │
│  │  │     - Validate output against schema             │  │ │
│  │  │     - Return JSON response                       │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                   Generated Endpoints                         │
│                                                               │
│  GET  /.well-known/agent.json    → Agent manifest            │
│  POST /entrypoints/:key/invoke   → Call entrypoint           │
│  POST /invoke/:key               → Alternative endpoint       │
└───────────────────────────────────────────────────────────────┘
```

**关键组件说明**：

1. **Hono App**: 底层 HTTP 服务器（轻量、快速）
2. **Entrypoint Registry**: 注册和管理所有 entrypoint
3. **Manifest Generator**: 自动生成 agent.json 描述文件
4. **Middleware Layers**: 处理支付、验证、执行、响应

### 3.3 请求处理流程

#### 阶段 1: 发现 (Discovery)

```bash
# AI Agent 查询服务能力
GET https://your-service.com/.well-known/agent.json

# 返回 manifest
{
  "name": "twitter-space-summarizer",
  "version": "1.0.0",
  "entrypoints": [
    {
      "key": "format-twitter-space",
      "description": "Download and transcribe...",
      "input": { "type": "object", ... },
      "output": { "type": "object", ... },
      "price": "0.002 USDC"
    }
  ]
}
```

#### 阶段 2: 调用 (Invocation)

```bash
# AI Agent 调用服务
POST https://your-service.com/invoke/format-twitter-space
Headers:
  Payment-Hash: abc123...  # x402 支付证明

Body:
  { "spaceUrl": "https://x.com/i/spaces/ABC123" }

# 处理流程:
# 1. x402 验证支付 ✓
# 2. Zod 验证输入 ✓
# 3. 执行 handler
# 4. 验证输出 ✓
# 5. 返回结果
```

## 4. agent-kit 封装的核心服务

### 4.1 服务发现 (Agent Discovery)

**问题**：AI Agent 如何知道你的服务存在？

**解决方案**：标准化的 Manifest

```typescript
// 你只需定义 entrypoint
addEntrypoint({
  key: "summarize-text",
  description: "Summarize long text",
  input: z.object({ text: z.string() }),
  output: z.object({ summary: z.string() }),
});

// agent-kit 自动生成 /.well-known/agent.json
// AI Agent 可以自动发现和理解你的服务
```

### 4.2 支付协议 (x402)

**问题**：AI Agent 如何自动支付服务费用？

**解决方案**：x402 协议（基于 HTTP 402）

```typescript
// 配置支付
const { app } = createAgentApp(
  { name: "my-service" },
  {
    config: {
      payments: {
        facilitatorUrl: "https://facilitator.daydreams.systems",
        payTo: "0xYourAddress",
        network: "base-sepolia",
        defaultPrice: "1000000", // 0.001 USDC
      }
    }
  }
);

// Per-entrypoint 定价
addEntrypoint({
  key: "premium-service",
  price: "5000000",  // 0.005 USDC
  // ...
});
```

**支付流程**：

```
1. Agent 查询 manifest → 发现价格
         ↓
2. Agent 通过 facilitator 支付 → 获得 Payment-Hash
         ↓
3. Agent 调用服务 + Payment-Hash
         ↓
4. agent-kit 验证 → 执行 → 返回结果
```

### 4.3 身份与信任 (ERC-8004)

**问题**：AI Agent 如何知道服务可信？

**解决方案**：ERC-8004 链上身份

```typescript
createAgentApp(
  { name: "my-service" },
  {
    trust: {
      registrations: [
        {
          namespace: "dns",
          identifier: "my-service.example.com",
          chainId: 84532,
          registryAddress: "0xRegistryAddress",
        }
      ],
      trustModels: [
        {
          name: "community-reputation",
          version: "1.0"
        }
      ]
    }
  }
);
```

**提供的能力**：
- 链上身份证明
- 声誉系统
- 验证和反馈机制

### 4.4 Schema 验证 (Zod)

**问题**：如何确保类型安全？

**解决方案**：Zod Schema 自动验证

```typescript
addEntrypoint({
  key: "analyze",
  input: z.object({
    text: z.string().min(1).max(10000),
    language: z.enum(['en', 'zh']).optional(),
  }),
  output: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    score: z.number().min(0).max(1),
  }),
  async handler(ctx) {
    // ctx.input 已验证，类型安全 ✓
    const result = await analyze(ctx.input.text);
    return { output: result };
  }
});
```

**优势**：
- ✅ 运行时验证
- ✅ TypeScript 类型推导
- ✅ 自动生成 JSON Schema
- ✅ 清晰的错误信息

### 4.5 流式传输 (SSE)

**问题**：长任务如何提供进度？

**解决方案**：Server-Sent Events

```typescript
addEntrypoint({
  key: "long-task",
  streaming: true,
  async handler(ctx) {
    ctx.stream.write({ status: 'Downloading...' });
    await download();
    
    ctx.stream.write({ status: 'Processing...' });
    const result = await process();
    
    return { output: result };
  }
});
```

## 5. Entrypoint 即 Tool：设计原则

### 5.1 从 AI Agent 视角看 Entrypoint

你的 **Entrypoint** 在 AI Agent 眼中就是 **Tool**：

```python
# LangChain Agent 使用你的服务
from langchain.agents import Tool

# 从 manifest 读取 entrypoints
manifest = fetch_manifest("https://your-service.com/.well-known/agent.json")

# 转换为 Tools
tools = [
    Tool(
        name="format-twitter-space",
        description="Download and transcribe...",
        func=lambda x: call_entrypoint("format-twitter-space", x)
    )
]

# 创建 Agent
agent = initialize_agent(tools=tools, llm=ChatOpenAI())

# Agent 自动调用
agent.run("总结这个 Space")
```

### 5.2 好的 Entrypoint 设计

#### ✅ 好的设计：原子化、单一职责

```typescript
// 每个 entrypoint 做一件事
addEntrypoint({
  key: "transcribe-audio",
  description: "Transcribe audio to text",
  input: z.object({ audioUrl: z.string().url() }),
  output: z.object({ text: z.string() })
});

addEntrypoint({
  key: "summarize-text",
  description: "Summarize text",
  input: z.object({ text: z.string() }),
  output: z.object({ summary: z.string() })
});

// AI Agent 可以组合：
// transcribe-audio(url) → summarize-text(transcript)
```

#### ❌ 不好的设计：过于复杂

```typescript
// 一个 entrypoint 做太多事
addEntrypoint({
  key: "do-everything",
  description: "Download, transcribe, format, summarize, email, tweet",
  input: z.object({
    url: z.string(),
    emailTo: z.string(),
    twitterHandle: z.string(),
    // 太多参数...
  }),
  // AI Agent 很难决定何时使用
});
```

## 6. agent-kit vs 传统 Web 框架

### 6.1 对比表格

| 特性 | Express/Fastify | agent-kit |
|------|----------------|-----------|
| **目标用户** | 人类开发者 | AI Agent |
| **服务发现** | 手写文档 | 自动生成 manifest |
| **API 理解** | 人类阅读 | AI 解析 JSON Schema |
| **支付** | 手动集成 | 内置 x402 |
| **身份** | Session/JWT | ERC-8004 链上身份 |
| **验证** | 手写逻辑 | Zod 自动验证 |

### 6.2 何时使用 agent-kit

#### ✅ 适合的场景

1. **构建 AI Agent 可调用的服务**
   - 转录、翻译、分析服务
   
2. **需要微支付**
   - 按次收费
   - 小额加密货币支付

3. **Agent 生态微服务**
   - 需要与其他服务组合

4. **需要链上身份/信任**

#### ❌ 不适合的场景

1. **传统 Web 应用**
   - 主要服务人类用户

2. **内部 API**
   - 不需要服务发现

3. **简单 CRUD**
   - 简单数据库操作

## 7. 总结

### agent-kit 的核心价值

1. **标准化服务发现** - AI Agent 自动发现
2. **内置货币化** - x402 微支付
3. **类型安全** - Zod 自动验证
4. **信任系统** - ERC-8004 链上身份
5. **简化开发** - 专注业务逻辑

### 在 AI Agent 生态中的定位

```
┌─────────────────────────────────────┐
│  AI Agent 层 (决策和规划)           │
│  LangChain, AutoGPT, Claude         │
└────────────┬────────────────────────┘
             ↓ 调用工具
┌─────────────────────────────────────┐
│  Tool 层 (agent-kit 服务)           │
│  提供原子化能力                     │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  基础设施层                         │
│  OpenAI API, 区块链                 │
└─────────────────────────────────────┘
```

**agent-kit 的定位**：
- **不是** AI Agent（不做决策）
- **是** Tool Provider（提供能力）
- 让服务可被 AI Agent 发现和使用

### 关键要点

- agent-kit 是 **Tool Provider 框架**，不是 AI Agent 框架
- 每个 **Entrypoint** 就是一个 **Tool**
- 核心价值：**自动发现** + **自动支付** + **类型安全**

### 快速开始

```typescript
import { createAgentApp } from '@lucid-dreams/agent-kit';
import { z } from 'zod';

const { app, addEntrypoint } = createAgentApp({
  name: "my-service",
  version: "1.0.0"
});

addEntrypoint({
  key: "hello",
  description: "Say hello",
  price: "0",
  input: z.object({ name: z.string() }),
  output: z.object({ message: z.string() }),
  async handler(ctx) {
    return {
      output: {
        message: `Hello, ${ctx.input.name}!`
      }
    };
  }
});

export { app };
```

开始构建你的 AI Agent 服务吧！🚀
