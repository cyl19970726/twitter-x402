/**
 * Chat with Spaces Entrypoint
 *
 * Ask questions about one or more Twitter Spaces.
 * Dynamic pricing: 0.9 USDC + 0.1 USDC per additional Space.
 */

import { z } from "zod";
import { recordChatQuery, calculateChatPrice } from "../../services/paymentService";
import { chatWithSpaces as chatWithSpacesService, validateQuestion } from "../../services/chatService";

export const chatWithSpacesEntrypoint = {
  key: "chat-with-spaces",
  description:
    "Ask questions about one or more Twitter Spaces using AI. Requires chat unlock for all queried Spaces. Pricing: 0.9 USDC base + 0.1 USDC per additional Space (max 10 spaces).",

  // Base price for single Space, dynamic pricing calculated in handler
  price: "0.9",

  input: z.object({
    spaceIds: z
      .array(z.string())
      .min(1, "At least one Space ID is required")
      .max(10, "Maximum 10 Spaces per query")
      .describe("Array of Space IDs to query (e.g., ['1RDxlAoOeQRKL', '1vOxwAbcdEFGH'])"),
    question: z
      .string()
      .min(10, "Question must be at least 10 characters")
      .max(500, "Question must be less than 500 characters")
      .describe("Your question about the Space(s)"),
  }),

  output: z.object({
    answer: z.string().describe("AI-generated answer based on the Space content"),
    sources: z.array(z.object({
      spaceId: z.string().describe("Source Space ID"),
      title: z.string().optional().describe("Space title"),
      excerpt: z.string().optional().describe("Relevant excerpt from the Space"),
      timestamp: z.string().optional().describe("Approximate timestamp in the Space"),
    })).describe("Sources used to generate the answer"),
    spaceCount: z.number().describe("Number of Spaces queried"),
    model: z.string().describe("AI model used"),
  }),

  async handler(ctx: any) {
    const { spaceIds, question } = ctx.input;
    const walletAddress = ctx.x402?.userWallet;

    if (!walletAddress) {
      throw new Error("Wallet address not found in x402 context");
    }

    // Validate question
    const validation = validateQuestion(question);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid question");
    }

    console.log(`[chat-with-spaces] Query: "${question}" for ${spaceIds.length} Space(s), wallet: ${walletAddress}`);

    try {
      // Call chat service
      const chatResult = await chatWithSpacesService(spaceIds, question);

      // Record chat query
      const recordResult = await recordChatQuery(
        walletAddress,
        spaceIds,
        question,
        chatResult.answer,
        ctx.x402?.txHash
      );

      if (!recordResult.success) {
        throw new Error(recordResult.error || "Failed to record chat query");
      }

      console.log(`[chat-with-spaces] ✅ Completed query for ${spaceIds.length} Space(s)`);

      return {
        output: {
          answer: chatResult.answer,
          sources: chatResult.sources,
          spaceCount: spaceIds.length,
          model: chatResult.model,
        },
        usage: {
          total_tokens: chatResult.tokensUsed || 0,
        }
      };
    } catch (error) {
      console.error(`[chat-with-spaces] ❌ Error:`, error);
      throw new Error(`Failed to process chat query: ${(error as Error).message}`);
    }
  },
};
