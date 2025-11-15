# 简化架构设计

## 产品逻辑

### 核心功能
1. **浏览转录库（公开）** - 所有人都能看到已转录的 spaces
2. **查看转录内容（公开）** - 点击进入查看完整文字稿
3. **转录新 space（付费）** - 输入 URL，支付 0.2 USDC
4. **AI 聊天（付费）** - 对 space 提问，支付费用

### 关键设计
- ✅ **转录内容公开** - 不需要登录，不需要权限
- ✅ **只有 AI chat 付费** - 查看转录免费
- ✅ **简单数据库** - 不需要复杂的权限表

---

## 数据库设计（简化版）

### 只需 3 张表

```sql
-- 1. spaces 表（核心）
CREATE TABLE spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id TEXT NOT NULL UNIQUE,        -- Twitter Space ID
  space_url TEXT NOT NULL,              -- 完整 URL
  title TEXT NOT NULL,
  creator TEXT,

  -- 状态
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

  -- 文件路径
  audio_file_path TEXT,
  transcript_file_path TEXT,

  -- 元数据
  audio_duration_seconds INTEGER,
  participants TEXT,                     -- JSON array

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 2. chat_payments 表（记录聊天付费）
CREATE TABLE chat_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,         -- 付款人钱包
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,            -- 支付金额
  transaction_hash TEXT,                -- x402 交易哈希
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

-- 3. transcription_requests 表（记录转录请求）
CREATE TABLE transcription_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,         -- 请求人钱包
  amount_usdc TEXT NOT NULL DEFAULT '0.2',
  transaction_hash TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (space_id) REFERENCES spaces(id)
);
```

### 为什么这么简单？

1. **不需要 users 表** - 没有用户系统，钱包地址即身份
2. **不需要权限表** - 转录是公开的
3. **只记录付费** - chat_payments 和 transcription_requests 只是历史记录

---

## API 设计

### x402 付费接口（2 个）

#### 1. 转录 Space

```typescript
// POST /entrypoints/transcribe-space/invoke
{
  key: 'transcribe-space',
  price: '200000',  // 0.2 USDC
  input: {
    spaceUrl: string,
    title?: string,  // 可选
  },
  handler: async ({ input, payment }) => {
    // 1. 提取 Space ID
    const spaceId = extractSpaceId(input.spaceUrl);

    // 2. 检查是否已存在
    const existing = await getSpaceBySpaceId(spaceId);
    if (existing) {
      // 已转录过，直接返回
      if (existing.status === 'completed') {
        return {
          success: true,
          spaceId,
          status: 'already_completed',
          message: '该 Space 已转录完成',
        };
      }
      // 正在转录中
      return {
        success: true,
        spaceId,
        status: existing.status,
        message: '转录进行中...',
      };
    }

    // 3. 创建新转录任务
    await db.insert(spaces).values({
      spaceId,
      spaceUrl: input.spaceUrl,
      title: input.title || `Space ${spaceId}`,
      status: 'pending',
    });

    // 4. 记录付费
    await db.insert(transcriptionRequests).values({
      spaceId,
      walletAddress: payment.from,
      amountUsdc: '0.2',
      transactionHash: payment.txHash,
    });

    return {
      success: true,
      spaceId,
      status: 'pending',
      message: '转录任务已创建，预计 3-5 分钟完成',
    };
  }
}
```

#### 2. AI 聊天

```typescript
// POST /entrypoints/chat-with-space/invoke
{
  key: 'chat-with-space',
  price: '500000',  // 0.5 USDC（基础价格）
  input: {
    spaceId: string,
    question: string,
  },
  handler: async ({ input, payment }) => {
    // 1. 检查 space 是否存在且已完成
    const space = await getSpaceBySpaceId(input.spaceId);
    if (!space || space.status !== 'completed') {
      throw new Error('Space 未找到或未完成转录');
    }

    // 2. 读取转录内容
    const transcript = await readTranscriptFile(space.transcriptFilePath);

    // 3. 调用 OpenAI Agent SDK
    const answer = await chatWithOpenAI({
      transcript,
      question: input.question,
      spaceTitle: space.title,
    });

    // 4. 记录付费
    await db.insert(chatPayments).values({
      spaceId: space.id,
      walletAddress: payment.from,
      question: input.question,
      answer: answer.content,
      amountUsdc: '0.5',
      transactionHash: payment.txHash,
    });

    return {
      success: true,
      answer: answer.content,
      spaceTitle: space.title,
    };
  }
}
```

---

### 免费查询接口（3 个）

#### 1. 获取所有已完成的 spaces

```typescript
// GET /api/spaces
app.get('/api/spaces', async (c) => {
  const spaces = await db
    .select({
      spaceId: spaces.spaceId,
      title: spaces.title,
      creator: spaces.creator,
      participants: spaces.participants,
      duration: spaces.audioDurationSeconds,
      completedAt: spaces.completedAt,
    })
    .from(spaces)
    .where(eq(spaces.status, 'completed'))
    .orderBy(desc(spaces.completedAt))
    .limit(50);

  return c.json({ spaces });
});
```

#### 2. 获取某个 space 的详情

```typescript
// GET /api/spaces/:id
app.get('/api/spaces/:id', async (c) => {
  const spaceId = c.req.param('id');

  const space = await db
    .select()
    .from(spaces)
    .where(eq(spaces.spaceId, spaceId))
    .limit(1);

  if (!space[0] || space[0].status !== 'completed') {
    return c.json({ error: 'Space not found or not ready' }, 404);
  }

  // 读取转录文件
  const transcript = await readTranscriptFile(space[0].transcriptFilePath);

  return c.json({
    spaceId: space[0].spaceId,
    title: space[0].title,
    creator: space[0].creator,
    participants: JSON.parse(space[0].participants || '[]'),
    duration: space[0].audioDurationSeconds,
    transcript,
    completedAt: space[0].completedAt,
  });
});
```

#### 3. 获取转录进度

```typescript
// GET /api/spaces/:id/status
app.get('/api/spaces/:id/status', async (c) => {
  const spaceId = c.req.param('id');

  const space = await db
    .select()
    .from(spaces)
    .where(eq(spaces.spaceId, spaceId))
    .limit(1);

  if (!space[0]) {
    return c.json({ status: 'not_found' }, 404);
  }

  return c.json({
    status: space[0].status,
    progress: calculateProgress(space[0]),
    estimatedTimeRemaining: estimateTime(space[0]),
  });
});

function calculateProgress(space: any): number {
  switch (space.status) {
    case 'pending': return 0;
    case 'processing': return 50;
    case 'completed': return 100;
    case 'failed': return 0;
    default: return 0;
  }
}
```

---

## Worker 设计

### 简单轮询 + OpenAI Agent SDK

```typescript
// src/worker/transcriptionWorker.ts
import { Agent } from '@openai/agent-sdk';

const agent = new Agent({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

export async function startWorker() {
  console.log('🚀 Worker started');

  while (true) {
    try {
      // 1. 查找 pending 任务
      const jobs = await db
        .select()
        .from(spaces)
        .where(eq(spaces.status, 'pending'))
        .orderBy(spaces.createdAt)
        .limit(1);

      if (jobs.length === 0) {
        await sleep(10000);
        continue;
      }

      const job = jobs[0];
      console.log(`Processing: ${job.spaceId}`);

      // 2. 更新状态
      await db
        .update(spaces)
        .set({ status: 'processing', processingStartedAt: new Date() })
        .where(eq(spaces.id, job.id));

      // 3. 转录
      const result = await formatSpaceFromUrl(job.spaceUrl);

      // 4. 保存文件
      const transcriptPath = `data/spaces/${job.spaceId}/transcript.md`;
      await saveTranscript(transcriptPath, result.formattedTranscript);

      // 5. 更新为完成
      await db
        .update(spaces)
        .set({
          status: 'completed',
          completedAt: new Date(),
          transcriptFilePath: transcriptPath,
          participants: JSON.stringify(result.participants),
          audioDurationSeconds: result.duration,
        })
        .where(eq(spaces.id, job.id));

      console.log(`✓ Completed: ${job.spaceId}`);

    } catch (error) {
      console.error('Worker error:', error);

      // 标记为失败
      if (job) {
        await db
          .update(spaces)
          .set({ status: 'failed' })
          .where(eq(spaces.id, job.id));
      }
    }

    await sleep(5000);
  }
}
```

### OpenAI Agent SDK 聊天

```typescript
// src/services/chatService.ts
import { Agent } from '@openai/agent-sdk';

const agent = new Agent({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithOpenAI(params: {
  transcript: string;
  question: string;
  spaceTitle: string;
}) {
  const systemPrompt = `你是一个 Twitter Space 转录分析助手。
用户提供了一个 Space 的完整转录内容，你需要根据转录内容回答用户的问题。

Space 标题: ${params.spaceTitle}

转录内容:
${params.transcript}`;

  const response = await agent.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: params.question },
    ],
  });

  return {
    content: response.content,
    tokensUsed: response.usage?.totalTokens || 0,
  };
}
```

---

## 前端页面

### 1. Dashboard

```typescript
// frontend/src/pages/Dashboard.tsx
export function Dashboard() {
  const [spaces, setSpaces] = useState([]);
  const [showTranscribeModal, setShowTranscribeModal] = useState(false);

  useEffect(() => {
    // 加载所有已完成的 spaces（公开）
    fetch('/api/spaces')
      .then(res => res.json())
      .then(data => setSpaces(data.spaces));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Twitter Space 转录库</h1>
        <button
          onClick={() => setShowTranscribeModal(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg"
        >
          转录新 Space
        </button>
      </div>

      {/* 已转录的 Spaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map(space => (
          <SpaceCard key={space.spaceId} space={space} />
        ))}
      </div>

      {/* 转录弹窗 */}
      {showTranscribeModal && (
        <TranscribeModal onClose={() => setShowTranscribeModal(false)} />
      )}
    </div>
  );
}
```

### 2. Space 详情页

```typescript
// frontend/src/pages/SpaceDetail.tsx
export function SpaceDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [question, setQuestion] = useState('');
  const { invokeEntrypoint, isProcessing } = usePayment();

  useEffect(() => {
    // 加载 space 详情（公开）
    fetch(`/api/spaces/${id}`)
      .then(res => res.json())
      .then(data => setSpace(data));
  }, [id]);

  const handleChat = async () => {
    const result = await invokeEntrypoint('chat-with-space', {
      spaceId: id,
      question,
    });

    // 显示回答
    alert(result.answer);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Space 信息 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{space?.title}</h1>
        <div className="text-gray-600">
          创建者: {space?.creator} · 时长: {formatDuration(space?.duration)}
        </div>
      </div>

      {/* 转录内容（公开） */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">转录内容</h2>
        <div className="prose max-w-none">
          {space?.transcript}
        </div>
      </div>

      {/* AI 聊天（付费） */}
      <div className="bg-purple-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">AI 问答（0.5 USDC）</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="问这个 Space 任何问题..."
          className="w-full p-3 border rounded-lg mb-4"
          rows={4}
        />
        <button
          onClick={handleChat}
          disabled={!question || isProcessing}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg"
        >
          {isProcessing ? '处理中...' : '提问'}
        </button>
      </div>
    </div>
  );
}
```

### 3. 转录弹窗

```typescript
// frontend/src/components/TranscribeModal.tsx
export function TranscribeModal({ onClose }: { onClose: () => void }) {
  const [spaceUrl, setSpaceUrl] = useState('');
  const { invokeEntrypoint, isProcessing } = usePayment();
  const navigate = useNavigate();

  const handleTranscribe = async () => {
    try {
      const result = await invokeEntrypoint('transcribe-space', {
        spaceUrl,
      });

      // 跳转到进度页面
      navigate(`/spaces/${result.spaceId}/processing`);
    } catch (error) {
      alert('转录失败: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">转录 Twitter Space</h2>

        <input
          type="url"
          value={spaceUrl}
          onChange={(e) => setSpaceUrl(e.target.value)}
          placeholder="https://x.com/i/spaces/..."
          className="w-full p-3 border rounded-lg mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={handleTranscribe}
            disabled={!spaceUrl || isProcessing}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg"
          >
            {isProcessing ? '处理中...' : '支付 0.2 USDC 并转录'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border rounded-lg"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 部署

### Vercel (Frontend)
```bash
cd frontend
vercel deploy --prod
```

### Railway (Backend)
```bash
# Service 1: Hono App
git push railway main

# Service 2: Worker
# 单独配置 start command: bun run src/worker/transcriptionWorker.ts
```

---

## 总结

### 简化要点
1. **数据库** - 3 张表（spaces, chat_payments, transcription_requests）
2. **API** - 2 个付费 + 3 个免费
3. **前端** - 2 个页面（Dashboard, SpaceDetail）
4. **Worker** - 简单轮询 + OpenAI Agent SDK

### 技术栈确认
- ✅ **Hono + React**（继续当前架构）
- ✅ **PostgreSQL**（必须迁移）
- ✅ **OpenAI Agent SDK**（用于 AI chat）
- ✅ **x402**（无 Gas 支付）

下一步需要我开始实现吗？
