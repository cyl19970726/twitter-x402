import { downloadSpace } from './downloadSpace';
import { transcribeAudio } from './transcribeAudio';
import { formatTranscript } from './formatTranscript';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface TranscriptionResult {
  spaceId: string;
  title: string;
  creator: string | null;
  participants: string[];
  duration: number;
  audioPath: string;
  transcriptPath: string;
  transcript: string;
}

/**
 * 完整的 Space 转录流程
 * @param spaceUrl Twitter Space URL
 * @param spaceId Space ID
 * @returns 转录结果
 */
export async function transcribeSpace(
  spaceUrl: string,
  spaceId: string
): Promise<TranscriptionResult> {
  console.log(`[Transcription] Starting for Space: ${spaceId}`);

  // 创建存储目录
  const dataDir = process.env.DATA_STORAGE_PATH || './data/spaces';
  const spaceDir = join(dataDir, spaceId);
  await mkdir(spaceDir, { recursive: true });

  try {
    // Step 1: 下载音频
    console.log(`[Transcription] Step 1/3: Downloading audio...`);
    const downloadResult = await downloadSpace(spaceUrl, spaceDir);
    console.log(`[Transcription] Audio downloaded: ${downloadResult.audioPath}`);

    // Step 2: 转录音频
    console.log(`[Transcription] Step 2/3: Transcribing audio...`);
    const rawTranscript = await transcribeAudio(downloadResult.audioPath);
    console.log(`[Transcription] Audio transcribed: ${rawTranscript.length} chars`);

    // Step 3: 格式化转录
    console.log(`[Transcription] Step 3/3: Formatting transcript...`);
    const formatted = await formatTranscript(rawTranscript, {
      title: downloadResult.metadata.title,
      creator: downloadResult.metadata.creator,
    });
    console.log(`[Transcription] Transcript formatted`);

    // 保存转录文件
    const transcriptPath = join(spaceDir, 'transcript.md');
    await writeFile(transcriptPath, formatted.formattedTranscript, 'utf-8');
    console.log(`[Transcription] Saved to: ${transcriptPath}`);

    return {
      spaceId,
      title: downloadResult.metadata.title,
      creator: downloadResult.metadata.creator || null,
      participants: formatted.participants || [],
      duration: formatted.duration || 0,
      audioPath: downloadResult.audioPath,
      transcriptPath,
      transcript: formatted.formattedTranscript,
    };
  } catch (error) {
    console.error(`[Transcription] Failed for Space ${spaceId}:`, error);
    throw error;
  }
}
