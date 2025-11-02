// Vercel Serverless Function Entry Point
// All code must be in api/ directory or bundled
import { z } from "zod";
import {
  AgentKitConfig,
  createAgentApp,
} from "@lucid-dreams/agent-kit";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// TEMPORARY: Inline a minimal version for testing
// TODO: Properly bundle src/ code

const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl:
      (process.env.FACILITATOR_URL ?? "https://facilitator.daydreams.systems") as `${string}://${string}`,
    payTo: (process.env.PAY_TO ?? "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429") as `0x${string}`,
    network: (process.env.NETWORK ?? "base-sepolia") as any,
    defaultPrice: process.env.DEFAULT_PRICE ?? "1000000",
  },
};

const { app, addEntrypoint } = createAgentApp(
  {
    name: "twitter-space-summarizer",
    version: "1.0.0",
    description: "AI-powered agent that downloads, transcribes, and summarizes Twitter Spaces",
  },
  {
    config: configOverrides,
  }
);

// Health check entrypoint
addEntrypoint({
  key: "health",
  description: "Health check endpoint",
  input: z.object({}),
  output: z.object({
    status: z.string(),
    message: z.string(),
  }),
  async handler() {
    return {
      output: {
        status: "ok",
        message: "Agent is running on Vercel"
      }
    };
  }
});

console.log("✅ Agent initialized");

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = `https://${req.headers.host}${req.url}`;
  const request = new Request(url, {
    method: req.method || 'GET',
    headers: req.headers as HeadersInit,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  try {
    const response = await app.fetch(request);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
