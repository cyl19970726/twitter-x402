/**
 * Chat Service
 *
 * AI-powered chat functionality for querying Twitter Spaces.
 * Uses OpenAI GPT-4 to answer questions based on Space transcripts.
 */

import OpenAI from 'openai';
import { getSpaceBySpaceId } from '../db/queries/spaces';
import { getSpaceTranscript } from '../utils/storageManager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatSource {
  spaceId: string;
  title: string;
  excerpt?: string;
  timestamp?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  model: string;
  tokensUsed?: number;
}

/**
 * Chat with one or more Twitter Spaces
 */
export async function chatWithSpaces(
  spaceIds: string[],
  question: string
): Promise<ChatResponse> {
  console.log(`[ChatService] Processing question for ${spaceIds.length} Space(s)`);

  // Load transcripts for all spaces
  const contexts: Array<{ spaceId: string; title: string; content: string }> = [];

  for (const spaceId of spaceIds) {
    const space = await getSpaceBySpaceId(spaceId);
    if (!space) {
      console.warn(`[ChatService] Space ${spaceId} not found, skipping`);
      continue;
    }

    const transcript = getSpaceTranscript(spaceId);
    if (!transcript) {
      console.warn(`[ChatService] Transcript for ${spaceId} not found, skipping`);
      continue;
    }

    contexts.push({
      spaceId,
      title: space.title,
      content: transcript,
    });
  }

  if (contexts.length === 0) {
    throw new Error('No valid transcripts found for the provided Space IDs');
  }

  // Build context for GPT
  const systemPrompt = buildSystemPrompt(contexts);
  const userPrompt = question;

  console.log(`[ChatService] Querying GPT-4 with ${contexts.length} Space context(s)`);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const answer = completion.choices[0]?.message?.content || 'No response generated';
    const tokensUsed = completion.usage?.total_tokens;

    // Extract sources (simplified - in production, use more sophisticated source extraction)
    const sources: ChatSource[] = contexts.map(ctx => ({
      spaceId: ctx.spaceId,
      title: ctx.title,
    }));

    console.log(`[ChatService] ✅ Generated response (${tokensUsed} tokens)`);

    return {
      answer,
      sources,
      model: 'gpt-4o',
      tokensUsed,
    };
  } catch (error) {
    console.error('[ChatService] ❌ Error:', error);
    throw new Error(`Failed to generate chat response: ${(error as Error).message}`);
  }
}

/**
 * Build system prompt with Space context
 */
function buildSystemPrompt(
  contexts: Array<{ spaceId: string; title: string; content: string }>
): string {
  let prompt = `You are a helpful AI assistant that answers questions about Twitter Space conversations. You have access to the following Space transcript(s):\n\n`;

  contexts.forEach((ctx, index) => {
    prompt += `=== SPACE ${index + 1}: ${ctx.title} (ID: ${ctx.spaceId}) ===\n`;
    prompt += `${ctx.content.substring(0, 15000)}\n\n`; // Limit context length
  });

  prompt += `\nInstructions:
1. Answer the user's question based ONLY on the information in the transcript(s) above.
2. If the answer cannot be found in the transcripts, say so clearly.
3. Be concise but comprehensive.
4. If multiple Spaces are provided, synthesize information from all of them.
5. When referencing information, mention which Space it came from if helpful.
6. Use a friendly, conversational tone.`;

  return prompt;
}

/**
 * Validate question
 */
export function validateQuestion(question: string): { valid: boolean; error?: string } {
  if (!question || question.trim().length === 0) {
    return { valid: false, error: 'Question cannot be empty' };
  }

  if (question.length < 10) {
    return { valid: false, error: 'Question must be at least 10 characters' };
  }

  if (question.length > 500) {
    return { valid: false, error: 'Question must be less than 500 characters' };
  }

  return { valid: true };
}
