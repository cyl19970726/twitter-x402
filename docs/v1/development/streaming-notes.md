# 测试流式 API

## 使用流式端点

流式端点提供实时进度更新，同时仍然返回完整的最终结果。

### 端点

```
POST /entrypoints/format-twitter-space/stream
```

### 示例请求 (curl)

```bash
curl -X POST http://localhost:8787/entrypoints/format-twitter-space/stream \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
  }'
```

### 流式输出示例

```
event: text
data: {"text":"⏳ Step 1/3: Downloading Space audio..."}

event: text
data: {"text":"✓ Step 1/3: Audio downloaded successfully"}

event: delta
data: {"delta":"  Title: \"Launch an <x402 startup> in 20 minutes\"\n  Size: 35.24 MB\n\n"}

event: text
data: {"text":"⏳ Step 2/3: Transcribing audio with Whisper API..."}

event: text
data: {"text":"✓ Step 2/3: Transcription complete"}

event: delta
data: {"delta":"  Characters: 45,230\n  Duration: 36m 0s\n\n"}

event: text
data: {"text":"⏳ Step 3/3: Formatting transcript with GPT-4o..."}

event: text
data: {"text":"✓ Step 3/3: Formatting complete"}

event: delta
data: {"delta":"  Participants: 8\n  Speakers: Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey\n\n"}

event: text
data: {"text":"\n✅ Processing complete in 245.3s!\n"}

event: run-end
data: {
  "run_id":"run_abc123",
  "status":"completed",
  "output":{
    "formattedTranscript":"# Twitter Space 完整记录...",
    "participants":["Host","Ash","Kevin",...],
    "title":"Launch an <x402 startup> in 20 minutes",
    "duration":2160.7,
    "costBreakdown":{
      "whisper":0.216,
      "gpt4o":0.48,
      "total":0.696
    }
  },
  "usage":{
    "total_tokens":45230,
    "processing_time_seconds":245.3
  }
}
```

## 对比：invoke vs stream

### `/invoke` 端点（非流式）

**特点**:
- 等待所有处理完成后一次性返回结果
- 客户端在 4-5 分钟内没有任何反馈
- 适合后台任务或批处理

**响应**:
```json
{
  "run_id": "run_abc123",
  "status": "completed",
  "output": { ... }
}
```

### `/stream` 端点（流式）

**特点**:
- 实时发送进度更新（SSE 格式）
- 客户端可以显示当前正在执行的步骤
- 最终结果仍然通过 `run-end` 事件返回
- 更好的用户体验

**响应格式**: Server-Sent Events (SSE)

## JavaScript 客户端示例

```javascript
const eventSource = new EventSource(
  'http://localhost:8787/entrypoints/format-twitter-space/stream',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spaceUrl: 'https://x.com/i/spaces/1RDxlAoOeQRKL'
    })
  }
);

// 监听进度更新
eventSource.addEventListener('text', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.text);
});

eventSource.addEventListener('delta', (event) => {
  const data = JSON.parse(event.data);
  console.log('Details:', data.delta);
});

// 监听最终结果
eventSource.addEventListener('run-end', (event) => {
  const data = JSON.parse(event.data);
  console.log('Final result:', data.output);
  eventSource.close();
});

// 监听错误
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Error:', data.message);
  eventSource.close();
});
```

## Python 客户端示例

```python
import requests
import json

url = 'http://localhost:8787/entrypoints/format-twitter-space/stream'
data = {'spaceUrl': 'https://x.com/i/spaces/1RDxlAoOeQRKL'}

response = requests.post(url, json=data, stream=True)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')

        if line.startswith('event: '):
            event_type = line.split(': ')[1]
        elif line.startswith('data: '):
            event_data = json.loads(line.split(': ', 1)[1])

            if event_type == 'text':
                print(f"Progress: {event_data['text']}")
            elif event_type == 'delta':
                print(f"Details: {event_data['delta']}")
            elif event_type == 'run-end':
                print(f"Final result: {event_data['output']}")
                break
            elif event_type == 'error':
                print(f"Error: {event_data['message']}")
                break
```

## 进度消息格式

### Step 1: Download
```
⏳ Step 1/3: Downloading Space audio...
✓ Step 1/3: Audio downloaded successfully
  Title: "Space Title"
  Size: 35.24 MB
```

### Step 2: Transcribe
```
⏳ Step 2/3: Transcribing audio with Whisper API...
✓ Step 2/3: Transcription complete
  Characters: 45,230
  Duration: 36m 0s
```

### Step 3: Format
```
⏳ Step 3/3: Formatting transcript with GPT-4o...
✓ Step 3/3: Formatting complete
  Participants: 8
  Speakers: Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey
```

### Completion
```
✅ Processing complete in 245.3s!
```

## 使用建议

1. **前端应用**: 使用 `/stream` 端点显示实时进度
2. **后台任务**: 使用 `/invoke` 端点简化处理
3. **批量处理**: 使用 `/invoke` 端点并行处理多个 Space
4. **交互式 CLI**: 使用 `/stream` 端点提供用户反馈

## 定价

两个端点的价格相同：
- `invoke`: 0.2 USDC
- `stream`: 0.2 USDC

流式端点不会产生额外费用！
