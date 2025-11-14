# Twitter Space 数据流

## 系统架构

```
Twitter Space URL
       ↓
[1] Download Space Audio (downloadSpace.ts)
       ↓
   Audio File (.m4a)
       ↓
[2] Transcribe Audio (transcribeAudio.ts)
       ↓
   Raw Transcript Text
       ↓
[3] Format Transcript (formatTranscript.ts)
       ↓
   Structured Dialogue with Speakers
       ↓
[4] Summarize Transcript (summarizeTranscript.ts)
       ↓
   Summary + Key Points + Topics
```

## 数据流详细说明

### Stage 1: 下载音频 (downloadSpace.ts)

**输入:**
- `spaceUrl`: Twitter Space URL (例如: `https://x.com/i/spaces/1vOGwAbcdEFGH`)

**处理流程:**
1. 从 URL 中提取 Space ID (使用正则匹配 `spaces/([a-zA-Z0-9]+)`)
2. 使用 Twitter cookies 进行身份认证
3. 调用 Twitter GraphQL API `AudioSpaceById` 获取 Space 元数据
   - 查询 ID: `Tvv_cNXCbtTcgdy1vWYPMw`
   - 返回: title, creator_id, media_key, is_space_available_for_replay 等
4. 使用 media_key 调用 Twitter API `/live_video_stream/status/{mediaKey}` 获取 HLS 流 URL
5. 使用 FFmpeg 下载 HLS 流:
   ```bash
   ffmpeg -y -i <HLS_URL> -c copy -bsf:a aac_adtstoasc <output.m4a>
   ```

**输出:**
```typescript
{
  audioPath: string,           // 下载的音频文件路径 (/tmp/space_<spaceId>.m4a)
  metadata: {
    title: string,             // Space 标题
    creator?: string,          // 创建者 ID
    isAvailableForReplay: boolean,
    mediaKey?: string
  }
}
```

**依赖:**
- Twitter cookies (环境变量 `TWITTER_COOKIES`)
- FFmpeg (系统工具)

---

### Stage 2: 转录音频 (transcribeAudio.ts)

**输入:**
- `audioPath`: 音频文件的完整路径

**处理流程:**
1. 检查文件大小是否超过 25MB (OpenAI Whisper API 限制)
2. **如果文件 > 25MB:**
   - 从环境变量 `AUDIO_CHUNK_DURATION_MINUTES` 读取切片时长 (默认: 10 分钟)
   - 使用 FFmpeg segment 功能切分音频:
     ```bash
     ffmpeg -i <input> -f segment -segment_time <duration_in_seconds> -c copy -reset_timestamps 1 <output_chunk_%03d.m4a>
     ```
   - **并行转录所有块** (使用 `Promise.all`)
   - 合并所有块的转录结果
   - 清理临时块文件
3. **如果文件 <= 25MB:**
   - 直接调用 OpenAI Whisper API
4. 调用 OpenAI Whisper API:
   ```typescript
   openai.audio.transcriptions.create({
     file: fs.createReadStream(audioPath),
     model: 'whisper-1',
     language: 'en',
     response_format: 'verbose_json'
   })
   ```

**输出:**
```typescript
{
  text: string,      // 转录的完整文本
  duration?: number  // 音频时长 (秒)
}
```

**性能优化:**
- 大文件并行处理，性能提升 4-5 倍
- 示例: 60 分钟音频，分为 6 个 10 分钟块
  - 串行: ~15 分钟
  - 并行: ~3-4 分钟

**依赖:**
- OpenAI API Key (环境变量 `OPENAI_API_KEY`)
- FFmpeg (用于切分音频)

---

### Stage 3: 格式化转录 (formatTranscript.ts)

**输入:**
- `rawTranscript`: 原始转录文本 (来自 Stage 2)
- `spaceTitle?`: Space 标题 (可选，用于上下文)
- `spaceMetadata?`: Space 元数据 (可选，包含参与者信息)

**处理流程:**
1. 构建 LLM 提示词，要求:
   - 识别不同的说话人
   - 分配说话人标签 (优先使用真实姓名，否则使用 Speaker A, B, C...)
   - 格式化为结构化对话
   - 清理填充词但保持原意
2. 调用 OpenAI GPT-4o API:
   ```typescript
   openai.chat.completions.create({
     model: 'gpt-4o',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt }
     ],
     temperature: 0.3,
     response_format: { type: 'json_object' }
   })
   ```
3. 解析 JSON 响应并验证结构

**输出:**
```typescript
{
  participants: string[],     // 参与者列表 ["Speaker A", "Speaker B", ...]
  formattedText: string       // 格式化的对话文本
}
```

**输出格式示例:**
```
参加会议：Alice, Bob, Charlie

Alice: So what do you think about the new protocol?
Bob: I think it's really interesting. The key innovation is...
Charlie: I agree with Bob, but we should also consider...
```

**依赖:**
- OpenAI API Key (GPT-4o)

---

### Stage 4: 总结转录 (summarizeTranscript.ts)

**输入:**
- `transcript`: 格式化后的转录文本 (来自 Stage 3)
- `spaceTitle?`: Space 标题 (可选)

**处理流程:**
1. 构建 LLM 提示词，要求生成:
   - 综合总结 (2-3 段落)
   - 关键讨论点列表
   - 讨论的主题列表
2. 调用 OpenAI GPT-4o-mini API:
   ```typescript
   openai.chat.completions.create({
     model: 'gpt-4o-mini',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt }
     ],
     temperature: 0.7,
     response_format: { type: 'json_object' }
   })
   ```

**输出:**
```typescript
{
  summary: string,       // 综合总结
  keyPoints: string[],   // 关键讨论点
  topics: string[]       // 主题列表
}
```

**依赖:**
- OpenAI API Key (GPT-4o-mini)

---

## 管道编排 (summarizeSpace.ts)

提供两个高层级管道函数，封装完整的处理流程。

### 1. formatSpaceFromUrl()

**执行流程:**
```
Stage 1 (下载) → Stage 2 (转录) → Stage 3 (格式化)
```

**输出:**
```typescript
{
  spaceUrl: string,
  metadata: SpaceDownloadResult['metadata'],
  transcription: TranscriptionResult,
  formattedTranscript: FormattedTranscriptResult,
  formattedTranscriptMarkdown: string
}
```

**特性:**
- 支持进度回调 (`onProgress`)
- 输出结构化对话，识别说话人
- 不包含总结 (更快)

### 2. summarizeSpaceFromUrl()

**执行流程:**
```
Stage 1 (下载) → Stage 2 (转录) → Stage 3 (格式化) → Stage 4 (总结)
```

**输出:**
```typescript
{
  spaceUrl: string,
  metadata: SpaceDownloadResult['metadata'],
  transcription: TranscriptionResult,
  formattedTranscript: FormattedTranscriptResult,
  summary: SummaryResult,
  summaryMarkdown: string,
  formattedTranscriptMarkdown: string
}
```

**特性:**
- 完整处理流程
- 同时返回格式化转录和总结
- 输出 Markdown 格式

---

## Agent 接口 (agent-improved.ts)

提供两个 HTTP entrypoint，基于 x402 支付协议。

### Entrypoint 1: format-twitter-space

**用途:** 下载、转录、格式化 Twitter Space (不包含总结)

**输入:**
```typescript
{
  spaceUrl: string  // Twitter Space URL
}
```

**输出:**
```typescript
{
  formattedTranscript: string,  // Markdown 格式化转录
  participants: string[],       // 参与者列表
  title: string,                // Space 标题
  duration?: number,            // 时长 (秒)
  costBreakdown?: {
    whisper: number,            // Whisper API 成本 (USD)
    gpt4o: number,              // GPT-4o 成本 (USD)
    total: number               // 总成本 (USD)
  }
}
```

**特性:**
- 支持 HTTP streaming (SSE 进度更新)
- 定价: 0.2 USDC
- 处理时间: 约 4 分钟 (30 分钟 Space)

**内部实现:**
```typescript
formatSpaceFromUrl(spaceUrl, onProgress)
```

### Entrypoint 2: summarize-twitter-space

**用途:** 完整处理流程 (下载、转录、格式化、总结)

**输入:**
```typescript
{
  spaceUrl: string  // Twitter Space URL
}
```

**输出:**
```typescript
{
  summary: string,              // Markdown 总结
  title: string,
  duration?: number,
  participants: string[],
  keyPoints: string[],
  topics: string[],
  costBreakdown?: {
    whisper: number,
    gpt4o: number,
    gpt4oMini: number,
    total: number
  }
}
```

**特性:**
- 定价: 0.15 USDC
- 处理时间: 约 4-5 分钟 (30 分钟 Space)

**内部实现:**
```typescript
summarizeSpaceFromUrl(spaceUrl)
```

---

## 成本透明度

系统会计算并返回实际的 API 成本:

- **Whisper API**: $0.006 / 分钟音频
- **GPT-4o**: ~$0.48 (格式化)
- **GPT-4o-mini**: ~$0.02 (总结)

**示例 (30 分钟 Space):**
- Whisper: $0.18
- GPT-4o: $0.48
- GPT-4o-mini: $0.02
- **总计: ~$0.68**

---

## 性能特性

1. **并行转录**: 大文件自动切分并行处理，提速 4-5 倍
   - 可通过 `AUDIO_CHUNK_DURATION_MINUTES` 环境变量调整切片时长
   - 更小的切片 = 更高的并行度，但会增加 API 调用次数
   - 推荐范围: 5-15 分钟
2. **流式输出**: 支持 SSE 实时进度更新
3. **成本优化**: 使用 GPT-4o-mini 进行总结，降低成本
4. **错误处理**: 完善的错误处理和日志记录

---

## 环境依赖

**必需环境变量:**
- `TWITTER_COOKIES`: Twitter 认证 cookies (JSON 数组)
- `OPENAI_API_KEY`: OpenAI API 密钥

**可选环境变量:**
- `FACILITATOR_URL`: x402 facilitator 地址
- `PAY_TO`: 接收支付的钱包地址
- `NETWORK`: 支付网络 (base-sepolia/base)
- `PRICE_FORMAT_SPACE`: format entrypoint 定价
- `PRICE_SUMMARIZE_SPACE`: summarize entrypoint 定价
- `AUDIO_CHUNK_DURATION_MINUTES`: 音频切片时长（分钟），范围 1-30，默认 10

**系统工具:**
- FFmpeg (音频处理)

---

## 数据持久化

**临时文件:**
- 音频文件: `/tmp/space_<spaceId>.m4a`
- 音频块 (如果切分): `/tmp/space_<spaceId>_chunk_XXX.m4a`

**清理策略:**
- 音频块在转录完成后立即删除
- 主音频文件需要手动清理

**输出格式:**
- 格式化转录: Markdown
- 总结: Markdown
- 原始转录: 文本

---

## 错误处理

系统在每个阶段都有完善的错误处理:

1. **下载阶段**:
   - Space 不存在或不可重播
   - 认证失败
   - 网络错误

2. **转录阶段**:
   - 文件不存在
   - OpenAI API 错误
   - FFmpeg 错误

3. **格式化阶段**:
   - LLM 返回格式错误
   - JSON 解析失败

4. **总结阶段**:
   - LLM API 错误
   - 响应格式错误

所有错误都会被捕获并返回清晰的错误消息。
