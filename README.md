# Twitter Space Summarization Agent

AI-powered agent that downloads, transcribes, and summarizes Twitter Spaces with speaker identification. Built on [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit) and x402 payment protocol.

## Features

🎙️ **Download Finished Spaces** - Downloads audio from completed Twitter Spaces
🗣️ **Speaker Identification** - Uses GPT-4o to identify and label speakers
📝 **Formatted Transcripts** - Structured dialogue with speaker names
📊 **AI Summarization** - Key points and topics with GPT-4o mini
🔐 **Cookie Authentication** - Bypasses Cloudflare protection

## Quick Start

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your TWITTER_COOKIES and OPENAI_API_KEY

# Start the agent
bun run src/index.ts
```

The agent will be available at `http://localhost:8787/.well-known/agent.json`

## Agent Entrypoints

### 1. `format-twitter-space`

Formats a Twitter Space into a structured dialogue with speaker identification.

**Input:**
```json
{
  "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
}
```

**Output:**
```json
{
  "formattedTranscript": "# Twitter Space 完整记录\n\n参加会议：Host, Ash, Kevin...\n\n[Host]: ...\n[Ash]: ...",
  "participants": ["Host", "Ash", "Kevin", "Eric", "Loaf", "JRP", "Sawyer", "Bingey"],
  "title": "Launch an <x402 startup> in 20 minutes",
  "duration": 2160.7
}
```

### 2. `summarize-twitter-space`

Generates a comprehensive summary with key points and topics.

**Input:**
```json
{
  "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
}
```

**Output:**
```json
{
  "summary": "# Twitter Space Summary\n\n## Summary\n\n...\n\n## Key Points\n\n...",
  "title": "Launch an <x402 startup> in 20 minutes",
  "duration": 2160.7,
  "participants": ["Host", "Ash", "Kevin", ...]
}
```

## API Usage

```bash
# Format transcript
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"}'

# Generate summary
curl -X POST http://localhost:8787/invoke/summarize-twitter-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"}'
```

## Project Structure

```
dreams/
├── README.md                    # This file
├── docs/                        # Documentation
│   ├── USAGE_GUIDE.md          # Detailed guide (中文)
│   ├── COOKIE_EXPORT_GUIDE.md  # Cookie instructions
│   └── PROJECT_STRUCTURE.md    # Complete structure
├── src/                         # Source code
│   ├── agent.ts                # Agent manifest
│   ├── index.ts                # HTTP server
│   ├── buildCookies.ts         # Cookie helper
│   ├── verifyCookies.ts        # Cookie validator
│   └── utils/                  # Core functionality
│       ├── downloadSpace.ts    # Download Space
│       ├── transcribeAudio.ts  # Whisper API
│       ├── formatTranscript.ts # Speaker ID
│       ├── summarizeTranscript.ts # Summarization
│       └── summarizeSpace.ts   # Pipeline
└── tests/                       # Test scripts
    ├── testAuth.ts             # Auth test
    ├── testDownload.ts         # Download test
    ├── testTranscribe.ts       # Transcribe test
    ├── testFormat.ts           # Format test
    ├── testSummarize.ts        # Summarize test
    └── testEndToEnd.ts         # E2E test
```

## Setup

### 1. Environment Variables

Create a `.env` file with:

```bash
# Twitter Authentication (required)
TWITTER_COOKIES='[{"key":"auth_token","value":"YOUR_TOKEN","domain":".twitter.com","path":"/"},{"key":"ct0","value":"YOUR_CT0","domain":".twitter.com","path":"/"}]'

# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Agent Configuration (optional)
PORT=8787
API_BASE_URL=http://localhost:8787
```

### 2. Getting Twitter Cookies

**Method 1: Build from tokens**
```bash
bun run src/buildCookies.ts <auth_token> <ct0>
```

**Method 2: Manual export**
1. Log in to Twitter/X in your browser
2. Open DevTools (F12) → Application → Cookies
3. Find `auth_token` and `ct0` cookies
4. Copy their values

See [COOKIE_EXPORT_GUIDE.md](./docs/COOKIE_EXPORT_GUIDE.md) for detailed instructions.

### 3. Verify Setup

```bash
# Test authentication
bun run tests/testAuth.ts

# Test download
bun run tests/testDownload.ts https://x.com/i/spaces/1RDxlAoOeQRKL

# Test complete pipeline
bun run tests/testEndToEnd.ts https://x.com/i/spaces/1RDxlAoOeQRKL
```

## Processing Pipeline

```
Space URL
    ↓
[1] Download Audio (FFmpeg HLS download)
    ↓
[2] Transcribe (OpenAI Whisper)
    ↓
[3] Format & Identify Speakers (GPT-4o)
    ↓         ↓
    ↓     [Output 1] Formatted Transcript
    ↓
[4] Generate Summary (GPT-4o mini)
    ↓
[Output 2] Summary + Participants
```

**Processing Time (36min Space):**
- Download: ~30 seconds
- Transcribe: ~2.5 minutes
- Format: ~1 minute
- Summarize: ~10 seconds
- **Total: ~4-5 minutes**

## Cost Estimation

For a typical 36-minute Space:

| Step | Service | Cost |
|------|---------|------|
| Download | FFmpeg | Free |
| Transcribe | Whisper API ($0.006/min) | $0.36 |
| Format | GPT-4o | $0.48 |
| Summarize | GPT-4o mini | $0.02 |
| **Total** | | **$0.86** |

## Testing Scripts

```bash
# Individual components
bun run tests/testDownload.ts <space_url>
bun run tests/testTranscribe.ts <audio_path>
bun run tests/testFormat.ts <transcript_path>
bun run tests/testSummarize.ts <transcript_path>

# Complete end-to-end
bun run tests/testEndToEnd.ts <space_url>
```

## Output Examples

### Formatted Transcript Output

```markdown
# Twitter Space 完整记录

## Launch an <x402 startup> in 20 minutes

**Space URL:** https://x.com/i/spaces/1RDxlAoOeQRKL

**参加会议：** Host, Ash, Kevin, Eric, Loaf, JRP, Sawyer, Bingey

---

[Host]: Mic check. 1, 2, 1, 2. Can anyone hear?
[Ash]: Yeah. Okay. Thank you.
[Host]: I've accidentally run this off my laptop rather than my phone...
[Kevin]: Hello, GM. How's it going?
[Host]: That's great. Oh, relief. GM, guys...
```

### Summary Output

```markdown
# Twitter Space Summary

## Launch an <x402 startup> in 20 minutes

## Summary

The Twitter Space featured a vibrant discussion on the X402 protocol
and opportunities for startups in the AI and crypto space...

## Key Points

1. The X402 protocol opens unique opportunities for startups
2. Significant potential for microservices utilized by AI agents
3. Importance of collaboration among builders
4. Facilitators and gas costs are critical factors

## Topics Discussed

- X402 Protocol
- AI and Crypto Integration
- Microservices Development
- Agent-to-Agent Commerce
```

## Technical Details

### Twitter API Integration

Uses direct Twitter GraphQL API calls with proper feature flags (works around bugs in `@pacoyang/agent-twitter-client`):

- **AudioSpaceById** - Fetch Space metadata
- **live_video_stream/status** - Get HLS URL for download

### Models Used

- **Transcription:** Whisper-1
- **Speaker Identification:** GPT-4o (better context understanding)
- **Summarization:** GPT-4o mini (cost-effective)

### Speaker Identification

GPT-4o identifies speakers based on:
- Dialogue content and context
- Tone and style changes
- Known participant information from Space metadata

Accuracy depends on:
- Clarity of the conversation
- Distinct speaking styles
- Rich contextual clues

## Limitations

- ⚠️ **File Size:** Audio files must be under 25MB (~40 minutes)
- ⚠️ **Replay Only:** Only works with Spaces that have replay enabled
- ⚠️ **Cookie Expiration:** Twitter cookies may expire and need refresh
- ⚠️ **Rate Limits:** Subject to Twitter and OpenAI API rate limits

## Troubleshooting

### "Failed to fetch Audio Space"
- Verify cookies: `bun run tests/testAuth.ts`
- Check Space has replay enabled
- Ensure correct URL format

### "Audio file is too large"
- Space recording exceeds 25MB
- Future: Audio chunking support

### "Missing TWITTER_COOKIES"
- Check `.env` file exists and has correct format
- Verify cookies: `bun run src/verifyCookies.ts`

## Documentation

- [USAGE_GUIDE.md](./docs/USAGE_GUIDE.md) - Detailed usage guide (中文)
- [COOKIE_EXPORT_GUIDE.md](./docs/COOKIE_EXPORT_GUIDE.md) - Cookie export instructions
- [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) - Complete project structure and file descriptions

## Available Scripts

```bash
# Development
bun run dev              # Start agent in watch mode
bun run src/index.ts     # Start agent once

# Testing
bun run tests/testAuth.ts                    # Test Twitter authentication
bun run tests/testDownload.ts <url>          # Test download
bun run tests/testTranscribe.ts <audio>      # Test transcription
bun run tests/testFormat.ts <transcript>     # Test formatting
bun run tests/testSummarize.ts <transcript>  # Test summarization
bun run tests/testEndToEnd.ts <url>          # Test complete pipeline

# Type checking
bunx tsc --noEmit
```

## Example Usage

```bash
# 1. Start the agent
bun run src/index.ts

# 2. In another terminal, call the API
curl -X POST http://localhost:8787/invoke/format-twitter-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://x.com/i/spaces/1RDxlAoOeQRKL"
  }' | jq .

# 3. View the results
cat /tmp/space_formatted_*.md
cat /tmp/space_summary_*.md
```

## License

Built on [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit)

## Contributing

This agent demonstrates:
- Direct Twitter GraphQL API integration
- Cookie-based authentication
- Multi-step AI pipeline (Whisper → GPT-4o → GPT-4o mini)
- x402 payment protocol integration
- Speaker diarization with LLMs

Feel free to extend or modify for your use case!
