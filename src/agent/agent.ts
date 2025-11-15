/**
 * Twitter Space Agent v2.0 - Unified Service
 *
 * Single Hono app providing:
 * 1. x402 Paid APIs (agent-kit entrypoints)
 * 2. Free HTTP APIs (dashboard data queries)
 * 3. Static file serving (dashboard frontend)
 *
 * No separate API server needed - everything runs on port 8787
 */

import {
  AgentKitConfig,
  createAgentApp,
} from "@lucid-dreams/agent-kit";
import { serveStatic } from "hono/bun";
import type { Context } from "hono";

import { transcribeSpaceEntrypoint } from "./entrypoints/transcribeSpace";
import { unlockChatEntrypoint } from "./entrypoints/unlockChat";
import { chatWithSpacesEntrypoint } from "./entrypoints/chatWithSpaces";

// Import API route handlers
import { authMiddleware } from "../api/middleware/auth";
import {
  getUserSpaces,
  searchUserSpaces,
  getPopularSpaces,
  getSpaceBySpaceId,
} from "../db/queries/spaces";
import {
  checkUserHasAccess,
  checkChatUnlocked,
  getUserPayments,
} from "../db/queries/payments";
import { getSpaceTranscript } from "../utils/storageManager";

// Payment configuration
const NETWORK = process.env.NETWORK ?? "base-sepolia";

const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl:
      (process.env.FACILITATOR_URL ?? "https://facilitator.daydreams.systems") as `${string}://${string}`,
    payTo: (process.env.PAY_TO ?? "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429") as `0x${string}`,
    network: NETWORK as any,
    defaultPrice: process.env.DEFAULT_PRICE ?? "200000", // 0.2 USDC (default)
  },
};

// Create Agent App
const { app, addEntrypoint, config } = createAgentApp(
  {
    name: "twitter-space-agent",
    version: "2.0.0",
    description:
      "AI-powered Twitter Space transcription and chat platform. Queue transcription jobs, unlock chat, and query Spaces with AI. Supports x402 payments.",
  },
  {
    config: configOverrides,
    landingPage: false,  // Disable agent-kit default landing page
  }
);

console.log(`💰 Payment configuration:`);
console.log(`   Network: ${config.payments?.network}`);
console.log(`   Pay to: ${config.payments?.payTo}`);
console.log(`   Facilitator: ${config.payments?.facilitatorUrl}`);
console.log(`\n💵 Paid Entrypoints:`);
console.log(`   transcribe-space: 0.2 USDC`);
console.log(`   unlock-space-chat: 0.5 USDC`);
console.log(`   chat-with-spaces: 0.9 + 0.1n USDC (n = num spaces - 1)`);

// Add paid entrypoints
addEntrypoint(transcribeSpaceEntrypoint);
addEntrypoint(unlockChatEntrypoint);
addEntrypoint(chatWithSpacesEntrypoint);

// =========================================================
// Add Free API Routes (Dashboard)
// =========================================================
console.log("\n🔧 Mounting free API routes...");

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "twitter-space-unified-app",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/spaces/mine - List user's Spaces
app.get("/api/spaces/mine", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  try {
    const spaces = await getUserSpaces(userId, limit, offset);
    return c.json({
      spaces: spaces.map((space) => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        audioDuration: space.audioDurationSeconds,
        transcriptLength: space.transcriptLength,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
      pagination: { limit, offset, hasMore: spaces.length === limit },
    });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch spaces", message: (error as Error).message },
      500
    );
  }
});

// GET /api/spaces/search - Search user's Spaces
app.get("/api/spaces/search", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const query = c.req.query("q");

  if (!query) {
    return c.json({ error: "Missing search query parameter: q" }, 400);
  }

  try {
    const spaces = await searchUserSpaces(userId, query);
    return c.json({
      query,
      results: spaces.map((space) => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
      count: spaces.length,
    });
  } catch (error) {
    return c.json(
      { error: "Search failed", message: (error as Error).message },
      500
    );
  }
});

// GET /api/spaces/popular - Get popular Spaces (public, no auth)
app.get("/api/spaces/popular", async (c) => {
  const limit = parseInt(c.req.query("limit") || "10", 10);

  try {
    const spaces = await getPopularSpaces(limit);
    return c.json({
      spaces: spaces.map((space) => ({
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        transcriptionCount: space.transcriptionCount,
        chatUnlockCount: space.chatUnlockCount,
        participants: space.participants ? JSON.parse(space.participants) : [],
      })),
    });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch popular spaces", message: (error as Error).message },
      500
    );
  }
});

// GET /api/spaces/:spaceId - Get Space details
app.get("/api/spaces/:spaceId", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const spaceId = c.req.param("spaceId");

  try {
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return c.json({ error: "Space not found" }, 404);
    }

    const hasAccess = await checkUserHasAccess(userId, space.id);
    if (!hasAccess) {
      return c.json(
        {
          error: "Access denied",
          message: "You must purchase transcription to access this Space",
        },
        403
      );
    }

    const chatUnlocked = await checkChatUnlocked(userId, space.id);

    return c.json({
      space: {
        id: space.id,
        spaceId: space.spaceId,
        spaceUrl: space.spaceUrl,
        title: space.title,
        status: space.status,
        completedAt: space.completedAt,
        audioDuration: space.audioDurationSeconds,
        transcriptLength: space.transcriptLength,
        participants: space.participants ? JSON.parse(space.participants) : [],
        speakerProfiles: space.speakerProfiles
          ? JSON.parse(space.speakerProfiles)
          : [],
        chatUnlocked,
      },
    });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch space", message: (error as Error).message },
      500
    );
  }
});

// GET /api/spaces/:spaceId/transcript - Get Space transcript
app.get("/api/spaces/:spaceId/transcript", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const spaceId = c.req.param("spaceId");

  try {
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return c.json({ error: "Space not found" }, 404);
    }

    const hasAccess = await checkUserHasAccess(userId, space.id);
    if (!hasAccess) {
      return c.json(
        {
          error: "Access denied",
          message: "You must purchase transcription to access this Space",
        },
        403
      );
    }

    const transcript = getSpaceTranscript(spaceId);
    if (!transcript) {
      return c.json({ error: "Transcript not found" }, 404);
    }

    return c.json({ spaceId, transcript, format: "markdown" });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch transcript", message: (error as Error).message },
      500
    );
  }
});

// GET /api/spaces/:spaceId/chat-status - Check chat unlock status
app.get("/api/spaces/:spaceId/chat-status", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const spaceId = c.req.param("spaceId");

  try {
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      return c.json({ error: "Space not found" }, 404);
    }

    const hasAccess = await checkUserHasAccess(userId, space.id);
    const chatUnlocked = await checkChatUnlocked(userId, space.id);

    return c.json({
      spaceId,
      hasAccess,
      chatUnlocked,
      requiresUnlock: hasAccess && !chatUnlocked,
    });
  } catch (error) {
    return c.json(
      { error: "Failed to check chat status", message: (error as Error).message },
      500
    );
  }
});

// GET /api/user/stats - Get user statistics
app.get("/api/user/stats", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;
  const walletAddress = c.get("walletAddress") as string;

  try {
    const spaces = await getUserSpaces(userId, 1000, 0);
    const payments = await getUserPayments(userId);

    const totalSpent =
      payments.transcriptions.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0) +
      payments.unlocks.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0) +
      payments.sessions.reduce((sum, p) => sum + parseFloat(p.amountUsdc), 0);

    return c.json({
      wallet: walletAddress,
      stats: {
        spacesOwned: spaces.length,
        transcriptionsPurchased: payments.transcriptions.length,
        chatsUnlocked: payments.unlocks.length,
        chatQueries: payments.sessions.length,
        totalSpentUSDC: parseFloat(totalSpent.toFixed(2)),
      },
    });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch user stats", message: (error as Error).message },
      500
    );
  }
});

// GET /api/user/payments - Get payment history
app.get("/api/user/payments", authMiddleware, async (c: Context) => {
  const userId = c.get("userId") as number;

  try {
    const payments = await getUserPayments(userId);

    return c.json({
      transcriptions: payments.transcriptions.map((p) => ({
        id: p.id,
        spaceId: (p.space as any)?.spaceId,
        spaceTitle: (p.space as any)?.title,
        amount: p.amountUsdc,
        transactionHash: p.transactionHash,
        paidAt: (p as any).paidAt || p.verifiedAt,
        verified: p.paymentVerified,
      })),
      unlocks: payments.unlocks.map((p) => ({
        id: p.id,
        spaceId: (p.space as any)?.spaceId,
        spaceTitle: (p.space as any)?.title,
        amount: p.amountUsdc,
        transactionHash: p.transactionHash,
        paidAt: (p as any).paidAt || p.unlockedAt,
        verified: p.paymentVerified,
      })),
      sessions: payments.sessions.map((p) => ({
        id: p.id,
        sessionId: p.sessionId,
        spaceIds: p.spaceIds.split(","),
        question: p.question,
        amount: p.amountUsdc,
        numSpaces: p.numSpaces,
        queriedAt: p.queriedAt,
      })),
    });
  } catch (error) {
    return c.json(
      { error: "Failed to fetch payment history", message: (error as Error).message },
      500
    );
  }
});

// =========================================================
// Static File Serving (Dashboard Frontend)
// =========================================================
console.log("\n🎨 Mounting static file routes...");

// Serve static assets
app.get("/css/*", serveStatic({ root: "./public" }));
app.get("/js/*", serveStatic({ root: "./public" }));

// Dashboard routes (use /dashboard instead of / to avoid agent-kit conflict)
app.get("/dashboard", serveStatic({ path: "./public/index.html" }));
app.get("/dashboard/", serveStatic({ path: "./public/index.html" }));
app.get("/dashboard/unified", serveStatic({ path: "./public/dashboard-unified.html" }));
app.get("/dashboard/space.html", serveStatic({ path: "./public/space.html" }));
app.get("/dashboard/test-api.html", serveStatic({ path: "./public/test-api.html" }));
app.get("/dashboard/test-payment.html", serveStatic({ path: "./public/test-payment.html" }));

console.log("\n✅ Unified service configured:");
console.log("   📡 x402 Paid APIs: /entrypoints/*");
console.log("   🆓 Free APIs: /api/*");
console.log("   🎨 Dashboard: /dashboard (static files)");
console.log("\n💚 Free endpoints:");
console.log("   GET /health - Agent-kit health");
console.log("   GET /.well-known/agent.json - Agent manifest");
console.log("   GET /entrypoints - List all entrypoints");
console.log("   GET /api/health - API health");
console.log("   GET /api/spaces/mine");
console.log("   GET /api/spaces/search");
console.log("   GET /api/spaces/popular");
console.log("   GET /api/spaces/:spaceId");
console.log("   GET /api/spaces/:spaceId/transcript");
console.log("   GET /api/spaces/:spaceId/chat-status");
console.log("   GET /api/user/stats");
console.log("   GET /api/user/payments");

export { app };
