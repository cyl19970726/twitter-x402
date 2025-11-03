/**
 * 完整的 Twitter Space 总结流程:
 * 1. 下载 Space 音频
 * 2. 转录音频
 * 3. 生成总结
 */

import { downloadFinishedSpace, SpaceDownloadResult } from './downloadSpace';
import { transcribeAudio, TranscriptionResult } from './transcribeAudio';
import { formatTranscript, FormattedTranscriptResult } from './formatTranscript';
import { summarizeTranscript, formatSummaryAsMarkdown, SummaryResult } from './summarizeTranscript';

/**
 * 生成格式化转录稿的 Markdown
 */
function generateFormattedTranscriptMarkdown(
  formatted: FormattedTranscriptResult,
  spaceTitle?: string,
  spaceUrl?: string
): string {
  let markdown = `# Twitter Space 完整记录\n\n`;

  if (spaceTitle) {
    markdown += `## ${spaceTitle}\n\n`;
  }

  if (spaceUrl) {
    markdown += `**Space URL:** ${spaceUrl}\n\n`;
  }

  markdown += `**参加会议：** ${formatted.participants.join(', ')}\n\n`;
  markdown += `---\n\n`;
  markdown += formatted.formattedText;
  markdown += `\n\n---\n*格式化整理于 ${new Date().toLocaleString('zh-CN')}*\n`;

  return markdown;
}

export interface SpaceFormatResult {
  spaceUrl: string;
  metadata: SpaceDownloadResult['metadata'];
  transcription: TranscriptionResult;
  formattedTranscript: FormattedTranscriptResult;
  formattedTranscriptMarkdown: string;
}

export interface SpaceSummaryResult {
  spaceUrl: string;
  metadata: SpaceDownloadResult['metadata'];
  transcription: TranscriptionResult;
  formattedTranscript: FormattedTranscriptResult;
  summary: SummaryResult;
  summaryMarkdown: string;
  formattedTranscriptMarkdown: string;
}

/**
 * 格式化流程：下载 + 转录 + 格式化（不包括总结）
 */
export async function formatSpaceFromUrl(
  spaceUrl: string
): Promise<SpaceFormatResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Twitter Space Format Pipeline`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Space URL: ${spaceUrl}\n`);

  // Step 1: 下载 Space 音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 1: Download Space Audio\n`);
  const downloadResult = await downloadFinishedSpace(spaceUrl);

  // Step 2: 转录音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 2: Transcribe Audio\n`);
  const transcription = await transcribeAudio(downloadResult.audioPath);

  // Step 3: 格式化转录稿（识别说话人）
  console.log(`\n[${'▶'.repeat(3)}] STEP 3: Format Transcript (Identify Speakers)\n`);
  const formattedTranscript = await formatTranscript(
    transcription.text,
    downloadResult.metadata.title
  );

  // 生成格式化转录稿的 Markdown
  const formattedTranscriptMarkdown = generateFormattedTranscriptMarkdown(
    formattedTranscript,
    downloadResult.metadata.title,
    spaceUrl
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Format Pipeline Complete!`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    spaceUrl,
    metadata: downloadResult.metadata,
    transcription,
    formattedTranscript,
    formattedTranscriptMarkdown,
  };
}

/**
 * 完整流程：从 Space URL 到总结（包括格式化）
 */
export async function summarizeSpaceFromUrl(
  spaceUrl: string
): Promise<SpaceSummaryResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Twitter Space Summarization Pipeline`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Space URL: ${spaceUrl}\n`);

  // Step 1: 下载 Space 音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 1: Download Space Audio\n`);
  const downloadResult = await downloadFinishedSpace(spaceUrl);

  // Step 2: 转录音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 2: Transcribe Audio\n`);
  const transcription = await transcribeAudio(downloadResult.audioPath);

  // Step 3: 格式化转录稿（识别说话人）
  console.log(`\n[${'▶'.repeat(3)}] STEP 3: Format Transcript (Identify Speakers)\n`);
  const formattedTranscript = await formatTranscript(
    transcription.text,
    downloadResult.metadata.title
  );

  // 生成格式化转录稿的 Markdown
  const formattedTranscriptMarkdown = generateFormattedTranscriptMarkdown(
    formattedTranscript,
    downloadResult.metadata.title,
    spaceUrl
  );

  // Step 4: 生成总结（基于格式化后的文本）
  console.log(`\n[${'▶'.repeat(3)}] STEP 4: Generate Summary\n`);
  const summary = await summarizeTranscript(
    formattedTranscript.formattedText,
    downloadResult.metadata.title
  );

  // Step 5: 格式化总结为 Markdown
  const summaryMarkdown = formatSummaryAsMarkdown(
    summary,
    downloadResult.metadata.title,
    spaceUrl
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Pipeline Complete!`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    spaceUrl,
    metadata: downloadResult.metadata,
    transcription,
    formattedTranscript,
    summary,
    summaryMarkdown,
    formattedTranscriptMarkdown,
  };
}
