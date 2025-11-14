/**
 * Unlock Chat Entrypoint
 *
 * Unlocks AI chat functionality for a specific Space.
 * Requires: User must have purchased transcription first.
 */

import { z } from "zod";
import { recordChatUnlock } from "../../services/paymentService";

export const unlockChatEntrypoint = {
  key: "unlock-space-chat",
  description:
    "Unlock AI chat functionality for a specific Twitter Space. Allows you to ask questions about the Space content. Requires prior transcription purchase. Price: 0.5 USDC.",

  price: "0.5",  // 0.5 USDC

  input: z.object({
    spaceId: z
      .string()
      .describe("The Space ID to unlock chat for (e.g., 1RDxlAoOeQRKL)")
  }),

  output: z.object({
    success: z.boolean().describe("Whether chat was unlocked successfully"),
    spaceId: z.string().describe("The unlocked Space ID"),
    message: z.string().describe("Status message"),
    unlockedAt: z.string().describe("Timestamp when chat was unlocked"),
  }),

  async handler(ctx: any) {
    const { spaceId } = ctx.input;
    const walletAddress = ctx.x402?.userWallet;

    if (!walletAddress) {
      throw new Error("Wallet address not found in x402 context");
    }

    console.log(`[unlock-space-chat] Unlocking chat for Space: ${spaceId}, wallet: ${walletAddress}`);

    try {
      // Record unlock payment
      const result = await recordChatUnlock(
        walletAddress,
        spaceId,
        ctx.x402?.txHash
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to unlock chat");
      }

      const unlockedAt = new Date().toISOString();

      console.log(`[unlock-space-chat] ✅ Unlocked chat for Space ${spaceId}`);

      return {
        output: {
          success: true,
          spaceId,
          message: "Chat unlocked successfully. You can now ask questions about this Space.",
          unlockedAt,
        }
      };
    } catch (error) {
      console.error(`[unlock-space-chat] ❌ Error:`, error);
      throw new Error(`Failed to unlock chat: ${(error as Error).message}`);
    }
  },
};
