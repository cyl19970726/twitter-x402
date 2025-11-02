/**
 * 测试音频转录功能
 */

import { transcribeAudio, saveTranscription } from './utils/transcribeAudio';
import * as path from 'path';

async function testTranscribe() {
  const audioPath = process.argv[2];

  if (!audioPath) {
    console.error('Usage: bun run src/testTranscribe.ts <audio_path>');
    console.error('Example: bun run src/testTranscribe.ts /tmp/space_1RDxlAoOeQRKL.m4a');
    process.exit(1);
  }

  try {
    // 转录音频
    const result = await transcribeAudio(audioPath);

    console.log('=== Transcription Result ===\n');
    console.log('Text preview (first 500 chars):');
    console.log(result.text.substring(0, 500) + '...\n');

    // 保存到文件
    const outputPath = audioPath.replace(/\.(m4a|mp3|wav)$/, '_transcription.txt');
    saveTranscription(result, outputPath);

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

testTranscribe();
