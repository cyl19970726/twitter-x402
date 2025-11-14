/**
 * 完整的 Twitter Space 总结流程:
 * 1. 下载 Space 音频
 * 2. 转录音频
 * 3. 生成总结
 */

import { downloadFinishedSpace, SpaceDownloadResult } from './downloadSpace';
import { transcribeAudio, TranscriptionResult } from './transcribeAudio';
import { formatTranscript, FormattedTranscriptResult } from './formatTranscript';
import * as storage from './storageManager';

/**
 * Generate formatted transcript as Markdown
 */
function generateFormattedTranscriptMarkdown(
  formatted: FormattedTranscriptResult,
  spaceTitle?: string,
  spaceUrl?: string
): string {
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

  return markdown;
}

export interface SpaceFormatResult {
  spaceUrl: string;
  metadata: SpaceDownloadResult['metadata'];
  transcription: TranscriptionResult;
  formattedTranscript: FormattedTranscriptResult;
  formattedTranscriptMarkdown: string;
}


/**
 * 进度回调函数类型
 */
export type ProgressCallback = (step: string, message: string, details?: any) => void | Promise<void>;

/**
 * 格式化流程：下载 + 转录 + 格式化（不包括总结）
 * 支持缓存：如果 Space 已处理过，直接返回缓存结果
 */
export async function formatSpaceFromUrl(
  spaceUrl: string,
  onProgress?: ProgressCallback
): Promise<SpaceFormatResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Twitter Space Format Pipeline`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Space URL: ${spaceUrl}\n`);

  // Check cache first
  const spaceId = storage.extractSpaceId(spaceUrl);
  console.log(`Space ID: ${spaceId}`);

  if (await storage.checkSpaceExists(spaceId)) {
    console.log(`\n✓ Found cached Space data for ${spaceId}`);
    console.log(`Loading from storage...\n`);

    const cachedData = await storage.getSpaceData(spaceId);
    if (cachedData) {
      await onProgress?.('cache', 'Loaded from cache', {
        step: 3,
        total: 3,
        completed: true,
        cached: true
      });

      return {
        spaceUrl,
        metadata: {
          title: cachedData.metadata.title,
          creator: cachedData.metadata.creator,
          isAvailableForReplay: true,
          mediaKey: undefined
        },
        transcription: {
          text: cachedData.transcriptJson.formattedText,
          duration: cachedData.metadata.audioDuration
        },
        formattedTranscript: {
          participants: cachedData.metadata.participants,
          speakerProfiles: cachedData.metadata.speakerProfiles,
          formattedText: cachedData.transcriptJson.formattedText
        },
        formattedTranscriptMarkdown: cachedData.transcript
      };
    }
  }

  console.log(`\n⚙️  Processing new Space (not in cache)...\n`);

  // Step 1: 下载 Space 音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 1: Download Space Audio\n`);
  await onProgress?.('download', 'Downloading Space audio...', { step: 1, total: 3 });

  const downloadResult = await downloadFinishedSpace(spaceUrl);

  const fileSizeMB = require('fs').statSync(downloadResult.audioPath).size / (1024 * 1024);
  await onProgress?.('download', 'Audio downloaded successfully', {
    step: 1,
    total: 3,
    completed: true,
    sizeMB: parseFloat(fileSizeMB.toFixed(2)),
    title: downloadResult.metadata.title
  });

  // Step 2: 转录音频
  console.log(`\n[${'▶'.repeat(3)}] STEP 2: Transcribe Audio\n`);
  await onProgress?.('transcribe', 'Transcribing audio with Whisper API...', { step: 2, total: 3 });

  const transcription = await transcribeAudio(downloadResult.audioPath);

  await onProgress?.('transcribe', 'Transcription complete', {
    step: 2,
    total: 3,
    completed: true,
    characters: transcription.text.length,
    durationSeconds: transcription.duration
  });

  // Step 3: 格式化转录稿（识别说话人）
  console.log(`\n[${'▶'.repeat(3)}] STEP 3: Format Transcript (Identify Speakers)\n`);
  await onProgress?.('format', 'Formatting transcript with GPT-4o...', { step: 3, total: 3 });

  const formattedTranscript = await formatTranscript(
    transcription.text,
    downloadResult.metadata.title
  );

  await onProgress?.('format', 'Formatting complete', {
    step: 3,
    total: 3,
    completed: true,
    participants: formattedTranscript.participants.length,
    speakerNames: formattedTranscript.participants
  });

  // 生成格式化转录稿的 Markdown
  const formattedTranscriptMarkdown = generateFormattedTranscriptMarkdown(
    formattedTranscript,
    downloadResult.metadata.title,
    spaceUrl
  );

  // Save to storage (database + filesystem)
  console.log(`\n💾 Saving to storage...`);
  await storage.saveSpace(spaceId, spaceUrl, {
    title: downloadResult.metadata.title,
    creator: downloadResult.metadata.creator,
    audioDuration: transcription.duration,
    audioPath: downloadResult.audioPath,
    transcript: formattedTranscriptMarkdown,
    transcriptJson: {
      participants: formattedTranscript.participants,
      speakerProfiles: formattedTranscript.speakerProfiles,
      formattedText: formattedTranscript.formattedText,
    },
  });
  console.log(`✓ Saved to storage\n`);

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

