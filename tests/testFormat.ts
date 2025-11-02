/**
 * 测试转录稿格式化功能
 */

import { formatTranscript } from './utils/formatTranscript';
import * as fs from 'fs';

async function testFormat() {
  const transcriptPath = process.argv[2];

  if (!transcriptPath) {
    console.error('Usage: bun run src/testFormat.ts <transcript_path>');
    console.error('Example: bun run src/testFormat.ts /tmp/space_1RDxlAoOeQRKL_transcription.txt');
    process.exit(1);
  }

  try {
    // 读取转录文本
    console.log(`Reading transcript from: ${transcriptPath}`);
    const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8');

    // 移除开头的元数据
    const transcript = transcriptContent.replace(/^# Transcription\n\nDuration: .*\n\n/, '');

    // 格式化转录稿
    const result = await formatTranscript(
      transcript,
      'Launch an <x402 startup> in 20 minutes'
    );

    console.log('\n=== Formatted Transcript Result ===\n');
    console.log(`Participants: ${result.participants.join(', ')}`);
    console.log('\n--- Formatted Text Preview (first 1000 chars) ---\n');
    console.log(result.formattedText.substring(0, 1000) + '...\n');

    // 生成 Markdown
    let markdown = `# Twitter Space 完整记录\n\n`;
    markdown += `## Launch an <x402 startup> in 20 minutes\n\n`;
    markdown += `**Space URL:** https://x.com/i/spaces/1RDxlAoOeQRKL\n\n`;
    markdown += `**参加会议：** ${result.participants.join(', ')}\n\n`;
    markdown += `---\n\n`;
    markdown += result.formattedText;
    markdown += `\n\n---\n*格式化整理于 ${new Date().toLocaleString('zh-CN')}*\n`;

    // 保存到文件
    const outputPath = transcriptPath.replace('_transcription.txt', '_formatted.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✓ Formatted transcript saved to: ${outputPath}`);

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error((error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

testFormat();
