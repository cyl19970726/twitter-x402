# Project Structure

## Overview

```
dreams/
├── README.md                           # Main documentation (English)
├── .env                                # Environment variables
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript configuration
│
├── docs/                               # Documentation
│   ├── USAGE_GUIDE.md                 # Detailed usage guide (中文)
│   ├── COOKIE_EXPORT_GUIDE.md         # Cookie export instructions
│   └── PROJECT_STRUCTURE.md           # This file
│
├── src/                                # Source code
│   ├── agent-improved.ts                       # Agent manifest with entrypoints
│   ├── index.ts                       # HTTP server
│   ├── buildCookies.ts                # Build cookies from tokens
│   ├── verifyCookies.ts               # Verify cookie validity
│   │
│   └── utils/                         # Core functionality
│       ├── downloadSpace.ts          # Download Twitter Space audio
│       ├── transcribeAudio.ts        # Whisper API transcription
│       ├── formatTranscript.ts       # GPT-4o speaker identification
│       ├── summarizeTranscript.ts    # GPT-4o mini summarization
│       ├── summarizeSpace.ts         # Complete pipeline orchestration
│       └── getCookies.ts             # Cookie handling utilities
│
├── tests/                              # Test scripts
│   ├── testAuth.ts                    # Test Twitter authentication
│   ├── testDownload.ts                # Test Space download
│   ├── testTranscribe.ts              # Test audio transcription
│   ├── testFormat.ts                  # Test transcript formatting
│   ├── testSummarize.ts               # Test summarization
│   └── testEndToEnd.ts                # Complete pipeline test
│
└── node_modules/                       # Dependencies
```

## File Descriptions

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project overview, quick start, API reference (in root) |
| `docs/USAGE_GUIDE.md` | Detailed Chinese usage guide with examples |
| `docs/COOKIE_EXPORT_GUIDE.md` | Instructions for exporting Twitter cookies |
| `docs/PROJECT_STRUCTURE.md` | This file - complete project structure |

### Core Files

| File | Purpose |
|------|---------|
| `src/agent.ts` | Defines agent manifest and two entrypoints:<br/>- `format-twitter-space`<br/>- `summarize-twitter-space` |
| `src/index.ts` | Bun HTTP server that serves the agent |

### Utilities (`src/utils/`)

| File | Purpose | Dependencies |
|------|---------|--------------|
| `downloadSpace.ts` | Downloads Space audio via Twitter GraphQL API and FFmpeg | Twitter cookies, FFmpeg |
| `transcribeAudio.ts` | Transcribes audio to text | OpenAI Whisper API |
| `formatTranscript.ts` | Identifies speakers and formats dialogue | GPT-4o |
| `summarizeTranscript.ts` | Generates summary with key points | GPT-4o mini |
| `summarizeSpace.ts` | Orchestrates the complete pipeline | All above |
| `getCookies.ts` | Cookie handling utilities | - |

### Helper Scripts

| File | Purpose | Usage |
|------|---------|-------|
| `buildCookies.ts` | Build cookie JSON from tokens | `bun run src/buildCookies.ts <auth_token> <ct0>` |
| `verifyCookies.ts` | Verify cookie format and content | `bun run src/verifyCookies.ts` |

### Test Scripts (`tests/`)

| File | Tests | Usage |
|------|-------|-------|
| `testAuth.ts` | Twitter authentication | `bun run tests/testAuth.ts` |
| `testDownload.ts` | Space download | `bun run tests/testDownload.ts <url>` |
| `testTranscribe.ts` | Audio transcription | `bun run tests/testTranscribe.ts <audio_path>` |
| `testFormat.ts` | Transcript formatting | `bun run tests/testFormat.ts <transcript_path>` |
| `testSummarize.ts` | Summarization | `bun run tests/testSummarize.ts <transcript_path>` |
| `testEndToEnd.ts` | Complete pipeline | `bun run tests/testEndToEnd.ts <url>` |

## Data Flow

```
User Request (Space URL)
    ↓
agent.ts (entrypoint handler)
    ↓
summarizeSpace.ts (orchestrator)
    ↓
    ├─→ downloadSpace.ts → [Audio File]
    ├─→ transcribeAudio.ts → [Raw Transcript]
    ├─→ formatTranscript.ts → [Formatted Dialogue]
    └─→ summarizeTranscript.ts → [Summary]
    ↓
Response (Markdown output)
```

## API Endpoints

When the agent is running (`bun run src/index.ts`):

- `GET /.well-known/agent.json` - Agent manifest
- `POST /invoke/format-twitter-space` - Format transcript with speakers
- `POST /invoke/summarize-twitter-space` - Generate summary

## Dependencies

Key dependencies in `package.json`:

- `@lucid-dreams/agent-kit` - Agent framework
- `@pacoyang/agent-twitter-client` - Twitter API client
- `openai` - OpenAI API (Whisper, GPT-4o, GPT-4o mini)
- `zod` - Schema validation

## Environment Variables

Required in `.env`:

```bash
TWITTER_COOKIES='[...]'    # Twitter auth_token and ct0
OPENAI_API_KEY=sk-...      # OpenAI API key
PORT=8787                  # Agent server port (optional)
```

## Output Files

Generated in `/tmp/`:

- `space_<id>.m4a` - Downloaded audio
- `space_<id>_transcription.txt` - Raw transcript
- `space_<id>_formatted.md` - Formatted dialogue
- `space_<id>_summary.md` - Summary
- `space_formatted_<timestamp>.md` - Agent formatted output
- `space_summary_<timestamp>.md` - Agent summary output

## Development Workflow

1. **Setup**: Configure `.env` with credentials
2. **Test Auth**: `bun run tests/testAuth.ts`
3. **Test Components**: Run individual test scripts from `tests/`
4. **Start Agent**: `bun run src/index.ts`
5. **Call API**: Use curl or HTTP client
6. **Check Output**: View `/tmp/space_*.md` files

## Code Organization Principles

- **Separation of Concerns**: Each utility handles one responsibility
- **Testability**: Each component can be tested independently
- **Reusability**: Utilities can be used standalone or in pipeline
- **Error Handling**: Clear error messages at each step
- **Logging**: Progress indication throughout pipeline
