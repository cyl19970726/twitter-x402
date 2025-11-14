# Deployment Guide

Complete guide for deploying Twitter Space Platform to production.

## Architecture Overview

```
┌──────────────┐
│   Frontend   │ ── Vercel/Netlify
│  (Dashboard) │
└──────┬───────┘
       │
       ├─────────────┬────────────┐
       │             │            │
┌──────▼─────┐ ┌────▼────┐ ┌─────▼────┐
│ Free API   │ │ x402    │ │ Worker   │
│ (Hono)     │ │ Agent   │ │          │
│ Railway    │ │ Vercel  │ │ Railway  │
└──────┬─────┘ └────┬────┘ └─────┬────┘
       │            │            │
       └────────────┼────────────┘
                    │
              ┌─────▼─────┐
              │ Database  │
              │ Railway/  │
              │ Turso     │
              └───────────┘
```

## Prerequisites

- [Vercel Account](https://vercel.com)
- [Railway Account](https://railway.app)
- [OpenAI API Key](https://platform.openai.com)
- Wallet with USDC on Base network
- Twitter cookies (see COOKIE_EXPORT_GUIDE.md)

## Option 1: Vercel + Railway (Recommended)

### Step 1: Deploy Database (Railway)

1. Create new Railway project
2. Add PostgreSQL database OR use SQLite with persistent volume
3. Note connection string

**For PostgreSQL:**
```bash
# Update drizzle.config.ts
export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql', // Changed from sqlite
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}
```

**For SQLite with Railway:**
```bash
# Create volume in Railway
# Mount at /app/data
# Set DATABASE_URL=/app/data/spaces.db
```

### Step 2: Deploy x402 Agent (Vercel)

1. **Create Vercel project**
   ```bash
   vercel link
   ```

2. **Configure environment variables in Vercel dashboard:**
   ```bash
   PRIVATE_KEY=your_wallet_private_key
   TWITTER_COOKIES=[...]
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://... (from Railway)
   NETWORK=base
   PAY_TO=your_wallet_address
   ```

3. **Create `vercel.json`:**
   ```json
   {
     "buildCommand": "bun install && bun run db:migrate",
     "devCommand": "bun run dev",
     "installCommand": "bun install",
     "framework": null,
     "outputDirectory": "dist"
   }
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Verify agent manifest:**
   ```bash
   curl https://your-agent.vercel.app/.well-known/agent.json
   ```

### Step 3: Deploy Worker (Railway)

1. **Create new Railway service**
2. **Connect GitHub repo**
3. **Configure environment:**
   ```bash
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   TWITTER_COOKIES=[...]
   WORKER_POLL_INTERVAL_MS=10000
   ```

4. **Set start command:**
   ```bash
   bun run worker
   ```

5. **Deploy:**
   - Push to GitHub
   - Railway auto-deploys

### Step 4: Deploy Free API (Railway)

1. **Create another Railway service**
2. **Configure environment:**
   ```bash
   DATABASE_URL=postgresql://...
   API_PORT=8080
   CORS_ORIGIN=https://your-dashboard.vercel.app
   ```

3. **Set start command:**
   ```bash
   bun run src/api/server.ts
   ```

4. **Enable public networking**
5. **Note API URL:** `https://your-api.railway.app`

### Step 5: Deploy Dashboard (Vercel)

1. **Create new Vercel project for frontend**
2. **Configure environment:**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api.railway.app
   NEXT_PUBLIC_AGENT_URL=https://your-agent.vercel.app
   ```

3. **Create `vercel.json`:**
   ```json
   {
     "outputDirectory": "public",
     "routes": [
       { "src": "/css/(.*)", "dest": "/css/$1" },
       { "src": "/js/(.*)", "dest": "/js/$1" },
       { "src": "/space.html", "dest": "/space.html" },
       { "src": "/(.*)", "dest": "/index.html" }
     ]
   }
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

## Option 2: All-in-One Railway

Deploy all services on Railway with separate services:

### Service 1: Agent (x402)
```bash
# Start command
bun run src/index.ts

# Environment
PRIVATE_KEY=...
PORT=8787
# ... other vars
```

### Service 2: API Server
```bash
# Start command
bun run src/api/server.ts

# Environment
DATABASE_URL=${{Postgres.DATABASE_URL}}
API_PORT=8080
```

### Service 3: Worker
```bash
# Start command
bun run worker

# Environment
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Service 4: Frontend (Static)
```bash
# Use Nginx or serve static files
# Or use Vercel/Netlify for frontend
```

## Option 3: Fly.io

### Deploy Agent

1. **Create `fly.toml`:**
   ```toml
   app = "your-agent"

   [build]
     [build.args]
       BUN_VERSION = "1.2.4"

   [[services]]
     http_checks = []
     internal_port = 8787
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

   [env]
     PORT = "8787"
   ```

2. **Deploy:**
   ```bash
   fly launch
   fly secrets set PRIVATE_KEY=...
   fly secrets set OPENAI_API_KEY=...
   fly deploy
   ```

### Deploy Worker

Similar to agent but different app name and start command.

## Database Options

### Option A: Railway PostgreSQL (Recommended)

**Pros:**
- Managed backups
- Scalable
- Persistent

**Setup:**
1. Add PostgreSQL to Railway project
2. Update Drizzle config to use PostgreSQL
3. Run migrations

### Option B: Turso (SQLite Edge)

**Pros:**
- SQLite compatibility
- Edge replication
- Low latency

**Setup:**
```bash
# Install Turso CLI
brew install chiselstrike/tap/turso

# Create database
turso db create twitter-spaces

# Get connection URL
turso db show twitter-spaces --url

# Update DATABASE_URL
DATABASE_URL=libsql://your-db.turso.io?authToken=...
```

### Option C: Neon (Serverless Postgres)

**Pros:**
- Serverless (pay per use)
- Fast cold starts
- PostgreSQL compatible

**Setup:**
1. Create database at neon.tech
2. Copy connection string
3. Update DATABASE_URL

## Environment Variables

### Production Checklist

**Agent (x402):**
```bash
✓ PRIVATE_KEY - Wallet private key (REQUIRED)
✓ OPENAI_API_KEY - OpenAI API key (REQUIRED)
✓ TWITTER_COOKIES - Twitter auth cookies (REQUIRED)
✓ DATABASE_URL - Database connection string (REQUIRED)
✓ NETWORK - base or base-sepolia (REQUIRED)
✓ PAY_TO - Payment recipient address (REQUIRED)
✓ PORT - Agent port (default: 8787)
✓ API_BASE_URL - Agent public URL
✓ FACILITATOR_URL - x402 facilitator URL
```

**API Server:**
```bash
✓ DATABASE_URL - Database connection string (REQUIRED)
✓ API_PORT - Server port (default: 3001)
✓ CORS_ORIGIN - Frontend URL for CORS (REQUIRED)
```

**Worker:**
```bash
✓ DATABASE_URL - Database connection string (REQUIRED)
✓ OPENAI_API_KEY - OpenAI API key (REQUIRED)
✓ TWITTER_COOKIES - Twitter auth cookies (REQUIRED)
✓ WORKER_POLL_INTERVAL_MS - Polling interval (default: 10000)
✓ WORKER_MAX_RETRIES - Max retry attempts (default: 3)
```

**Frontend:**
```bash
✓ NEXT_PUBLIC_API_URL - API server URL (REQUIRED)
✓ NEXT_PUBLIC_AGENT_URL - Agent URL (REQUIRED)
```

## Post-Deployment

### 1. Verify Services

**Check Agent:**
```bash
curl https://your-agent.vercel.app/.well-known/agent.json
```

**Check API:**
```bash
curl https://your-api.railway.app/health
```

**Check Worker:**
```bash
# View logs in Railway dashboard
# Should see: "🚀 Worker started. Polling every 10000ms..."
```

### 2. Test Payment Flow

```bash
# Test transcription
curl -X POST https://your-agent.vercel.app/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/TEST_SPACE"}'
```

### 3. Monitor Logs

**Railway:**
- View logs in Railway dashboard
- Set up log forwarding to services like Datadog

**Vercel:**
- View logs in Vercel dashboard
- Enable Vercel Analytics

### 4. Setup Monitoring

**Recommended tools:**
- [BetterStack](https://betterstack.com) - Uptime monitoring
- [Sentry](https://sentry.io) - Error tracking
- [Datadog](https://datadoghq.com) - Logs and metrics

**Add to Railway:**
```bash
# Add Sentry DSN
SENTRY_DSN=your_sentry_dsn
```

## Scaling

### Database

**When to scale:**
- \>10,000 Spaces
- \>100 requests/second
- \>1GB database size

**Options:**
- Upgrade Railway Postgres plan
- Move to dedicated PostgreSQL (AWS RDS, DigitalOcean)
- Use read replicas for API queries

### Worker

**When to scale:**
- \>100 jobs in queue
- Processing time \>10 minutes per job

**Options:**
- Run multiple worker instances
- Implement job prioritization
- Use Redis for distributed queue

### API Server

**When to scale:**
- \>1000 requests/second
- High latency (\>500ms)

**Options:**
- Enable Railway auto-scaling
- Add CDN for static assets (Cloudflare)
- Implement caching (Redis)

## Security

### 1. Environment Variables

- **Never commit** `.env` file
- Use Railway/Vercel secret management
- Rotate keys regularly

### 2. Wallet Security

- Use **dedicated wallet** for agent
- Keep minimal USDC balance
- Monitor transactions

### 3. API Security

- Implement **rate limiting**
- Validate **all inputs**
- Use **HTTPS only**
- Enable **CORS** properly

### 4. Database Security

- Use **connection pooling**
- Enable **SSL/TLS**
- Restrict **network access**
- Regular **backups**

## Backup Strategy

### Database Backups

**Railway PostgreSQL:**
- Automatic daily backups
- Manual backups via Railway CLI

**SQLite:**
```bash
# Manual backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/database/spaces.db backups/spaces_$DATE.db
```

**Schedule backups:**
- Railway cron job (if supported)
- GitHub Actions workflow
- External service (e.g., Railway backup addon)

### File Storage Backups

**Audio/Transcript files:**
- Sync to S3/Cloudflare R2
- Use Railway volumes with snapshots
- Implement retention policy (30-90 days)

## Troubleshooting

### Agent Not Responding

1. Check logs in Vercel dashboard
2. Verify environment variables
3. Test agent manifest URL
4. Check x402 facilitator status

### Worker Not Processing Jobs

1. Check Railway logs
2. Verify DATABASE_URL connection
3. Check job queue in database
4. Verify OpenAI API key

### Database Connection Issues

1. Check connection string format
2. Verify network access (Railway IPs)
3. Test connection from local
4. Check connection pool limits

### CORS Errors

1. Verify CORS_ORIGIN in API server
2. Check preflight requests
3. Ensure HTTPS for production

## Cost Estimation

### Monthly Costs (1000 users, 100 Spaces/month)

| Service | Provider | Cost |
|---------|----------|------|
| Database | Railway PostgreSQL | $10 |
| Agent | Vercel Pro | $20 |
| API Server | Railway | $5 |
| Worker | Railway | $5 |
| Frontend | Vercel (free) | $0 |
| OpenAI API | OpenAI | ~$85* |
| **Total** | | **$125/mo** |

*Based on average Space (36 min, $0.84/transcription, 100 transcriptions)

### Cost Optimization

1. **Use Vercel Hobby** for agent (free tier)
2. **Turso SQLite** instead of PostgreSQL (cheaper)
3. **Cloudflare Workers** for API (free tier)
4. **Batch transcriptions** to reduce API calls
5. **Cache transcripts** to avoid reprocessing

## Rollback Strategy

### Quick Rollback

**Vercel:**
```bash
vercel rollback
```

**Railway:**
1. Go to deployments
2. Click "Rollback" on previous deployment

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backups/backup_20240115.sql
```

## Support

For deployment issues:
- Railway: [railway.app/help](https://railway.app/help)
- Vercel: [vercel.com/support](https://vercel.com/support)
- Fly.io: [fly.io/docs](https://fly.io/docs)

## Next Steps

After deployment:
1. ✅ Test all API endpoints
2. ✅ Verify payment flow
3. ✅ Monitor logs for 24 hours
4. ✅ Setup alerts and monitoring
5. ✅ Document custom configuration
6. ✅ Share agent URL with users
