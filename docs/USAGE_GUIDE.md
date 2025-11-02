# Twitter Space Agent 使用指南

这个 agent 现在提供两个主要功能，用于处理已结束的 Twitter Spaces：

## 🎯 两个 Agent Entrypoints

### 1. `format-twitter-space` - 格式化转录稿

下载、转录并格式化 Twitter Space，识别说话人并生成结构化对话记录。

**输入：**
```json
{
  "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
}
```

**输出：**
```json
{
  "formattedTranscript": "# Twitter Space 完整记录\n\n参加会议：Host, Ash, Kevin...",
  "participants": ["Host", "Ash", "Kevin", "Eric", ...],
  "title": "Launch an <x402 startup> in 20 minutes",
  "duration": 2160.7
}
```

**输出格式示例：**
```markdown
# Twitter Space 完整记录

## Launch an <x402 startup> in 20 minutes

**Space URL:** https://x.com/i/spaces/1RDxlAoOeQRKL

**参加会议：** Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey

---

[Host]: Mic check. 1, 2, 1, 2. Can anyone hear?
[Ash]: Yeah. Okay. Thank you.
[Host]: I've accidentally run this off my laptop...
[Kevin]: Hello, GM. How's it going?
...
```

### 2. `summarize-twitter-space` - 生成总结

下载、转录、格式化并总结 Twitter Space，提供关键要点和讨论主题的综合摘要。

**输入：**
```json
{
  "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
}
```

**输出：**
```json
{
  "summary": "# Twitter Space Summary\n\n## Summary\n\n...",
  "title": "Launch an <x402 startup> in 20 minutes",
  "duration": 2160.7,
  "participants": ["Host", "Ash", "Kevin", ...]
}
```

**输出格式示例：**
```markdown
# Twitter Space Summary

## Launch an <x402 startup> in 20 minutes

**Space URL:** https://x.com/i/spaces/1RDxlAoOeQRKL

## Summary

The Twitter Space titled "Launch an <x402 startup> in 20 minutes"
featured a vibrant discussion on the emerging potential of the X402
protocol...

## Key Points

1. The X402 protocol opens up unique opportunities for startups...
2. There's a significant potential for microservices...
3. The conversation highlighted the importance of collaboration...
4. Facilitators and gas costs were discussed...

## Topics Discussed

- X402 Protocol
- AI and Crypto Integration
- Microservices Development
- Agent-to-Agent Commerce
```

## 🚀 使用方法

### 启动 Agent

```bash
# 确保已配置 .env 文件
bun run src/index.ts
```

Agent 将在 `http://localhost:8787` 启动。

### 调用 API

**格式化转录稿：**
```bash
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
  }'
```

**生成总结：**
```bash
curl -X POST http://localhost:8787/invoke/summarize-twitter-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
  }'
```

### 独立测试脚本

如果只想测试特定功能，可以使用独立测试脚本：

```bash
# 1. 仅下载
bun run tests/testDownload.ts https://x.com/i/spaces/1RDxlAoOeQRKL

# 2. 仅转录（需要已下载的音频）
bun run tests/testTranscribe.ts /tmp/space_1RDxlAoOeQRKL.m4a

# 3. 仅格式化（需要已转录的文本）
bun run tests/testFormat.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt

# 4. 仅总结（需要已转录的文本）
bun run tests/testSummarize.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt

# 5. 完整端到端测试
bun run tests/testEndToEnd.ts https://x.com/i/spaces/1RDxlAoOeQRKL
```

## 📊 完整处理流程

```
输入: Space URL
    ↓
[步骤 1] 下载 Space 音频
    ↓
[步骤 2] 使用 Whisper API 转录
    ↓
[步骤 3] 使用 GPT-4o 格式化并识别说话人
    ↓         ↓
    ↓     [输出 1] 格式化转录稿
    ↓         (format-twitter-space)
    ↓
[步骤 4] 使用 GPT-4o mini 生成总结
    ↓
[输出 2] 总结 + 格式化转录稿
    (summarize-twitter-space)
```

## 💰 成本估算

以 36 分钟的 Space 为例：

| 步骤 | 服务 | 成本 |
|------|------|------|
| 下载 | FFmpeg | 免费 |
| 转录 | Whisper API | ~$0.36 |
| 格式化 | GPT-4o | ~$0.48 |
| 总结 | GPT-4o mini | ~$0.02 |
| **总计** | | **~$0.86** |

## 🎨 输出对比

### format-twitter-space（格式化转录稿）

✅ **适用场景：**
- 需要完整的对话记录
- 想知道具体是谁说了什么
- 需要引用原文
- 做详细分析

📝 **输出内容：**
- 识别出的参与者列表
- 结构化的对话记录（说话人 + 内容）
- 完整的原始对话（已清理）

### summarize-twitter-space（生成总结）

✅ **适用场景：**
- 快速了解 Space 内容
- 提取关键信息
- 分享给他人
- 做简报

📝 **输出内容：**
- 2-3 段综合摘要
- 关键要点列表（通常 4-6 个）
- 讨论的主题列表
- 参与者列表

## 🔧 技术细节

### 说话人识别

使用 GPT-4o 的上下文理解能力，基于：
- 对话内容和上下文
- 语气和风格变化
- 已知的参与者信息（从 Space 元数据）

准确率取决于：
- 对话的清晰度
- 说话人风格的差异
- 上下文线索的丰富程度

### 模型选择

- **转录**：Whisper-1（OpenAI 唯一选择）
- **格式化**：GPT-4o（更好的上下文理解和说话人识别）
- **总结**：GPT-4o mini（成本效益高，总结质量好）

## 📁 输出文件示例

测试输出文件位于 `/tmp/`：

- `space_1RDxlAoOeQRKL.m4a` - 下载的音频
- `space_1RDxlAoOeQRKL_transcription.txt` - 原始转录
- `space_1RDxlAoOeQRKL_formatted.md` - 格式化转录稿
- `space_1RDxlAoOeQRKL_summary.md` - 总结

## ⚠️ 注意事项

1. **Space 必须可重播**：`is_space_available_for_replay: true`
2. **音频大小限制**：目前限制 25MB（约 40 分钟）
3. **Cookie 有效期**：Twitter cookies 可能过期，需定期更新
4. **处理时间**：
   - 下载：~30 秒（取决于 Space 长度）
   - 转录：~2.5 分钟（36 分钟音频）
   - 格式化：~1 分钟
   - 总结：~10 秒
   - **总计**：~4-5 分钟

## 🆘 故障排除

### "Failed to fetch Audio Space"
- 检查 cookies 是否有效：`bun run tests/testAuth.ts`
- 确认 Space 可以重播
- 验证 URL 格式正确

### "Audio file is too large"
- Space 录音超过 25MB
- 未来版本将支持音频分块

### 格式化识别不准确
- GPT-4o 尽力识别说话人，但不保证 100% 准确
- 可以手动调整输出文件
- 考虑使用原始转录稿作为参考

## 📚 相关文档

- [README.md](../README.md) - 项目总览和快速开始（英文）
- [COOKIE_EXPORT_GUIDE.md](./COOKIE_EXPORT_GUIDE.md) - Cookie 导出指南
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 完整项目结构

## 🎉 快速开始

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 添加你的 TWITTER_COOKIES 和 OPENAI_API_KEY

# 2. 启动 agent
bun run src/index.ts

# 3. 在另一个终端测试
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"}'
```
