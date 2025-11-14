# System Architecture - Twitter Space Agent

## Overview

The system consists of two distinct API layers:
1. **Paid APIs** - Using `@lucid-dreams/agent-kit` with x402 payment protocol
2. **Free APIs** - Standard HTTP endpoints for dashboard and data access

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Flow                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   User connects with Wallet         │
        │   (for both payment & authentication)│
        └─────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────────┐   ┌──────────────────────┐
    │   Paid APIs (x402)    │   │   Free APIs (HTTP)   │
    │  - agent-kit wrapped  │   │  - Dashboard         │
    │  - Payment required   │   │  - No payment        │
    └───────────────────────┘   └──────────────────────┘
                │                           │
                ▼                           ▼
    ┌───────────────────────┐   ┌──────────────────────┐
    │  Background Workers   │   │   Storage Layer      │
    │  - Audio download     │   │  - File system       │
    │  - Transcription      │   │  - Metadata DB       │
    │  - Formatting         │   │  - User permissions  │
    └───────────────────────┘   └──────────────────────┘
                │                           │
                └───────────┬───────────────┘
                            ▼
                ┌───────────────────────┐
                │    Storage            │
                │  data/spaces/         │
                │  data/payments/       │
                └───────────────────────┘
```

---

## 1. Paid APIs (x402 + agent-kit)

These APIs require payment via x402 protocol and are wrapped with `@lucid-dreams/agent-kit`.

### 1.1 Transcribe Space

**Entrypoint**: `format-twitter-space`

**Price**: 0.2 USDC

**Input**:
```typescript
{
  spaceUrl: string  // https://x.com/i/spaces/1RDxlAoOeQRKL
}
```

**Output**:
```typescript
{
  success: boolean,
  spaceId: string,
  message: string,
  estimatedCompletionTime: number  // seconds
}
```

**Flow**:
1. User pays 0.2 USDC via x402
2. Payment verified and recorded
3. API returns immediately with `success: true`
4. Background worker starts processing:
   - Download audio
   - Transcribe with Whisper
   - Format with GPT-4o
   - Save to storage
5. User can check status via Dashboard

**Important**: This API does NOT wait for processing to complete. It returns immediately after payment verification.

---

### 1.2 Unlock Space Chat

**Entrypoint**: `unlock-space-chat`

**Price**: 0.5 USDC (one-time per Space)

**Input**:
```typescript
{
  spaceId: string  // 1RDxlAoOeQRKL
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
  spaceId: string,
  unlockedAt: string  // ISO timestamp
}
```

**Flow**:
1. User pays 0.5 USDC via x402
2. Payment verified
3. Record unlock permission for (wallet_address, space_id)
4. Return success

**Access Control**: Stored in `data/chat_unlocks/<wallet_address>/<space_id>.json`

---

### 1.3 Chat with Spaces

**Entrypoint**: `chat-with-spaces`

**Pricing** (dynamic based on number of Spaces):
- Base cost: 0.9 USDC
- Each Space: +0.1 USDC
- **Examples**:
  - 1 Space: 0.9 + 0.1 = 1.0 USDC
  - 2 Spaces: 0.9 + 0.2 = 1.1 USDC
  - 3 Spaces: 0.9 + 0.3 = 1.2 USDC

**Input**:
```typescript
{
  spaceIds: string[],     // ["1RDxlAoOeQRKL", "1vOGwAbcdEFGH"]
  question: string        // "What are the main topics discussed?"
}
```

**Output**:
```typescript
{
  answer: string,
  sources: {
    spaceId: string,
    excerpt: string
  }[],
  model: string,          // "gpt-4o"
  tokensUsed: number
}
```

**Flow**:
1. Verify user has unlocked all requested Spaces
2. If not: return error with list of locked Spaces
3. User pays (0.9 + 0.1 * spaceIds.length) USDC
4. Query OpenAI Agent SDK with all Space transcripts
5. Return answer with sources

**Access Control**: Must have paid for each Space via `unlock-space-chat` first

---

## 2. Free APIs (Standard HTTP)

These endpoints do NOT require payment and are used by the Dashboard.

### 2.1 List User's Spaces

**Endpoint**: `GET /api/spaces/mine`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,        // User's wallet address
  signature: string,     // Signature proving wallet ownership
  limit?: number,        // Default: 50
  offset?: number        // Default: 0
}
```

**Response**:
```typescript
{
  spaces: SpaceMetadata[],
  total: number,
  hasMore: boolean
}
```

**Logic**: Return all Spaces that this wallet has paid to transcribe

---

### 2.2 Get Space Details

**Endpoint**: `GET /api/spaces/:spaceId`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  metadata: SpaceMetadata,
  transcript: string,      // Markdown
  hasUnlockedChat: boolean,
  error?: string          // If user doesn't have access
}
```

**Access Control**: Only accessible if user has paid to transcribe this Space

---

### 2.3 Search Spaces

**Endpoint**: `GET /api/spaces/search?q=xxx`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  q: string,            // Search query (Space ID, URL, title, participant)
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  spaces: SpaceMetadata[]
}
```

**Logic**: Search only within Spaces the user has access to

---

### 2.4 Get Chat Unlock Status

**Endpoint**: `GET /api/spaces/:spaceId/chat-status`

**Authentication**: Wallet signature verification

**Query Parameters**:
```typescript
{
  wallet: string,
  signature: string
}
```

**Response**:
```typescript
{
  spaceId: string,
  hasAccess: boolean,      // Has paid for transcription
  hasUnlockedChat: boolean, // Has paid for chat unlock
  unlockedAt?: string      // ISO timestamp
}
```

---

### 2.5 Dashboard Home

**Endpoint**: `GET /`

**Response**: HTML page (static or server-rendered)

**Features**:
- Wallet connection UI
- List of user's Spaces
- Search bar
- Space detail view
- Chat interface (for unlocked Spaces)

---

## 3. Storage Structure

```
data/
  spaces/
    <space_id>/
      metadata.json          # Space info
      audio.m4a             # Downloaded audio
      transcript.md         # Formatted transcript
      transcript.json       # Structured data

  payments/
    transcriptions/
      <wallet_address>/
        <space_id>.json     # Payment record for transcription

    chat_unlocks/
      <wallet_address>/
        <space_id>.json     # Payment record for chat unlock

  chat_history/
    <wallet_address>/
      <session_id>.json     # Chat session history
```

---

## 4. Payment Records

### Transcription Payment Record

**File**: `data/payments/transcriptions/<wallet>/<space_id>.json`

```typescript
{
  spaceId: string,
  spaceUrl: string,
  walletAddress: string,
  paidAmount: string,        // "0.2"
  currency: "USDC",
  paidAt: string,            // ISO timestamp
  transactionHash: string,
  status: "pending" | "processing" | "completed" | "failed",
  completedAt?: string,
  error?: string
}
```

### Chat Unlock Record

**File**: `data/payments/chat_unlocks/<wallet>/<space_id>.json`

```typescript
{
  spaceId: string,
  walletAddress: string,
  paidAmount: string,        // "0.5"
  currency: "USDC",
  unlockedAt: string,
  transactionHash: string
}
```

### Chat Query Record

**File**: `data/chat_history/<wallet>/<session_id>.json`

```typescript
{
  sessionId: string,
  walletAddress: string,
  spaceIds: string[],
  question: string,
  answer: string,
  paidAmount: string,        // "1.0", "1.1", "1.2", etc.
  queriedAt: string,
  tokensUsed: number
}
```

---

## 5. Authentication & Authorization

### 5.1 Wallet Authentication

All authenticated requests require:
```typescript
{
  wallet: string,          // 0x...
  signature: string,       // EIP-191 signature
  message: string,         // "Authenticate with Twitter Space Agent at {timestamp}"
  timestamp: number
}
```

**Verification**:
1. Check timestamp is within 5 minutes
2. Verify signature matches wallet
3. Allow request

### 5.2 Access Control Rules

**For Transcripts**:
- User can access Space if: `data/payments/transcriptions/{wallet}/{space_id}.json` exists and status is "completed"

**For Chat**:
- User can chat with Space if:
  1. Has paid for transcription (see above)
  2. Has paid for chat unlock: `data/payments/chat_unlocks/{wallet}/{space_id}.json` exists

---

## 6. Background Workers

### 6.1 Transcription Worker

**Trigger**: New payment in `data/payments/transcriptions/`

**Process**:
1. Pick up pending jobs (status: "pending")
2. Update status to "processing"
3. Run `formatSpaceFromUrl()`:
   - Download audio
   - Transcribe with Whisper
   - Format with GPT-4o
4. Save to storage
5. Update status to "completed" or "failed"

**Queue**: Simple file-based queue (check every 10 seconds)

---

## 7. Dashboard UI Flow

### 7.1 Connect Wallet

1. User clicks "Connect Wallet"
2. MetaMask/WalletConnect popup
3. User signs authentication message
4. Store signature + wallet address

### 7.2 View My Spaces

1. Dashboard calls `GET /api/spaces/mine?wallet=0x...&signature=...`
2. Display list of Spaces with:
   - Title
   - Date processed
   - Duration
   - Participants
   - Chat status (locked/unlocked)

### 7.3 View Space Details

1. User clicks on a Space
2. Dashboard calls `GET /api/spaces/{id}?wallet=0x...&signature=...`
3. Display:
   - Full transcript with speaker profiles
   - Metadata
   - "Unlock Chat" button (if not unlocked)

### 7.4 Unlock Chat

1. User clicks "Unlock Chat" (0.5 USDC)
2. Call `unlock-space-chat` entrypoint (x402 payment)
3. Payment processed
4. Chat interface becomes available

### 7.5 Chat with Space

1. User selects 1-3 Spaces to chat with
2. Calculates price: 0.9 + (0.1 * num_spaces) USDC
3. User types question
4. Call `chat-with-spaces` entrypoint (x402 payment)
5. Display answer with sources

---

## 8. Technology Stack

### Backend
- **Runtime**: Bun
- **Framework**: `@lucid-dreams/agent-kit` for paid APIs
- **Standard HTTP**: For free APIs (can use `Hono` or native Bun server)
- **Storage**: File system
- **AI**: OpenAI (Whisper + GPT-4o)
- **Payment**: x402 protocol

### Frontend
- **Framework**: Vanilla JS or React (TBD)
- **Wallet**: ethers.js / viem
- **Styling**: Tailwind CSS

### Infrastructure
- **Deployment**: Vercel / Railway / Render
- **Storage**: Local disk or cloud storage (S3/R2)

---

## 9. API Summary Table

| Endpoint | Type | Price | Auth Required | Purpose |
|----------|------|-------|---------------|---------|
| `format-twitter-space` | Paid (agent-kit) | 0.2 USDC | No (payment is auth) | Transcribe Space |
| `unlock-space-chat` | Paid (agent-kit) | 0.5 USDC | No (payment is auth) | Unlock chat for Space |
| `chat-with-spaces` | Paid (agent-kit) | 0.9 + 0.1n USDC | No (payment is auth) | Query Spaces with AI |
| `GET /api/spaces/mine` | Free | Free | Yes (wallet signature) | List user's Spaces |
| `GET /api/spaces/:id` | Free | Free | Yes (wallet signature) | Get Space details |
| `GET /api/spaces/search` | Free | Free | Yes (wallet signature) | Search Spaces |
| `GET /api/spaces/:id/chat-status` | Free | Free | Yes (wallet signature) | Check chat unlock status |
| `GET /` | Free | Free | No | Dashboard home |

---

## 10. Key Design Decisions

### Why separate Paid and Free APIs?

1. **x402 Payment** - Only paid operations use x402 protocol
2. **Performance** - Dashboard queries don't need payment overhead
3. **UX** - Users authenticate once with wallet, then browse freely
4. **Cost** - No need to pay for every data query

### Why async transcription processing?

1. **Long processing time** - Transcription takes 3-5 minutes
2. **Payment first** - Users pay upfront, check status later
3. **Scalability** - Can queue multiple jobs

### Why file-based storage (MVP)?

1. **Simplicity** - No database setup needed
2. **Fast deployment** - Easy to get started
3. **Migration path** - Can move to DB later if needed

---

## 11. Future Enhancements

1. **Database Migration** - Move from files to PostgreSQL/MongoDB
2. **Search Optimization** - Full-text search with ElasticSearch
3. **Caching Layer** - Redis for frequently accessed Spaces
4. **Batch Processing** - Process multiple Spaces in parallel
5. **Analytics** - Track usage, popular Spaces, revenue
6. **API Rate Limiting** - Prevent abuse
7. **Space Sharing** - Users can share Spaces with others

---

## Next Steps

1. Implement payment tracking system
2. Build background worker for transcription
3. Create free API endpoints
4. Build Dashboard UI
5. Integrate OpenAI Agent SDK for chat
6. Deploy and test
