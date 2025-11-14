# Twitter Space Platform

AI-powered platform for transcribing, storing, and chatting with Twitter Spaces. Built with database-backed storage, dual API layers (paid x402 + free HTTP), background job processing, and an interactive dashboard.

## Features

🎙️ **Space Transcription** - Download and transcribe Twitter Spaces with speaker identification
💾 **Persistent Storage** - SQLite database with filesystem storage for audio/transcripts
💰 **Monetized APIs** - Three payment tiers via x402 protocol (transcription, chat unlock, chat queries)
🔓 **Free APIs** - HTTP endpoints for dashboard and user data
🤖 **AI-Powered Chat** - Ask questions about Spaces using GPT-4o
⚙️ **Background Processing** - Async job queue with retry logic
📊 **Interactive Dashboard** - Web UI with wallet authentication
🔒 **Wallet-Based Auth** - MetaMask integration with EIP-191 signatures

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Dashboard)                 │
│              MetaMask + Vanilla JS + Responsive          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ├──────────────────┐
                          │                  │
              ┌───────────▼──────┐  ┌───────▼──────────┐
              │   Free HTTP API  │  │  Paid x402 APIs  │
              │   (Hono Server)  │  │  (Agent-Kit)     │
              └───────────┬──────┘  └───────┬──────────┘
                          │                  │
                          │   ┌──────────────┘
                          │   │
                    ┌─────▼───▼──────┐
                    │   Database      │
                    │   (SQLite)      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │  Job Queue      │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │ Background      │
                    │ Worker          │
                    └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
PRIVATE_KEY=your_wallet_private_key
TWITTER_COOKIES='[{"key":"auth_token","value":"..."}]'
OPENAI_API_KEY=your_openai_api_key

# Optional (with defaults)
DATABASE_URL=./data/database/spaces.db
API_PORT=3001
WORKER_POLL_INTERVAL_MS=10000
```

### 3. Setup Database

```bash
# Run migrations
bun run scripts/migrate.ts
```

### 4. Start Services

```bash
# Terminal 1: Start paid agent (x402 APIs)
bun run dev

# Terminal 2: Start free API server
bun run src/api/server.ts

# Terminal 3: Start background worker
bun run worker

# Terminal 4: Serve dashboard (optional)
bun --bun run public/index.html
```

## API Overview

### Paid x402 APIs (via Agent-Kit)

**Base URL:** `http://localhost:8787`

#### 1. Transcribe Space
- **Endpoint:** `POST /invoke/transcribe-space`
- **Price:** 0.2 USDC
- **Description:** Queue Space transcription job
- **Input:**
  ```json
  {
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "title": "My Space"
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "spaceId": "1RDxlAoOeQRKL",
    "estimatedTimeMinutes": 4
  }
  ```

#### 2. Unlock Chat
- **Endpoint:** `POST /invoke/unlock-space-chat`
- **Price:** 0.5 USDC
- **Description:** Unlock AI chat for a Space
- **Input:**
  ```json
  {
    "spaceId": "1RDxlAoOeQRKL"
  }
  ```

#### 3. Chat with Spaces
- **Endpoint:** `POST /invoke/chat-with-spaces`
- **Price:** 0.9 + 0.1n USDC (n = additional Spaces)
- **Description:** Ask questions about one or more Spaces
- **Input:**
  ```json
  {
    "spaceIds": ["1RDxlAoOeQRKL", "1vOxwAbcdEFGH"],
    "question": "What were the main topics discussed?"
  }
  ```
- **Output:**
  ```json
  {
    "answer": "The main topics were...",
    "sources": [
      {
        "spaceId": "1RDxlAoOeQRKL",
        "title": "My Space",
        "excerpt": "..."
      }
    ],
    "spaceCount": 2,
    "model": "gpt-4o"
  }
  ```

### Free HTTP APIs

**Base URL:** `http://localhost:3001`

**Authentication:** All requests require wallet signature query parameters:
- `wallet` - Wallet address
- `signature` - EIP-191 signature
- `timestamp` - Unix timestamp

#### User APIs

- `GET /api/user/stats` - User statistics
- `GET /api/user/payments` - Payment history

#### Space APIs

- `GET /api/spaces/mine` - User's Spaces
- `GET /api/spaces/search?q=query` - Search Spaces
- `GET /api/spaces/:spaceId` - Space details
- `GET /api/spaces/:spaceId/transcript` - Space transcript
- `GET /api/spaces/:spaceId/chat-status` - Chat unlock status
- `GET /api/spaces/popular` - Popular Spaces

## Project Structure

```
dreams/
├── src/
│   ├── agent/
│   │   ├── agent.ts                    # Agent manifest
│   │   └── entrypoints/                # x402 paid endpoints
│   │       ├── transcribeSpace.ts      # Transcription (0.2 USDC)
│   │       ├── unlockChat.ts           # Chat unlock (0.5 USDC)
│   │       └── chatWithSpaces.ts       # Chat query (0.9 + 0.1n USDC)
│   ├── api/
│   │   ├── server.ts                   # Hono HTTP server
│   │   ├── middleware/
│   │   │   └── auth.ts                 # Wallet signature verification
│   │   └── routes/
│   │       ├── user.ts                 # User endpoints
│   │       └── spaces.ts               # Space endpoints
│   ├── db/
│   │   ├── client.ts                   # Database connection
│   │   ├── schema/                     # Drizzle schemas
│   │   │   ├── spaces.ts               # Space metadata
│   │   │   ├── users.ts                # User records
│   │   │   ├── payments.ts             # Payment tracking
│   │   │   └── jobs.ts                 # Job queue
│   │   └── queries/                    # Database queries
│   │       ├── spaces.ts
│   │       ├── users.ts
│   │       ├── payments.ts
│   │       └── queue.ts
│   ├── services/
│   │   ├── paymentService.ts           # Payment tracking
│   │   └── chatService.ts              # OpenAI chat integration
│   ├── worker/
│   │   └── transcriptionWorker.ts      # Background job processor
│   └── utils/
│       ├── downloadSpace.ts            # Download Twitter Space
│       ├── transcribeAudio.ts          # Whisper transcription
│       ├── formatTranscript.ts         # Speaker identification
│       ├── storageManager.ts           # File storage
│       └── summarizeSpace.ts           # Complete pipeline
├── public/
│   ├── index.html                      # Dashboard home
│   ├── space.html                      # Space details page
│   ├── css/
│   │   └── styles.css                  # Responsive styles
│   └── js/
│       ├── wallet.js                   # MetaMask integration
│       ├── api.js                      # API client
│       ├── utils.js                    # UI utilities
│       └── app.js                      # Main app logic
├── tests/
│   ├── unit/                           # Unit tests
│   └── integration/                    # Integration tests
├── scripts/
│   ├── migrate.ts                      # Database migration
│   ├── worker.ts                       # Worker startup
│   └── test.ts                         # Test runner
└── docs/
    ├── API.md                          # API documentation
    └── DEPLOYMENT.md                   # Deployment guide
```

## Payment Structure

| Service | Price | Description |
|---------|-------|-------------|
| **Transcription** | 0.2 USDC | Queue Space for transcription |
| **Chat Unlock** | 0.5 USDC | Unlock AI chat for a Space |
| **Chat Query** | 0.9 + 0.1n USDC | Ask questions (n = additional Spaces, max 10) |

## Processing Pipeline

```
User Payment → Queue Job → Background Worker → Transcription Complete
      ↓
   Database Record
      ↓
Dashboard Updates
      ↓
Optional: Chat Unlock → Chat Queries
```

**Transcription Flow:**
1. User pays 0.2 USDC via x402
2. Space record created in database (status: pending)
3. Job queued for background processing
4. Worker polls queue every 10 seconds
5. Worker processes: Download → Transcribe → Format → Save
6. Space status updated to 'completed'
7. User can view transcript in dashboard

**Chat Flow:**
1. User unlocks chat for 0.5 USDC
2. Chat unlock recorded in database
3. User asks questions for 0.9 + 0.1n USDC
4. GPT-4o generates answer from transcript(s)
5. Chat session recorded with question/answer

## Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun test:unit           # Unit tests
bun test:integration    # Integration tests

# Type checking
bun run typecheck
```

## Development

```bash
# Start in development mode (hot reload)
bun run dev

# View database
bun run db:studio

# Generate migrations
bun run db:generate
```

## Dashboard Features

- **Wallet Connection** - MetaMask integration with EIP-191 signing
- **User Stats** - Spaces owned, transcriptions purchased, chats unlocked, total spent
- **Space List** - View all purchased Spaces with search
- **Space Details** - View transcript, chat interface
- **Chat Interface** - Ask questions about unlocked Spaces (redirects to agent-kit API)

## Environment Variables

See `.env.example` for complete list.

**Required:**
- `PRIVATE_KEY` - Wallet private key for signing x402 payments
- `TWITTER_COOKIES` - Twitter authentication cookies
- `OPENAI_API_KEY` - OpenAI API key for chat

**Optional:**
- `DATABASE_URL` - SQLite database path (default: `./data/database/spaces.db`)
- `API_PORT` - Free API port (default: `3001`)
- `PORT` - Agent port (default: `8787`)
- `WORKER_POLL_INTERVAL_MS` - Job polling interval (default: `10000`)

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment guide.

**Recommended:**
- **Agent (x402):** Vercel or Railway
- **API Server:** Railway or Fly.io
- **Worker:** Railway (always-on)
- **Dashboard:** Vercel or Netlify
- **Database:** Railway PostgreSQL or Turso (SQLite edge)

## Cost Estimation

For a typical 36-minute Space:

| Service | Cost |
|---------|------|
| Whisper API ($0.006/min) | $0.36 |
| GPT-4o (speaker ID) | $0.48 |
| **Total per transcription** | **$0.84** |

Chat costs (per query):
| Service | Cost |
|---------|------|
| GPT-4o (1500 tokens) | ~$0.02 |

## Troubleshooting

### Database Errors
```bash
# Reset database
rm -rf data/database/spaces.db
bun run scripts/migrate.ts
```

### Worker Not Processing
```bash
# Check worker logs
bun run worker

# Verify jobs in queue
bun run db:studio
```

### MetaMask Connection Issues
- Ensure MetaMask is installed
- Check browser console for errors
- Verify wallet signature format

## Documentation

- [API.md](./docs/API.md) - Complete API reference
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [COOKIE_EXPORT_GUIDE.md](./docs/COOKIE_EXPORT_GUIDE.md) - Twitter cookie setup

## Scripts

```bash
# Development
bun run dev                 # Start agent with hot reload
bun run worker              # Start background worker

# Testing
bun test                    # Run all tests
bun test:unit               # Unit tests
bun test:integration        # Integration tests
bun run typecheck           # TypeScript checking

# Database
bun run db:generate         # Generate migrations
bun run db:migrate          # Apply migrations
bun run db:studio           # Open Drizzle Studio
bun run scripts/migrate.ts  # Programmatic migration

# Production
bun run start               # Start agent
bun run src/api/server.ts   # Start API server
```

## Tech Stack

- **Runtime:** Bun (fast JavaScript runtime)
- **Database:** SQLite with Drizzle ORM
- **Agent Framework:** @lucid-dreams/agent-kit (x402)
- **API Server:** Hono (fast HTTP framework)
- **AI:** OpenAI (Whisper + GPT-4o)
- **Payment:** x402 protocol (USDC on Base)
- **Frontend:** Vanilla JS + MetaMask
- **Testing:** Bun test runner

## License

MIT

## Contributing

Contributions welcome! This project demonstrates:
- x402 micropayment integration
- Database-backed agent architecture
- Dual API design (paid + free)
- Background job processing
- Wallet-based authentication
- AI-powered chat with RAG

Built with [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit)
