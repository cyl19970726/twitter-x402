# 架构重构计划

## 🎯 目标

1. **修复安全漏洞** - 实现真实的认证和支付验证
2. **拆分支付和业务逻辑** - 清晰的职责分离
3. **优化 UX** - 简化用户支付和使用流程
4. **迁移到 PostgreSQL** - 适应生产环境

---

## 📋 Phase 1: 安全修复（P0 - 必须立即完成）

### 1.1 实现 EIP-191 签名验证

**问题**：`src/api/middleware/auth.ts:52-57` 跳过签名验证

**解决方案**：

```typescript
// src/api/middleware/auth.ts
import { verifyMessage } from 'viem';

export async function authMiddleware(c: Context, next: Next) {
  const wallet = c.req.query('wallet');
  const signature = c.req.query('signature') as `0x${string}`;
  const message = c.req.query('message');
  const timestamp = c.req.query('timestamp');

  // ... 参数检查 ...

  // ✅ 实现签名验证
  try {
    const isValid = await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature,
    });

    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // 验证消息格式
    const expectedMessage = `Sign in to Twitter Space Dashboard\nTimestamp: ${timestamp}`;
    if (message !== expectedMessage) {
      return c.json({ error: 'Invalid message format' }, 401);
    }

    const user = await getOrCreateUser(wallet);
    c.set('userId', user.id);
    c.set('walletAddress', wallet);

    await next();
  } catch (error) {
    return c.json({ error: 'Signature verification failed' }, 401);
  }
}
```

**测试**：
```bash
bun run tests/integration/testAuth.ts
```

---

### 1.2 实现链上支付验证

**问题**：`src/services/paymentService.ts:186` 接受所有交易

**解决方案**：

```typescript
// src/services/paymentService.ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// USDC 合约地址
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export async function verifyPayment(
  transactionHash: string,
  expectedAmount: string,
  expectedRecipient: string
): Promise<{ verified: boolean; amount?: string; error?: string }> {
  try {
    // 1. 获取交易
    const tx = await publicClient.getTransaction({
      hash: transactionHash as `0x${string}`,
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found' };
    }

    // 2. 获取交易回执（确认已上链）
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' };
    }

    // 3. 解析 USDC 转账事件
    // EIP-3009 transferWithAuthorization 会触发 Transfer event
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event
    );

    if (!transferLog) {
      return { verified: false, error: 'No USDC transfer found' };
    }

    // 4. 解析金额和接收者
    const to = `0x${transferLog.topics[2]?.slice(26)}`;
    const amount = BigInt(transferLog.data);

    // 5. 验证接收者和金额
    if (to.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { verified: false, error: 'Invalid recipient' };
    }

    const expectedAmountBigInt = BigInt(expectedAmount);
    if (amount < expectedAmountBigInt) {
      return { verified: false, error: 'Insufficient amount' };
    }

    return {
      verified: true,
      amount: amount.toString(),
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**使用**：
```typescript
// 在 recordTranscriptionPayment 中验证
if (transactionHash) {
  const verification = await verifyPayment(
    transactionHash,
    '200000', // 0.2 USDC (6 decimals)
    process.env.PAY_TO!
  );

  if (!verification.verified) {
    return { success: false, error: verification.error };
  }
}
```

---

### 1.3 修复 CORS 配置

**问题**：`src/api/server.ts:22` - `origin: '*'` 太危险

**解决方案**：

```typescript
// src/api/server.ts
import { cors } from 'hono/cors';

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8787',
];

// Production 环境添加：
// https://your-app.railway.app
// https://your-custom-domain.com

app.use('/*', cors({
  origin: (origin) => {
    // 开发环境允许所有 localhost
    if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
      return origin;
    }
    // 生产环境白名单
    return allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
  },
  credentials: true,
}));
```

---

## 📋 Phase 2: 支付和业务逻辑分离

### 问题分析

当前架构混乱：
- **x402 付费 API** (agent-kit) - 支付验证 + 业务逻辑混在一起
- **免费 API** - 需要先付费才能调用，但没有支付流程
- 用户体验差：支付和功能使用割裂

### 新架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Pay & Start │  │  Pay & Chat  │  │  View Free   │  │
│  │  Transcribe  │  │  with Space  │  │  Spaces      │  │
│  └───────┬──────┘  └───────┬──────┘  └───────┬──────┘  │
│          │                 │                  │          │
└──────────┼─────────────────┼──────────────────┼─────────┘
           │                 │                  │
           ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Unified Hono Service (8787)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │         x402 Payment Endpoints (agent-kit)        │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                    │  │
│  │  POST /entrypoints/transcribe-space/invoke        │  │
│  │    - 验证 x402 支付 (0.2 USDC)                     │  │
│  │    - 记录支付                                      │  │
│  │    - 排队转录任务                                  │  │
│  │    - 返回 jobId                                    │  │
│  │                                                    │  │
│  │  POST /entrypoints/unlock-chat/invoke             │  │
│  │    - 验证 x402 支付 (0.5 USDC)                     │  │
│  │    - 检查用户是否拥有转录                          │  │
│  │    - 记录 chat unlock                             │  │
│  │                                                    │  │
│  │  POST /entrypoints/chat/invoke                    │  │
│  │    - 验证 x402 支付 (0.9+0.1n USDC)               │  │
│  │    - 检查所有 spaces 已 unlock                     │  │
│  │    - 调用 OpenAI                                   │  │
│  │    - 返回回答                                      │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Free API Endpoints (authenticated)        │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                    │  │
│  │  GET /api/spaces/mine                             │  │
│  │    - 签名认证 (EIP-191)                            │  │
│  │    - 返回用户购买的 spaces                         │  │
│  │                                                    │  │
│  │  GET /api/spaces/:id                              │  │
│  │    - 签名认证                                      │  │
│  │    - 检查用户是否付费                              │  │
│  │    - 返回转录内容                                  │  │
│  │                                                    │  │
│  │  GET /api/spaces/:id/status                       │  │
│  │    - 签名认证                                      │  │
│  │    - 返回转录进度 (pending/processing/completed)   │  │
│  │                                                    │  │
│  │  GET /api/user/stats                              │  │
│  │    - 返回用户统计数据                              │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  PostgreSQL DB │
                  │  + File System │
                  └────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Worker Queue  │
                  │  (Background)  │
                  └────────────────┘
```

### 关键点：

1. **x402 endpoints = 支付入口**
   - 所有需要支付的操作通过这里
   - agent-kit 自动验证支付
   - 支付成功后记录数据库并触发业务逻辑

2. **免费 API = 查询和状态**
   - 查看已购买的 spaces
   - 查看转录进度
   - 查看聊天历史
   - 用签名认证，不需要支付

3. **清晰职责**：
   - `entrypoints/` - 支付验证 + 权限检查 + 业务触发
   - `api/` - 数据查询 + 状态检查
   - `services/` - 纯业务逻辑（不关心支付）
   - `worker/` - 异步处理

---

## 📋 Phase 3: 优化 UX - 一键支付即用

### 用户流程优化

#### ❌ 旧流程（繁琐）

```
1. 连接钱包
2. 输入 Space URL
3. 点击 "Transcribe"
4. 支付 0.2 USDC (x402)
5. 等待...不知道进度
6. 刷新页面查看是否完成
7. 如果想聊天，再支付 0.5 USDC
8. 再输入问题
9. 再支付 0.9 USDC
```

#### ✅ 新流程（简化）

```
方案 A: 单次购买
┌────────────────────────────────┐
│  输入 Space URL               │
│  https://x.com/i/spaces/xxx   │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  选择服务包（自动检测）        │
│  ○ 仅转录      0.2 USDC       │
│  ● 转录+聊天    0.7 USDC       │  ← 推荐
│                                │
│  [一键购买并开始]              │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  实时进度条                    │
│  ███████░░░ 70%               │
│  正在转录中...预计 2 分钟      │
│                                │
│  [完成后自动跳转到 Space 页面] │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  Space 详情 + 聊天界面         │
│  [已包含在购买包中，直接用]    │
└────────────────────────────────┘

方案 B: 订阅制（更激进）
┌────────────────────────────────┐
│  月度套餐                      │
│  ● 5 spaces/月   5 USDC       │
│  ○ 20 spaces/月  18 USDC      │  ← 10% off
│  ○ 无限          50 USDC      │  ← 推荐
│                                │
│  [订阅]                        │
└────────────────────────────────┘
```

---

### 实现方案 A：捆绑销售

#### 1. 新增 Entrypoint：一键购买包

```typescript
// src/agent/entrypoints/purchaseBundle.ts
addEntrypoint({
  key: 'purchase-bundle',
  price: '700000', // 0.7 USDC (转录 0.2 + 聊天 0.5)
  input: z.object({
    spaceUrl: z.string().url(),
    bundle: z.enum(['transcript-only', 'transcript-chat']),
  }),
  async handler({ input, payment }) {
    const spaceId = extractSpaceId(input.spaceUrl);

    // 1. 记录转录支付
    await recordTranscriptionPayment(
      payment.from,
      spaceId,
      payment.txHash
    );

    // 2. 如果是捆绑包，同时记录聊天解锁
    if (input.bundle === 'transcript-chat') {
      await recordChatUnlock(
        payment.from,
        spaceId,
        payment.txHash
      );
    }

    // 3. 排队转录任务
    const job = await queueTranscription(spaceId, input.spaceUrl);

    return {
      success: true,
      spaceId,
      jobId: job.id,
      bundle: input.bundle,
      message: '转录已开始，聊天功能已解锁',
    };
  },
});
```

#### 2. 前端优化

```typescript
// frontend/src/components/PurchaseBundle.tsx
export function PurchaseBundle() {
  const [spaceUrl, setSpaceUrl] = useState('');
  const [bundle, setBundle] = useState<'transcript-only' | 'transcript-chat'>('transcript-chat');
  const { invokeEntrypoint, isProcessing } = usePayment();

  const prices = {
    'transcript-only': '0.2',
    'transcript-chat': '0.7', // 捆绑优惠 (原价 0.2 + 0.5 = 0.7)
  };

  const handlePurchase = async () => {
    try {
      const result = await invokeEntrypoint('purchase-bundle', {
        spaceUrl,
        bundle,
      });

      // 跳转到进度页面
      navigate(`/spaces/${result.spaceId}/processing?jobId=${result.jobId}`);
    } catch (error) {
      toast.error('支付失败');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">转录 Twitter Space</h2>

      {/* Space URL 输入 */}
      <input
        type="url"
        value={spaceUrl}
        onChange={(e) => setSpaceUrl(e.target.value)}
        placeholder="https://x.com/i/spaces/..."
        className="w-full p-3 border rounded-lg mb-4"
      />

      {/* 选择套餐 */}
      <div className="space-y-3 mb-6">
        <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            value="transcript-only"
            checked={bundle === 'transcript-only'}
            onChange={(e) => setBundle(e.target.value as any)}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="font-medium">仅转录</div>
            <div className="text-sm text-gray-500">获得格式化的转录文本</div>
          </div>
          <div className="text-lg font-bold">{prices['transcript-only']} USDC</div>
        </label>

        <label className="flex items-center p-4 border-2 border-purple-500 rounded-lg cursor-pointer bg-purple-50">
          <input
            type="radio"
            value="transcript-chat"
            checked={bundle === 'transcript-chat'}
            onChange={(e) => setBundle(e.target.value as any)}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="font-medium flex items-center">
              转录 + AI 聊天
              <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">推荐</span>
            </div>
            <div className="text-sm text-gray-500">
              转录 + 无限次 AI 问答
            </div>
          </div>
          <div className="text-lg font-bold text-purple-600">{prices['transcript-chat']} USDC</div>
        </label>
      </div>

      {/* 购买按钮 */}
      <button
        onClick={handlePurchase}
        disabled={!spaceUrl || isProcessing}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-bold text-lg hover:opacity-90 disabled:opacity-50"
      >
        {isProcessing ? '处理中...' : `支付 ${prices[bundle]} USDC 并开始`}
      </button>

      <p className="text-center text-sm text-gray-500 mt-4">
        安全支付 · 无需 Gas 费 · 即时开始
      </p>
    </div>
  );
}
```

#### 3. 实时进度追踪

```typescript
// frontend/src/components/ProcessingStatus.tsx
export function ProcessingStatus({ spaceId, jobId }: Props) {
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [progress, setProgress] = useState(0);
  const { getAuthParams } = useAuth();

  useEffect(() => {
    const interval = setInterval(async () => {
      const auth = await getAuthParams();
      const result = await apiClient.getSpaceStatus(auth, spaceId);

      setStatus(result.status);
      setProgress(result.progress || 0);

      if (result.status === 'completed') {
        clearInterval(interval);
        // 自动跳转到 Space 页面
        setTimeout(() => navigate(`/spaces/${spaceId}`), 1000);
      }
    }, 3000); // 每 3 秒轮询

    return () => clearInterval(interval);
  }, [spaceId]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">处理进度</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 状态说明 */}
      <div className="text-center py-8">
        {status === 'pending' && <p className="text-gray-600">等待处理...</p>}
        {status === 'processing' && <p className="text-purple-600 font-medium">正在转录中...预计 3-5 分钟</p>}
        {status === 'completed' && <p className="text-green-600 font-medium">✓ 完成！即将跳转...</p>}
        {status === 'failed' && <p className="text-red-600 font-medium">处理失败，请联系支持</p>}
      </div>

      {/* 动画 */}
      <div className="flex justify-center">
        {status === 'processing' && <LoadingAnimation />}
        {status === 'completed' && <SuccessAnimation />}
      </div>
    </div>
  );
}
```

---

## 📋 Phase 4: 迁移到 PostgreSQL

### 为什么现在必须迁移？

| 问题 | SQLite | PostgreSQL |
|------|--------|------------|
| **并发写入** | ❌ 锁竞争 | ✅ MVCC |
| **Worker 冲突** | ❌ 经常锁 | ✅ 无问题 |
| **水平扩展** | ❌ 单文件 | ✅ 支持 |
| **Railway 部署** | ⚠️ 需 Volume | ✅ 原生支持 |
| **备份恢复** | ⚠️ 手动 | ✅ 自动 |

### 迁移步骤

#### 1. 更新依赖

```bash
bun add postgres
bun remove bun:sqlite
```

#### 2. 更新配置

```typescript
// drizzle.config.ts
export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',  // ← 改这里
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';  // ← 改这里
import postgres from 'postgres';  // ← 改这里
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });

console.log('✓ Database connected: PostgreSQL');
```

#### 3. 重新生成 migrations

```bash
# 删除旧的 SQLite migrations
rm -rf src/db/migrations/*

# 生成新的 PostgreSQL migrations
bun run db:generate

# 本地测试（使用 docker PostgreSQL）
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=spaces \
  -p 5432:5432 \
  postgres:16

export DATABASE_URL=postgresql://postgres:dev@localhost:5432/spaces
bun run db:migrate
```

#### 4. Railway 部署

```bash
# 在 Railway 添加 PostgreSQL 服务
# 然后在环境变量中引用
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

---

## 📋 Phase 5: 改进 Worker

### 当前问题

```typescript
// ❌ 脆弱的设计
while (true) {
  const job = await getNextJob();
  if (job) {
    await processJob(job);
  }
  await sleep(10000);
}
```

**问题**：
- 崩溃无法恢复
- 无并发处理
- 无监控

### 新设计

```typescript
// ✅ 健壮的 Worker
import { BullMQ } from 'bullmq';  // 或 pg-boss

class TranscriptionWorker {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    // 使用 Redis 或 PostgreSQL 作为队列后端
    this.queue = new Queue('transcription', {
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },
    });

    this.worker = new Worker(
      'transcription',
      async (job) => {
        return await this.processJob(job.data);
      },
      {
        connection: { /* ... */ },
        concurrency: 3,  // ← 并发处理 3 个任务
      }
    );

    // 监控
    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
      // 发送告警到 Sentry/Slack
    });

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
      // 更新数据库状态
    });
  }

  async addJob(spaceUrl: string, spaceId: string) {
    await this.queue.add('transcribe', {
      spaceUrl,
      spaceId,
    }, {
      attempts: 3,  // ← 自动重试 3 次
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
    });
  }

  async processJob(data: { spaceUrl: string; spaceId: string }) {
    // 原有处理逻辑
    await formatSpaceFromUrl(data.spaceUrl);
  }
}
```

---

## 🎯 实施优先级

### P0 - 立即修复（本周）
- [ ] 实现 EIP-191 签名验证
- [ ] 实现链上支付验证
- [ ] 修复 CORS 配置

### P1 - 架构重构（下周）
- [ ] 迁移到 PostgreSQL
- [ ] 实现捆绑购买 entrypoint
- [ ] 实现实时进度追踪
- [ ] 优化前端 UX

### P2 - 生产优化（下下周）
- [ ] 引入真实消息队列 (BullMQ/pg-boss)
- [ ] 添加监控和告警
- [ ] 完善测试覆盖
- [ ] 性能优化

---

## 📝 下一步行动

请确认：
1. **是否接受这个重构计划？**
2. **优先级是否需要调整？**
3. **是否需要我开始实施 Phase 1（安全修复）？**

我可以立即开始编写代码修复 P0 问题。
