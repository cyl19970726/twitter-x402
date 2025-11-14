# API Documentation

Complete API reference for Twitter Space Platform.

## Overview

The platform provides two API layers:

1. **Paid x402 APIs** - Monetized endpoints via agent-kit (transcription, chat unlock, chat queries)
2. **Free HTTP APIs** - Read-only endpoints for dashboard (user data, space listing)

## Authentication

### Paid APIs (x402)

Uses x402 payment protocol with on-chain verification:
- Payment sent via USDC on Base network
- Transaction hash verified on-chain
- User wallet extracted from transaction

### Free APIs

Uses wallet signature verification:
- All requests require query parameters: `wallet`, `signature`, `timestamp`
- Signature is EIP-191 personal_sign of message: `Sign in to Twitter Space Dashboard\nTimestamp: {timestamp}`
- Timestamp must be within 5 minutes of current time

## Paid x402 APIs

Base URL: `http://localhost:8787` (development) or your deployed agent URL

### 1. Transcribe Space

Queue a Twitter Space for transcription.

**Endpoint:** `POST /invoke/transcribe-space`

**Price:** 0.2 USDC

**Request Body:**
```json
{
  "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
  "title": "Optional Space Title"
}
```

**Response:**
```json
{
  "success": true,
  "spaceId": "1RDxlAoOeQRKL",
  "status": "pending",
  "estimatedTimeMinutes": 4,
  "message": "Space queued for transcription. Check back in ~4 minutes."
}
```

**Processing:**
1. Payment verified on-chain
2. Space record created in database (status: pending)
3. Job queued for background worker
4. Returns immediately with estimated completion time
5. Worker processes asynchronously: Download → Transcribe → Format → Save
6. Space status changes to 'completed' when done

**Notes:**
- Same Space can be purchased multiple times by different users
- Transcription count incremented for analytics
- If Space already exists and completed, new job still queued (idempotent)

### 2. Unlock Space Chat

Unlock AI chat functionality for a specific Space.

**Endpoint:** `POST /invoke/unlock-space-chat`

**Price:** 0.5 USDC

**Request Body:**
```json
{
  "spaceId": "1RDxlAoOeQRKL"
}
```

**Response:**
```json
{
  "success": true,
  "spaceId": "1RDxlAoOeQRKL",
  "unlockId": 123,
  "expiresAt": null,
  "message": "Chat unlocked successfully. You can now ask questions about this Space."
}
```

**Requirements:**
- Space must exist in database
- Space status must be 'completed'

**Notes:**
- Unlock is permanent (no expiration)
- Same user can unlock multiple times (idempotent)
- Chat unlock count incremented for analytics

### 3. Chat with Spaces

Ask questions about one or more Spaces using GPT-4o.

**Endpoint:** `POST /invoke/chat-with-spaces`

**Price:**
- Base: 0.9 USDC (for 1 Space)
- Additional: +0.1 USDC per additional Space (max 10 Spaces)
- Formula: `0.9 + (n - 1) * 0.1` USDC

**Request Body:**
```json
{
  "spaceIds": ["1RDxlAoOeQRKL", "1vOxwAbcdEFGH"],
  "question": "What were the main topics discussed in these Spaces?"
}
```

**Validation:**
- `spaceIds`: Array of 1-10 Space IDs
- `question`: String between 10-500 characters

**Response:**
```json
{
  "answer": "Based on the Space transcripts, the main topics discussed were...",
  "sources": [
    {
      "spaceId": "1RDxlAoOeQRKL",
      "title": "AI and Web3 Discussion",
      "excerpt": "Relevant excerpt from transcript...",
      "timestamp": "00:15:30"
    },
    {
      "spaceId": "1vOxwAbcdEFGH",
      "title": "Building on Base",
      "excerpt": "Another relevant excerpt..."
    }
  ],
  "spaceCount": 2,
  "model": "gpt-4o",
  "tokensUsed": 1234
}
```

**Requirements:**
- All Spaces must have chat unlocked by requesting wallet
- All Spaces must have status 'completed'

**Processing:**
1. Validates question format
2. Loads transcripts for all Spaces (up to 15,000 chars each)
3. Builds system prompt with all transcript context
4. Queries GPT-4o with user question
5. Extracts sources from response
6. Records chat session in database

**Model Configuration:**
- Model: gpt-4o
- Temperature: 0.7
- Max tokens: 1500
- Context includes: Space titles, transcripts, participant info

## Free HTTP APIs

Base URL: `http://localhost:3001` (development)

### Authentication

All endpoints require query parameters:
- `wallet` - User's wallet address (0x...)
- `signature` - EIP-191 signature of message
- `timestamp` - Unix timestamp (seconds)
- `message` - Signed message (for verification)

**Example:**
```
GET /api/spaces/mine?wallet=0x123...&signature=0xabc...&timestamp=1234567890
```

**Signature Generation (JavaScript):**
```javascript
const timestamp = Math.floor(Date.now() / 1000);
const message = `Sign in to Twitter Space Dashboard\nTimestamp: ${timestamp}`;
const signature = await ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress],
});
```

---

## User Endpoints

### Get User Stats

Get user's statistics and activity summary.

**Endpoint:** `GET /api/user/stats`

**Response:**
```json
{
  "stats": {
    "spacesOwned": 5,
    "transcriptionsPurchased": 5,
    "chatsUnlocked": 3,
    "chatQueriesMade": 12,
    "totalSpentUSDC": 3.8
  }
}
```

### Get Payment History

Get user's complete payment history.

**Endpoint:** `GET /api/user/payments`

**Response:**
```json
{
  "payments": {
    "transcriptions": [
      {
        "spaceId": "1RDxlAoOeQRKL",
        "spaceTitle": "AI Discussion",
        "amount": "0.2",
        "paidAt": "2024-01-15T10:30:00Z",
        "txHash": "0xabc..."
      }
    ],
    "chatUnlocks": [
      {
        "spaceId": "1RDxlAoOeQRKL",
        "spaceTitle": "AI Discussion",
        "amount": "0.5",
        "paidAt": "2024-01-15T11:00:00Z",
        "txHash": "0xdef..."
      }
    ],
    "chatSessions": [
      {
        "question": "What were the key topics?",
        "answer": "The main topics were...",
        "spaceCount": 2,
        "amount": "1.0",
        "paidAt": "2024-01-15T11:30:00Z",
        "txHash": "0xghi..."
      }
    ]
  },
  "summary": {
    "totalPaid": "3.8",
    "transactionCount": 10
  }
}
```

---

## Space Endpoints

### Get My Spaces

Get all Spaces owned by the user.

**Endpoint:** `GET /api/spaces/mine`

**Query Parameters:**
- `limit` (optional) - Results per page (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "spaces": [
    {
      "spaceId": "1RDxlAoOeQRKL",
      "title": "AI and Web3 Discussion",
      "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
      "status": "completed",
      "audioDuration": 2160.5,
      "transcriptLength": 45000,
      "participants": ["Host", "Alice", "Bob"],
      "completedAt": "2024-01-15T10:45:00Z",
      "transcriptionCount": 3,
      "chatUnlockCount": 2
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Search Spaces

Search user's Spaces by title, ID, or participant name.

**Endpoint:** `GET /api/spaces/search`

**Query Parameters:**
- `q` - Search query (required)
- `limit` (optional) - Results per page (default: 20, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "results": [
    {
      "spaceId": "1RDxlAoOeQRKL",
      "title": "AI and Web3 Discussion",
      "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
      "status": "completed",
      "audioDuration": 2160.5,
      "participants": ["Host", "Alice", "Bob"],
      "relevance": 0.95
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get Space Details

Get detailed information about a specific Space.

**Endpoint:** `GET /api/spaces/:spaceId`

**Response:**
```json
{
  "space": {
    "spaceId": "1RDxlAoOeQRKL",
    "title": "AI and Web3 Discussion",
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "status": "completed",
    "audioDuration": 2160.5,
    "transcriptLength": 45000,
    "participants": ["Host", "Alice", "Bob"],
    "completedAt": "2024-01-15T10:45:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "transcriptionCount": 3,
    "chatUnlockCount": 2
  }
}
```

**Status Values:**
- `pending` - Queued for processing
- `processing` - Currently being transcribed
- `completed` - Transcription complete
- `failed` - Processing failed

### Get Space Transcript

Get the formatted transcript for a Space.

**Endpoint:** `GET /api/spaces/:spaceId/transcript`

**Response:**
```json
{
  "transcript": "# Twitter Space Transcript\n\n## AI and Web3 Discussion\n\n[Host]: Welcome everyone...\n[Alice]: Thanks for having me...",
  "format": "markdown",
  "characterCount": 45000
}
```

**Requirements:**
- Space status must be 'completed'
- User must have purchased transcription

**Errors:**
- 404 if Space not found
- 403 if user hasn't purchased transcription
- 400 if Space not completed

### Get Chat Status

Check if chat is unlocked for a Space.

**Endpoint:** `GET /api/spaces/:spaceId/chat-status`

**Response:**
```json
{
  "spaceId": "1RDxlAoOeQRKL",
  "chatUnlocked": true,
  "unlockedAt": "2024-01-15T11:00:00Z"
}
```

or

```json
{
  "spaceId": "1RDxlAoOeQRKL",
  "chatUnlocked": false
}
```

### Get Popular Spaces

Get most popular Spaces based on transcription and chat counts.

**Endpoint:** `GET /api/spaces/popular`

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10, max: 50)

**Response:**
```json
{
  "spaces": [
    {
      "spaceId": "1RDxlAoOeQRKL",
      "title": "AI and Web3 Discussion",
      "participants": ["Host", "Alice", "Bob"],
      "transcriptionCount": 15,
      "chatUnlockCount": 8,
      "popularityScore": 23
    }
  ]
}
```

**Popularity Formula:**
```
score = transcriptionCount + (chatUnlockCount * 2)
```

---

## Error Responses

All APIs use consistent error format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid auth)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `500` - Internal Server Error

### Common Errors

**401 Unauthorized:**
```json
{
  "error": "Invalid or expired timestamp",
  "code": "AUTH_EXPIRED"
}
```

**403 Forbidden:**
```json
{
  "error": "You have not purchased transcription for this Space",
  "code": "ACCESS_DENIED"
}
```

**404 Not Found:**
```json
{
  "error": "Space not found",
  "code": "SPACE_NOT_FOUND"
}
```

**400 Bad Request:**
```json
{
  "error": "Question must be at least 10 characters",
  "code": "VALIDATION_ERROR"
}
```

---

## Rate Limits

### Paid APIs
- No explicit rate limits (limited by payment)
- OpenAI API rate limits apply

### Free APIs
- 100 requests per minute per wallet
- 1000 requests per hour per wallet

---

## SDKs and Examples

### JavaScript/TypeScript

```typescript
import { x402Fetch } from 'x402-fetch';

// Transcribe Space
const result = await x402Fetch('https://your-agent.com/invoke/transcribe-space', {
  method: 'POST',
  body: JSON.stringify({
    spaceUrl: 'https://twitter.com/i/spaces/1RDxlAoOeQRKL',
    title: 'My Space'
  })
});

// Chat with Space
const chatResult = await x402Fetch('https://your-agent.com/invoke/chat-with-spaces', {
  method: 'POST',
  body: JSON.stringify({
    spaceIds: ['1RDxlAoOeQRKL'],
    question: 'What were the main topics?'
  })
});
```

### cURL

```bash
# Transcribe Space (with x402 payment)
curl -X POST https://your-agent.com/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "title": "My Space"
  }'

# Get My Spaces (free API with auth)
curl "http://localhost:3001/api/spaces/mine?wallet=0x123...&signature=0xabc...&timestamp=1234567890"
```

---

## Webhooks (Future)

Webhook support planned for:
- `space.transcription.completed` - Transcription finished
- `space.transcription.failed` - Transcription failed
- `space.chat.unlocked` - Chat unlocked

---

## Best Practices

1. **Cache responses** - Transcripts don't change, cache them client-side
2. **Poll for status** - Check Space status periodically until completed
3. **Batch chat queries** - Ask about multiple Spaces in one request to save costs
4. **Handle retries** - Implement exponential backoff for failed requests
5. **Validate inputs** - Check question length before calling chat API
6. **Store signatures** - Reuse signatures within 5-minute window

---

## Support

For API issues or questions:
- GitHub Issues: [github.com/yourorg/dreams/issues](https://github.com/yourorg/dreams/issues)
- Documentation: [docs.yourplatform.com](https://docs.yourplatform.com)
