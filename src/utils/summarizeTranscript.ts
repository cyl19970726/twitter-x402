import OpenAI from 'openai';

// Lazy initialization to ensure env vars are loaded
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  topics: string[];
}

/**
 * 使用 LLM 对转录文本进行总结
 * @param transcript - 转录文本
 * @param spaceTitle - Space 标题（可选，用于提供上下文）
 * @returns 总结结果
 */
export async function summarizeTranscript(
  transcript: string,
  spaceTitle?: string
): Promise<SummaryResult> {
  console.log(`\n=== Starting Transcript Summarization ===`);
  console.log(`Transcript length: ${transcript.length} characters`);
  if (spaceTitle) {
    console.log(`Space title: "${spaceTitle}"`);
  }
  console.log();

  const systemPrompt = `You are an expert at summarizing Twitter Space conversations.
Your task is to create concise, informative summaries that capture the key discussions and insights.

Format your response as JSON with the following structure:
{
  "summary": "A comprehensive summary (2-3 paragraphs)",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "topics": ["Topic 1", "Topic 2", ...]
}`;

  const userPrompt = spaceTitle
    ? `Please summarize this Twitter Space conversation titled "${spaceTitle}":\n\n${transcript}`
    : `Please summarize this Twitter Space conversation:\n\n${transcript}`;

  try {
    console.log(`[1/2] Calling OpenAI API for summarization...`);
    const startTime = Date.now();

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini', // 使用 GPT-4o mini 更经济
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✓ Summarization completed in ${duration.toFixed(1)}s`);

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI API');
    }

    const result = JSON.parse(responseText) as SummaryResult;

    console.log(`✓ Generated summary with ${result.keyPoints.length} key points and ${result.topics.length} topics`);
    console.log(`[2/2] Summary preview: ${result.summary.substring(0, 200)}...\n`);

    return result;
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`❌ Summarization failed: ${errorMsg}`);
    throw new Error(`Failed to summarize transcript: ${errorMsg}`);
  }
}

/**
 * 格式化总结结果为 Markdown
 */
export function formatSummaryAsMarkdown(
  summary: SummaryResult,
  spaceTitle?: string,
  spaceUrl?: string
): string {
  let markdown = `# Twitter Space Summary\n\n`;

  if (spaceTitle) {
    markdown += `## ${spaceTitle}\n\n`;
  }

  if (spaceUrl) {
    markdown += `**Space URL:** ${spaceUrl}\n\n`;
  }

  markdown += `## Summary\n\n${summary.summary}\n\n`;

  markdown += `## Key Points\n\n`;
  summary.keyPoints.forEach((point, i) => {
    markdown += `${i + 1}. ${point}\n`;
  });

  markdown += `\n## Topics Discussed\n\n`;
  summary.topics.forEach(topic => {
    markdown += `- ${topic}\n`;
  });

  markdown += `\n---\n*Generated with AI*\n`;

  return markdown;
}
