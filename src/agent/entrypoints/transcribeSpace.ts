/**
 * Transcription Entrypoint (Async)
 *
 * Accepts payment, queues the job, and returns immediately.
 * The actual processing is done by the background worker.
 */

import { z } from "zod";
import { recordTranscriptionPayment } from "../../services/paymentService";
import { getOrCreateSpace } from "../../db/queries/spaces";
import { queueJob } from "../../db/queries/queue";
import { extractSpaceId } from "../../utils/storageManager";

export const transcribeSpaceEntrypoint = {
  key: "transcribe-space",
  description:
    "Queue a Twitter Space for transcription with speaker identification. Returns immediately after queuing. You can check status via the dashboard. Price: 0.2 USDC.",

  price: "0.2",  // 0.2 USDC

  input: z.object({
    spaceUrl: z
      .string()
      .describe("The URL of the Twitter Space to transcribe (e.g., https://x.com/i/spaces/1RDxlAoOeQRKL)")
      .regex(/spaces\/[a-zA-Z0-9]+/, "Must be a valid Twitter Space URL"),
  }),

  output: z.object({
    success: z.boolean().describe("Whether the job was queued successfully"),
    spaceId: z.string().describe("Unique identifier for the Space"),
    message: z.string().describe("Status message"),
    estimatedTimeMinutes: z.number().describe("Estimated processing time in minutes"),
    queuePosition: z.number().optional().describe("Position in queue"),
  }),

  async handler(ctx: any) {
    const { spaceUrl } = ctx.input;
    const walletAddress = ctx.x402?.userWallet;

    if (!walletAddress) {
      throw new Error("Wallet address not found in x402 context");
    }

    console.log(`[transcribe-space] Queuing: ${spaceUrl} for wallet: ${walletAddress}`);

    try {
      // Extract space ID
      const spaceId = extractSpaceId(spaceUrl);

      // Create or get Space in database
      const space = await getOrCreateSpace(
        spaceId,
        spaceUrl,
        `Twitter Space ${spaceId}` // Temporary title, will be updated by worker
      );

      // Record payment
      const paymentResult = await recordTranscriptionPayment(
        walletAddress,
        spaceId,
        ctx.x402?.txHash
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Failed to record payment");
      }

      // Queue job for processing
      await queueJob(space.id, 0);

      console.log(`[transcribe-space] ✅ Queued job for Space ${spaceId}`);

      return {
        output: {
          success: true,
          spaceId,
          message: "Transcription job queued successfully. Processing will start shortly.",
          estimatedTimeMinutes: 4, // ~4 minutes for typical 30-min Space
        }
      };
    } catch (error) {
      console.error(`[transcribe-space] ❌ Error:`, error);
      throw new Error(`Failed to queue transcription: ${(error as Error).message}`);
    }
  },
};
