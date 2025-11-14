/**
 * Twitter Space Agent v2.0
 *
 * Paid API entrypoints using agent-kit + x402:
 * 1. transcribe-space: Queue async transcription (0.2 USDC)
 * 2. unlock-space-chat: Unlock chat for a Space (0.5 USDC)
 * 3. chat-with-spaces: Query Spaces with AI (0.9 + 0.1n USDC)
 *
 * Free APIs (dashboard data queries) are handled by Hono server
 */

import {
  AgentKitConfig,
  createAgentApp,
} from "@lucid-dreams/agent-kit";

import { transcribeSpaceEntrypoint } from "./entrypoints/transcribeSpace";
import { unlockChatEntrypoint } from "./entrypoints/unlockChat";
import { chatWithSpacesEntrypoint } from "./entrypoints/chatWithSpaces";

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
console.log(`\n💚 Free endpoints:`);
console.log(`   GET /health - Health check`);
console.log(`   GET /.well-known/agent.json - Agent manifest`);
console.log(`   GET /entrypoints - List all entrypoints`);
console.log(`   (Dashboard APIs available via HTTP server on separate port)`);

// Add entrypoints
addEntrypoint(transcribeSpaceEntrypoint);
addEntrypoint(unlockChatEntrypoint);
addEntrypoint(chatWithSpacesEntrypoint);

export { app };
