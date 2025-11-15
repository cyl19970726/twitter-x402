# API 文档

## 概览

本文档详细描述所有 API 端点、请求/响应格式、错误处理和使用示例。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发) / `https://your-domain.com` (生产)
- **内容类型**: `application/json`
- **认证**: x402 支付中间件 (仅付费端点)

---

## 端点列表

### 公开端点 (免费)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/spaces` | GET | 获取所有已完成的 Spaces 列表 |
| `/api/spaces/[id]` | GET | 获取单个 Space 的详情和转录内容 |
| `/api/spaces/[id]/status` | GET | 获取 Space 的处理状态 |

### 付费端点

| 端点 | 方法 | 价格 | 描述 |
|------|------|------|------|
| `/api/transcribe` | POST | 0.2 USDC | 创建新的转录任务 |
| `/api/chat` | POST | 0.5 USDC | 与 Space 进行 AI 对话 |

---

## 详细端点说明

### 1. GET /api/spaces

获取所有已完成转录的 Spaces 列表。

#### 请求参数

**Query Parameters:**

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `limit` | number | 否 | 50 | 返回数量 (最大 100) |
| `offset` | number | 否 | 0 | 分页偏移量 |

#### 请求示例

```bash
curl http://localhost:3000/api/spaces?limit=20&offset=0
```

#### 响应格式

```typescript
{
  spaces: Array<{
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;        // 秒
    completedAt: string;     // ISO 8601
  }>;
  total: number;
}
```

#### 响应示例

```json
{
  "spaces": [
    {
      "spaceId": "1abcd123456789",
      "title": "Web3 支付的未来",
      "creator": "@vitalik",
      "participants": ["@vitalik", "@naval", "@balajis"],
      "duration": 3600,
      "completedAt": "2025-11-15T10:30:00Z"
    },
    {
      "spaceId": "2efgh987654321",
      "title": "DeFi 趋势讨论",
      "creator": "@compound",
      "participants": ["@compound", "@aave"],
      "duration": 2700,
      "completedAt": "2025-11-14T15:20:00Z"
    }
  ],
  "total": 150
}
```

#### 错误响应

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch spaces",
  "code": "DATABASE_ERROR"
}
```

---

### 2. GET /api/spaces/[id]

获取单个 Space 的详细信息和完整转录内容。

#### 路径参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `id` | string | Space ID |

#### 请求示例

```bash
curl http://localhost:3000/api/spaces/1abcd123456789
```

#### 响应格式

```typescript
{
  space: {
    spaceId: string;
    title: string;
    creator: string | null;
    participants: string[];
    duration: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    completedAt: string | null;
  };
  transcript?: string;  // Markdown 格式 (仅 status=completed 时)
}
```

#### 响应示例 (已完成)

```json
{
  "space": {
    "spaceId": "1abcd123456789",
    "title": "Web3 支付的未来",
    "creator": "@vitalik",
    "participants": ["@vitalik", "@naval"],
    "duration": 3600,
    "status": "completed",
    "completedAt": "2025-11-15T10:30:00Z"
  },
  "transcript": "# Web3 支付的未来\n\n**创建者**: @vitalik\n**时长**: 60 分 00 秒\n\n## 参与者\n\n- @vitalik\n- @naval\n\n## 对话\n\n**@vitalik** (00:00:15):\n大家好,今天我们聊聊 Web3 支付..."
}
```

#### 响应示例 (处理中)

```json
{
  "space": {
    "spaceId": "1abcd123456789",
    "title": "Space 1abcd123456789",
    "creator": null,
    "participants": [],
    "duration": 0,
    "status": "processing",
    "completedAt": null
  }
}
```

#### 错误响应

**404 Not Found**
```json
{
  "error": "Space not found",
  "code": "SPACE_NOT_FOUND"
}
```

---

### 3. GET /api/spaces/[id]/status

获取 Space 的处理状态,适用于轮询检查转录进度。

#### 路径参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `id` | string | Space ID |

#### 请求示例

```bash
curl http://localhost:3000/api/spaces/1abcd123456789/status
```

#### 响应格式

```typescript
{
  spaceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;    // 0-100 (仅 processing 时估算)
  message: string;      // 状态描述
}
```

#### 响应示例

**等待处理:**
```json
{
  "spaceId": "1abcd123456789",
  "status": "pending",
  "message": "转录任务在队列中,预计 3-5 分钟开始处理"
}
```

**处理中:**
```json
{
  "spaceId": "1abcd123456789",
  "status": "processing",
  "progress": 60,
  "message": "正在格式化转录内容..."
}
```

**已完成:**
```json
{
  "spaceId": "1abcd123456789",
  "status": "completed",
  "message": "转录已完成,可以查看完整内容"
}
```

**失败:**
```json
{
  "spaceId": "1abcd123456789",
  "status": "failed",
  "message": "转录失败: 无法下载 Space 音频"
}
```

#### 错误响应

**404 Not Found**
```json
{
  "error": "Space not found",
  "code": "SPACE_NOT_FOUND"
}
```

---

### 4. POST /api/transcribe

创建新的转录任务。**需要支付 0.2 USDC**。

#### x402 支付流程

1. 客户端发送请求到 `/api/transcribe`
2. x402 中间件检测到需要支付,返回 `402 Payment Required`
3. x402-next 客户端自动:
   - 弹出钱包连接 (RainbowKit)
   - 请求用户签名 EIP-3009 支付授权
   - 生成支付证明
4. 重新发送请求,携带支付证明
5. 中间件验证支付,放行到 API Handler
6. API Handler 创建转录任务

#### 请求体

```typescript
{
  spaceUrl: string;  // Twitter Space URL
}
```

#### 请求示例

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/1abcd123456789"}'
```

> **注意**: 实际使用中,客户端需要使用 x402-next SDK 来处理支付流程,不能直接用 curl。

#### 响应格式

```typescript
{
  success: true;
  spaceId: string;
  status: 'pending' | 'processing' | 'completed';
  message: string;
}
```

#### 响应示例

**新创建:**
```json
{
  "success": true,
  "spaceId": "1abcd123456789",
  "status": "pending",
  "message": "转录任务已创建,预计 3-5 分钟完成"
}
```

**已存在:**
```json
{
  "success": true,
  "spaceId": "1abcd123456789",
  "status": "completed",
  "message": "该 Space 已完成转录,可以直接查看"
}
```

#### 错误响应

**400 Bad Request** - 无效的 URL
```json
{
  "error": "Invalid Space URL",
  "code": "INVALID_URL"
}
```

**402 Payment Required** - 未支付
```json
{
  "error": "Payment required",
  "price": "$0.20",
  "network": "base"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create transcription task",
  "code": "DATABASE_ERROR"
}
```

---

### 5. POST /api/chat

与已完成转录的 Space 进行 AI 对话。**需要支付 0.5 USDC**。

#### 请求体

```typescript
{
  spaceId: string;   // Space ID
  question: string;  // 用户问题
}
```

#### 请求示例

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "1abcd123456789",
    "question": "这个 Space 讨论了哪些主要观点?"
  }'
```

#### 响应格式

```typescript
{
  success: true;
  answer: string;       // AI 回答 (Markdown 格式)
  spaceTitle: string;   // Space 标题
}
```

#### 响应示例

```json
{
  "success": true,
  "answer": "根据转录内容,这个 Space 主要讨论了以下观点:\n\n## 1. Web3 支付的必要性\n\n@vitalik 指出传统支付系统的局限性...\n\n## 2. EIP-3009 的优势\n\n@naval 强调了 transferWithAuthorization 允许无 gas 支付...\n\n## 3. 未来展望\n\n参与者一致认为...",
  "spaceTitle": "Web3 支付的未来"
}
```

#### 错误响应

**400 Bad Request** - 缺少参数
```json
{
  "error": "Missing required fields: spaceId, question",
  "code": "INVALID_REQUEST"
}
```

**402 Payment Required** - 未支付
```json
{
  "error": "Payment required",
  "price": "$0.50",
  "network": "base"
}
```

**404 Not Found** - Space 不存在
```json
{
  "error": "Space not found",
  "code": "SPACE_NOT_FOUND"
}
```

**409 Conflict** - Space 未完成
```json
{
  "error": "Space transcription is not ready yet",
  "code": "SPACE_NOT_READY",
  "status": "processing"
}
```

**500 Internal Server Error** - AI 调用失败
```json
{
  "error": "Failed to generate AI response",
  "code": "AI_ERROR"
}
```

---

## 前端集成示例

### 使用 x402-next SDK

#### 1. 安装依赖

```bash
npm install x402-next @rainbow-me/rainbowkit wagmi viem
```

#### 2. 配置 Providers

```typescript
// components/providers/web3-provider.tsx
'use client';

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'Twitter Space Transcription',
  projectId: 'YOUR_PROJECT_ID',
  chains: [base],
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### 3. 发起支付请求

```typescript
// 转录 Space
async function transcribeSpace(spaceUrl: string) {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ spaceUrl }),
  });

  if (response.status === 402) {
    // x402-next 会自动拦截并处理支付流程
    // 用户完成支付后会自动重试请求
    return;
  }

  const data = await response.json();
  return data;
}

// AI 聊天
async function chatWithSpace(spaceId: string, question: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ spaceId, question }),
  });

  if (response.status === 402) {
    // 自动处理支付
    return;
  }

  const data = await response.json();
  return data;
}
```

#### 4. 轮询状态

```typescript
async function pollSpaceStatus(spaceId: string) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/spaces/${spaceId}/status`);
    const data = await response.json();

    if (data.status === 'completed') {
      clearInterval(interval);
      // 转录完成,加载完整内容
      window.location.href = `/spaces/${spaceId}`;
    } else if (data.status === 'failed') {
      clearInterval(interval);
      // 处理失败
      alert('转录失败: ' + data.message);
    }

    // 更新进度 UI
    updateProgress(data.progress);
  }, 5000); // 每 5 秒检查一次
}
```

---

## 错误代码参考

| 错误代码 | HTTP 状态 | 描述 | 解决方案 |
|----------|----------|------|----------|
| `INVALID_URL` | 400 | Space URL 格式无效 | 检查 URL 格式 |
| `INVALID_REQUEST` | 400 | 请求参数缺失或格式错误 | 检查请求体 |
| `SPACE_NOT_FOUND` | 404 | Space 不存在 | 确认 Space ID |
| `SPACE_NOT_READY` | 409 | Space 转录未完成 | 等待转录完成 |
| `PAYMENT_REQUIRED` | 402 | 需要支付 | 使用 x402-next 处理支付 |
| `PAYMENT_FAILED` | 402 | 支付失败 | 检查钱包余额和网络 |
| `DATABASE_ERROR` | 500 | 数据库错误 | 联系技术支持 |
| `AI_ERROR` | 500 | AI 服务错误 | 稍后重试 |
| `DOWNLOAD_ERROR` | 500 | Space 下载失败 | Space 可能不可用或已删除 |

---

## 速率限制

目前**没有**速率限制。未来可能添加:

- 免费端点: 100 请求/分钟
- 付费端点: 由 x402 支付限制

---

## 最佳实践

### 1. 错误处理

```typescript
async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      console.error(`API Error (${response.status}):`, error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

### 2. 重复请求检查

在创建转录任务前,先检查是否已存在:

```typescript
async function ensureTranscription(spaceUrl: string) {
  const spaceId = extractSpaceId(spaceUrl);

  // 1. 检查是否已存在
  const existing = await fetch(`/api/spaces/${spaceId}`);

  if (existing.ok) {
    const data = await existing.json();
    if (data.space.status === 'completed') {
      return spaceId; // 已完成,直接使用
    }
    if (data.space.status === 'processing' || data.space.status === 'pending') {
      return spaceId; // 正在处理,等待完成
    }
  }

  // 2. 不存在,创建新任务
  const result = await transcribeSpace(spaceUrl);
  return result.spaceId;
}
```

### 3. 支付失败处理

```typescript
async function transcribeWithRetry(spaceUrl: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await transcribeSpace(spaceUrl);
      return result;
    } catch (error: any) {
      if (error.code === 'PAYMENT_FAILED' && i < maxRetries - 1) {
        // 支付失败,重试
        await sleep(2000);
        continue;
      }
      throw error;
    }
  }
}
```

---

## 测试端点

### 使用 Postman/Insomnia

创建测试集合包含所有端点:

1. **GET /api/spaces**
   - 测试分页
   - 测试空结果

2. **GET /api/spaces/[id]**
   - 测试已完成 Space
   - 测试处理中 Space
   - 测试不存在 Space

3. **POST /api/transcribe**
   - 需要配置 x402 支付
   - 测试重复提交

4. **POST /api/chat**
   - 需要配置 x402 支付
   - 测试不同问题类型

### cURL 测试脚本

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

# 1. 获取 Spaces 列表
echo "Testing GET /api/spaces..."
curl -s "$BASE_URL/api/spaces?limit=5" | jq

# 2. 获取单个 Space
echo "\nTesting GET /api/spaces/[id]..."
curl -s "$BASE_URL/api/spaces/1abcd123456789" | jq

# 3. 检查状态
echo "\nTesting GET /api/spaces/[id]/status..."
curl -s "$BASE_URL/api/spaces/1abcd123456789/status" | jq

# 4. 创建转录 (需要支付,会返回 402)
echo "\nTesting POST /api/transcribe..."
curl -s -X POST "$BASE_URL/api/transcribe" \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/1test"}' | jq

echo "\nAll tests completed!"
```
