# x402 支付协议

## 概述

x402 是一个基于 HTTP 402 Payment Required 状态码的去中心化支付协议，允许 AI Agent 通过智能合约自动收款。

## 核心概念

### HTTP 402 Payment Required

x402 利用 HTTP 标准中预留的 `402 Payment Required` 状态码：

```
Client                                  Agent Server
  |                                          |
  |-------- POST /entrypoints/xxx/invoke -->|
  |                                          |
  |<------- 402 Payment Required ----------|
  |         (支付要求详情)                    |
  |                                          |
  |-- 执行链上支付 (EIP-3009) ------------->|
  |                                          |
  |-- POST /entrypoints/xxx/invoke -------->|
  |   (携带支付证明)                          |
  |                                          |
  |<------- 200 OK -------------------------|
  |         (服务结果)                        |
```

---

## EIP-3009: transferWithAuthorization

### 传统 ERC-20 转账的问题

```solidity
// 传统方式需要两步:
// 1. 用户调用 approve()
usdc.approve(agent, amount);  // 需要 Gas

// 2. Agent 调用 transferFrom()
usdc.transferFrom(user, agent, amount);  // Agent 支付 Gas
```

**问题**：用户需要支付 Gas 费用

### EIP-3009 解决方案

```solidity
// EIP-3009: 一步完成，用户只需签名
usdc.transferWithAuthorization(
  from,           // 用户地址
  to,             // Agent 地址
  amount,         // 转账金额
  validAfter,     // 有效期开始
  validBefore,    // 有效期结束
  nonce,          // 防重放
  v, r, s         // 用户的签名（无需 Gas）
);
```

**优势**：
- ✅ 用户只需签名（0 Gas）
- ✅ Agent 执行链上交易（Agent 支付 Gas）
- ✅ 一步完成授权和转账
- ✅ 支持离线签名

---

## x402-fetch 工作原理

### 1. 自动支付流程

```typescript
import { wrapFetchWithPayment, createSigner } from 'x402-fetch';

// 1. 创建 signer（连接钱包）
const signer = await createSigner('base', walletClient);

// 2. 包装 fetch
const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

// 3. 正常调用 API（自动处理支付）
const response = await fetchWithPayment('/entrypoints/transcribe-space/invoke', {
  method: 'POST',
  body: JSON.stringify({ spaceUrl: 'https://...' })
});
```

### 2. 底层实现

```typescript
async function wrapFetchWithPayment(originalFetch, signer) {
  return async (url, options) => {
    // 第一次请求
    let response = await originalFetch(url, options);

    // 如果返回 402
    if (response.status === 402) {
      const paymentInfo = await response.json();

      // 生成 EIP-3009 签名
      const signature = await signer.signTransferAuthorization({
        to: paymentInfo.payTo,
        value: paymentInfo.amount,
        validAfter: Math.floor(Date.now() / 1000),
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        nonce: generateNonce()
      });

      // 重新请求，携带支付证明
      response = await originalFetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-PAYMENT': JSON.stringify(signature)
        }
      });
    }

    return response;
  };
}
```

---

## Agent 端实现（agent-kit）

### 1. 定义 Entrypoint

```typescript
import { createAgentApp } from '@lucid-agents/hono';

const { app, addEntrypoint } = createAgentApp({
  name: 'twitter-space-agent',
  config: {
    payments: {
      payTo: process.env.PAY_TO,          // 收款地址
      network: 'base',                     // 网络
      facilitatorUrl: 'https://...',       // 支付验证服务
    }
  }
});

addEntrypoint({
  key: 'transcribe-space',
  price: '200000',  // 0.2 USDC (6位小数)
  input: z.object({
    spaceUrl: z.string().url()
  }),
  async handler({ input, payment }) {
    // payment.verified: 支付是否已验证
    // payment.amount: 支付金额
    // payment.from: 付款地址

    if (!payment.verified) {
      throw new Error('Payment not verified');
    }

    // 执行业务逻辑
    await processSpace(input.spaceUrl, payment.from);

    return { success: true };
  }
});
```

### 2. agent-kit 自动处理

- ✅ 检查 `X-PAYMENT` header
- ✅ 验证签名有效性
- ✅ 调用智能合约执行转账
- ✅ 验证链上交易
- ✅ 记录支付证明

---

## 支付验证流程

```
1. 客户端请求
   ↓
2. Agent 返回 402 + 支付要求
   ↓
3. 客户端生成 EIP-3009 签名
   ↓
4. Facilitator 验证签名合法性
   ↓
5. Facilitator 调用链上 transferWithAuthorization()
   ↓
6. Agent 验证交易成功
   ↓
7. Agent 执行服务并返回结果
```

### Facilitator 的作用

- **问题**: Agent 需要监听链上交易，实时性差
- **解决**: Facilitator 充当可信第三方
  - 验证用户签名
  - 执行链上交易
  - 返回交易哈希给 Agent
  - Agent 异步验证

---

## 安全性

### 1. 防重放攻击

```typescript
// EIP-3009 使用 nonce 防止重放
const nonce = crypto.randomBytes(32);
```

每个签名包含唯一的 nonce，链上合约会记录已使用的 nonce，防止重复使用。

### 2. 时间限制

```typescript
const validAfter = Math.floor(Date.now() / 1000);
const validBefore = validAfter + 3600;  // 1小时有效期
```

签名有时间窗口限制，过期自动失效。

### 3. 金额验证

```typescript
if (payment.amount < entrypoint.price) {
  throw new Error('Insufficient payment');
}
```

Agent 验证实际支付金额是否满足要求。

### 4. 链上验证

Agent 可选择异步验证链上交易：

```typescript
const tx = await provider.getTransaction(payment.txHash);
if (tx.to !== expectedAddress || tx.value < expectedAmount) {
  throw new Error('Invalid transaction');
}
```

---

## 网络支持

### Base Network

- **Mainnet**: Chain ID 8453
- **USDC 合约**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Gas 费用**: ~$0.01 per transaction
- **EIP-3009**: ✅ 支持

### Base Sepolia (测试网)

- **Testnet**: Chain ID 84532
- **USDC 合约**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Faucet**: https://faucet.circle.com/

---

## 成本分析

### 传统方式 vs x402

| 项目 | 传统方式 | x402 |
|------|---------|------|
| **用户 Gas 费** | $0.50-1.00 | $0 |
| **Agent Gas 费** | $0 | $0.01 |
| **步骤** | 2步 (approve + transfer) | 1步 (签名) |
| **用户体验** | 差（需要等待 2次交易） | 好（即时签名） |

---

## 示例代码

### 完整的前端集成

```typescript
import { useWalletClient } from 'wagmi';
import { wrapFetchWithPayment, createSigner } from 'x402-fetch';

export function usePayment() {
  const { data: walletClient } = useWalletClient();

  const invokeEntrypoint = async (key: string, params: any) => {
    // 1. 创建 signer
    const signer = await createSigner('base', walletClient);

    // 2. 包装 fetch
    const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

    // 3. 调用 API（自动处理支付）
    const response = await fetchWithPayment(
      `/entrypoints/${key}/invoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }
    );

    if (!response.ok) {
      throw new Error('Payment failed');
    }

    return response.json();
  };

  return { invokeEntrypoint };
}
```

---

## 参考资料

- [x402 官方文档](https://docs.cdp.coinbase.com/x402)
- [EIP-3009 规范](https://eips.ethereum.org/EIPS/eip-3009)
- [x402-fetch GitHub](https://github.com/coinbase/x402-fetch)
- [agent-kit GitHub](https://github.com/coinbase/lucid-agents)
