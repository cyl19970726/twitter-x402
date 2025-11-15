import OpenAI from 'openai';

// Lazy initialization to ensure env vars are loaded
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface SpeakerProfile {
  name: string;
  background?: string;      // Speaker background information inferred from conversation
}

export interface FormattedTranscriptResult {
  participants: string[];
  speakerProfiles: SpeakerProfile[];  // 新增：说话人详细信息
  formattedText: string;
}

/**
 * 使用 LLM 将原始转录文本格式化为结构化对话
 * 识别说话人并格式化为：
 * 参加会议：A, B, C
 * A: ...
 * B: ...
 */
export async function formatTranscript(
  rawTranscript: string,
  spaceTitle?: string,
  spaceMetadata?: {
    participants?: Array<{
      display_name?: string;
      twitter_screen_name?: string;
    }>;
  }
): Promise<FormattedTranscriptResult> {
  console.log(`\n=== Starting Transcript Formatting ===`);
  console.log(`Raw transcript length: ${rawTranscript.length} characters`);
  if (spaceTitle) {
    console.log(`Space title: "${spaceTitle}"`);
  }
  console.log();

  // 构建参与者提示（如果有元数据）
  let participantHint = '';
  if (spaceMetadata?.participants && spaceMetadata.participants.length > 0) {
    const names = spaceMetadata.participants
      .map(p => p.display_name || p.twitter_screen_name)
      .filter(Boolean)
      .slice(0, 10); // 限制前10个参与者

    if (names.length > 0) {
      participantHint = `\n\nKnown participants (use these names when possible): ${names.join(', ')}`;
    }
  }

  const systemPrompt = `You are an expert at formatting transcripts from audio conversations.
Your task is to take a raw, unformatted transcript and convert it into a well-structured dialogue format with speaker identification and background analysis.

Instructions:
1. Identify different speakers based on context, tone, and content
2. Assign clear speaker labels (use real names if you can infer them, otherwise use Speaker A, Speaker B, etc.)
3. Extract speaker background information from the conversation:
   - Professional background, role, or affiliation (if mentioned)
   - Area of expertise or domain knowledge (based on what they discuss)
   - Their role in the conversation (e.g., host, guest, expert, moderator)
   - Combine all relevant information into a concise background description
4. Format the output as a structured dialogue
5. Preserve all content but organize it clearly
6. Remove filler words and clean up the text while maintaining the original meaning

Output format:
Participants: [Speaker 1], [Speaker 2], [Speaker 3], ...

[Speaker 1]: [Their first statement/question]
[Speaker 2]: [Their response]
[Speaker 1]: [Their follow-up]
...

Return your response as JSON with this structure:
{
  "participants": ["Speaker 1", "Speaker 2", ...],
  "speakerProfiles": [
    {
      "name": "Speaker 1",
      "background": "Brief background description combining role, expertise, and affiliation if inferrable from conversation"
    },
    ...
  ],
  "formattedText": "The full formatted dialogue"
}

Notes:
- If speaker information cannot be inferred, omit the background field or leave it as null
- Base all inferences on actual content from the transcript
- Do not fabricate information that isn't supported by the conversation
- Keep background descriptions concise (1-2 sentences max)`;

  const userPrompt = `Please format this transcript from a Twitter Space${spaceTitle ? ` titled "${spaceTitle}"` : ''}:${participantHint}

Raw Transcript:
${rawTranscript}`;

  try {
    console.log(`[1/2] Calling OpenAI API to format transcript...`);
    const startTime = Date.now();

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o', // 使用 GPT-4o 获得更好的说话人识别
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // 较低温度保证一致性
      response_format: { type: 'json_object' },
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✓ Formatting completed in ${duration.toFixed(1)}s`);

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI API');
    }

    // 尝试解析 JSON，如果失败则记录详细信息
    let result: FormattedTranscriptResult;
    try {
      result = JSON.parse(responseText) as FormattedTranscriptResult;
    } catch (parseError) {
      console.error('❌ JSON parse error. Response text (first 500 chars):');
      console.error(responseText.substring(0, 500));
      console.error('\n... (truncated)');
      console.error('\nLast 200 chars:');
      console.error(responseText.substring(responseText.length - 200));
      throw new Error(`JSON parse error: ${(parseError as Error).message}. Response may be truncated or malformed.`);
    }

    // 验证结果结构
    if (!result.participants || !result.formattedText) {
      throw new Error('Invalid response structure: missing participants or formattedText');
    }

    // 确保 speakerProfiles 存在（向后兼容）
    if (!result.speakerProfiles) {
      result.speakerProfiles = result.participants.map(name => ({ name }));
    }

    console.log(`✓ Identified ${result.participants.length} participants`);
    console.log(`✓ Participants: ${result.participants.join(', ')}`);

    // Output speaker background information
    if (result.speakerProfiles && result.speakerProfiles.length > 0) {
      console.log(`\n✓ Speaker Profiles:`);
      result.speakerProfiles.forEach(profile => {
        console.log(`  - ${profile.name}:`);
        if (profile.background) {
          console.log(`    Background: ${profile.background}`);
        }
      });
    }

    console.log(`\n[2/2] Formatted text length: ${result.formattedText.length} characters\n`);

    return result;
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`❌ Formatting failed: ${errorMsg}`);
    throw new Error(`Failed to format transcript: ${errorMsg}`);
  }
}

/**
 * Save formatted transcript as Markdown
 */
export function saveFormattedTranscript(
  formatted: FormattedTranscriptResult,
  outputPath: string,
  spaceTitle?: string,
  spaceUrl?: string
): void {
  let markdown = `# Twitter Space Transcript\n\n`;

  if (spaceTitle) {
    markdown += `## ${spaceTitle}\n\n`;
  }

  if (spaceUrl) {
    markdown += `**Space URL:** ${spaceUrl}\n\n`;
  }

  markdown += `**Participants:** ${formatted.participants.join(', ')}\n\n`;

  // Add speaker background information
  if (formatted.speakerProfiles && formatted.speakerProfiles.length > 0) {
    markdown += `## Speaker Profiles\n\n`;
    formatted.speakerProfiles.forEach(profile => {
      markdown += `### ${profile.name}\n\n`;
      if (profile.background) {
        markdown += `${profile.background}\n`;
      }
      markdown += `\n`;
    });
  }

  markdown += `---\n\n`;
  markdown += formatted.formattedText;
  markdown += `\n\n---\n*Formatted on ${new Date().toISOString()}*\n`;

  const fs = require('fs');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`✓ Formatted transcript saved to: ${outputPath}`);
}
