import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Lazy initialization to ensure env vars are loaded
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

/**
 * 使用 OpenAI Whisper API 转录音频文件
 * @param audioPath - 音频文件的完整路径
 * @returns 转录结果
 */
export async function transcribeAudio(
  audioPath: string
): Promise<TranscriptionResult> {
  console.log(`\n=== Starting Audio Transcription ===`);
  console.log(`Audio file: ${audioPath}\n`);

  // 1. 验证文件存在
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const stats = fs.statSync(audioPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[1/3] File size: ${fileSizeMB} MB`);

  // 2. 检查文件大小限制 (Whisper API 限制 25MB)
  if (stats.size > 25 * 1024 * 1024) {
    throw new Error(
      `Audio file is too large (${fileSizeMB} MB). ` +
      `Whisper API has a 25MB limit. Please implement audio chunking.`
    );
  }

  // 3. 使用 Whisper API 转录
  console.log(`[2/3] Calling OpenAI Whisper API...`);

  try {
    const startTime = Date.now();

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'en', // 可以设为 'auto' 自动检测
      response_format: 'verbose_json', // 获取更详细的信息
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log(`✓ Transcription completed in ${duration.toFixed(1)}s`);
    console.log(`✓ Detected language: ${transcription.language}`);
    console.log(`✓ Duration: ${transcription.duration?.toFixed(1)}s`);

    // 4. 返回转录文本
    console.log(`[3/3] Transcription text length: ${transcription.text.length} characters\n`);

    return {
      text: transcription.text,
      duration: transcription.duration,
    };
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`❌ Transcription failed: ${errorMsg}`);
    throw new Error(`Failed to transcribe audio: ${errorMsg}`);
  }
}

/**
 * 将转录结果保存到文件
 */
export function saveTranscription(
  transcription: TranscriptionResult,
  outputPath: string
): void {
  const content = `# Transcription\n\nDuration: ${transcription.duration?.toFixed(1)}s\n\n${transcription.text}\n`;
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✓ Transcription saved to: ${outputPath}`);
}
