/**
 * 完整的端到端测试：Twitter Space 总结流程
 */

import { summarizeSpaceFromUrl } from './utils/summarizeSpace';
import * as fs from 'fs';

async function testEndToEnd() {
  const spaceUrl = process.argv[2] || 'https://x.com/i/spaces/1RDxlAoOeQRKL';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Twitter Space Summarization - End-to-End Test`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // 运行完整流程
    const result = await summarizeSpaceFromUrl(spaceUrl);

    // 显示结果
    console.log(`\n${'='.repeat(70)}`);
    console.log(`FINAL RESULTS`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`Title: ${result.metadata.title}`);
    console.log(`Creator ID: ${result.metadata.creator}`);
    console.log(`Duration: ${result.transcription.duration?.toFixed(1)}s (${(result.transcription.duration! / 60).toFixed(1)} minutes)`);
    console.log(`Transcript Length: ${result.transcription.text.length} characters`);
    console.log(`Participants: ${result.formattedTranscript.participants.length}`);
    console.log(`Participants List: ${result.formattedTranscript.participants.join(', ')}`);
    console.log(`Key Points: ${result.summary.keyPoints.length}`);
    console.log(`Topics: ${result.summary.topics.length}`);

    console.log(`\n--- Formatted Transcript Preview (first 500 chars) ---\n`);
    console.log(result.formattedTranscriptMarkdown.substring(0, 500) + '...\n');

    console.log(`\n--- Summary Preview ---\n`);
    console.log(result.summaryMarkdown);

    // 保存结果到文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const formattedPath = `/tmp/space_formatted_${timestamp}.md`;
    fs.writeFileSync(formattedPath, result.formattedTranscriptMarkdown, 'utf-8');

    const summaryPath = `/tmp/space_summary_${timestamp}.md`;
    fs.writeFileSync(summaryPath, result.summaryMarkdown, 'utf-8');

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ End-to-End Test PASSED`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\nFormatted transcript saved to: ${formattedPath}`);
    console.log(`Summary saved to: ${summaryPath}\n`);

  } catch (error) {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ End-to-End Test FAILED`);
    console.error(`${'='.repeat(70)}`);
    console.error(`\nError: ${(error as Error).message}`);
    console.error(`Stack: ${(error as Error).stack}\n`);
    process.exit(1);
  }
}

testEndToEnd();
