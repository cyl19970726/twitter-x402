import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Lazy initialization to ensure env vars are loaded
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * 使用 ffmpeg 将音频文件切分成多个块
 * @param audioPath - 原始音频文件路径
 * @param chunkDurationMinutes - 每个块的时长（分钟）
 * @returns 切分后的文件路径数组
 */
async function splitAudioIntoChunks(
  audioPath: string,
  chunkDurationMinutes: number = 10
): Promise<string[]> {
  console.log(`\n=== Splitting audio into ${chunkDurationMinutes}-minute chunks ===`);

  const dir = path.dirname(audioPath);
  const ext = path.extname(audioPath);
  const basename = path.basename(audioPath, ext);
  const outputPattern = path.join(dir, `${basename}_chunk_%03d${ext}`);

  const chunkDurationSeconds = chunkDurationMinutes * 60;

  try {
    // 使用 ffmpeg 切分音频
    // -f segment: 使用 segment muxer
    // -segment_time: 每个段的时长（秒）
    // -c copy: 不重新编码，直接复制（更快）
    // -reset_timestamps 1: 重置每个段的时间戳
    const command = `ffmpeg -i "${audioPath}" -f segment -segment_time ${chunkDurationSeconds} -c copy -reset_timestamps 1 "${outputPattern}"`;

    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'pipe' });

    // 查找所有生成的块文件
    const files = fs.readdirSync(dir);
    const chunkFiles = files
      .filter(f => f.startsWith(`${basename}_chunk_`) && f.endsWith(ext))
      .map(f => path.join(dir, f))
      .sort();

    console.log(`✓ Split into ${chunkFiles.length} chunks`);
    chunkFiles.forEach((f, i) => {
      const size = (fs.statSync(f).size / (1024 * 1024)).toFixed(2);
      console.log(`  Chunk ${i + 1}: ${path.basename(f)} (${size} MB)`);
    });

    return chunkFiles;
  } catch (error) {
    throw new Error(`Failed to split audio: ${(error as Error).message}`);
  }
}

/**
 * 转录单个音频文件（不超过 25MB）
 */
async function transcribeSingleFile(audioPath: string): Promise<TranscriptionResult> {
  console.log(`\n  Transcribing: ${path.basename(audioPath)}`);

  const startTime = Date.now();

  const transcription = await getOpenAI().audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
  });

  const duration = (Date.now() - startTime) / 1000;

  console.log(`  ✓ Completed in ${duration.toFixed(1)}s (${transcription.text.length} chars)`);

  return {
    text: transcription.text,
    duration: transcription.duration,
  };
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

/**
 * 使用 OpenAI Whisper API 转录音频文件
 * 自动处理大文件（>25MB）通过分块转录
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
  console.log(`[1/4] File size: ${fileSizeMB} MB`);

  const MAX_SIZE = 25 * 1024 * 1024; // 25MB limit

  try {
    // 2. 检查是否需要分块
    if (stats.size > MAX_SIZE) {
      console.log(`[2/4] File exceeds 25MB limit - using chunked transcription`);

      // 切分音频文件
      const chunkFiles = await splitAudioIntoChunks(audioPath);

      console.log(`\n[3/4] Transcribing ${chunkFiles.length} chunks...`);

      // 转录每个块
      const chunkResults: TranscriptionResult[] = [];
      let totalDuration = 0;

      for (let i = 0; i < chunkFiles.length; i++) {
        console.log(`\n  === Chunk ${i + 1}/${chunkFiles.length} ===`);
        const result = await transcribeSingleFile(chunkFiles[i]);
        chunkResults.push(result);
        if (result.duration) {
          totalDuration += result.duration;
        }
      }

      // 清理临时块文件
      console.log(`\n  Cleaning up ${chunkFiles.length} temporary chunk files...`);
      chunkFiles.forEach(f => {
        try {
          fs.unlinkSync(f);
        } catch (e) {
          console.warn(`  Warning: Failed to delete ${f}`);
        }
      });

      // 合并转录结果
      console.log(`\n[4/4] Merging transcriptions...`);
      const mergedText = chunkResults.map(r => r.text).join(' ');

      console.log(`✓ Transcription completed`);
      console.log(`✓ Total chunks: ${chunkResults.length}`);
      console.log(`✓ Total duration: ${totalDuration.toFixed(1)}s`);
      console.log(`✓ Total text length: ${mergedText.length} characters\n`);

      return {
        text: mergedText,
        duration: totalDuration,
      };
    } else {
      // 文件小于 25MB，直接转录
      console.log(`[2/4] File size OK - using direct transcription`);
      console.log(`[3/4] Calling OpenAI Whisper API...`);

      const result = await transcribeSingleFile(audioPath);

      console.log(`\n[4/4] Transcription text length: ${result.text.length} characters\n`);

      return result;
    }
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
