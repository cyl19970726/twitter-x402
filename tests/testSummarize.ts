/**
 * 测试转录文本总结功能
 */

import { summarizeTranscript, formatSummaryAsMarkdown } from './utils/summarizeTranscript';
import * as fs from 'fs';

async function testSummarize() {
  const transcriptPath = process.argv[2];

  if (!transcriptPath) {
    console.error('Usage: bun run src/testSummarize.ts <transcript_path>');
    console.error('Example: bun run src/testSummarize.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt');
    process.exit(1);
  }

  try {
    // 读取转录文本
    console.log(`Reading transcript from: ${transcriptPath}`);
    const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8');

    // 提取标题（如果存在）
    const titleMatch = transcriptContent.match(/# Transcription/);
    const transcript = transcriptContent.replace(/^# Transcription\n\nDuration: .*\n\n/, '');

    // 生成总结
    const summary = await summarizeTranscript(transcript, 'Launch an <x402 startup> in 20 minutes');

    // 格式化为 Markdown
    const markdown = formatSummaryAsMarkdown(
      summary,
      'Launch an <x402 startup> in 20 minutes',
      'https://x.com/i/spaces/1RDxlAoOeQRKL'
    );

    console.log('=== Summary Result ===\n');
    console.log(markdown);

    // 保存到文件
    const outputPath = transcriptPath.replace('_transcription.txt', '_summary.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`\n✓ Summary saved to: ${outputPath}`);

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

testSummarize();
