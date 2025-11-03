/**
 * 测试两个 entrypoint 的职责分离
 * 验证 format-twitter-space 不执行 summary 工作
 */

import { formatSpaceFromUrl, summarizeSpaceFromUrl } from '../src/utils/summarizeSpace';

async function testFormatEntrypoint() {
  console.log('\n🧪 Testing format-twitter-space entrypoint (should NOT include summary)\n');

  const testUrl = 'https://x.com/i/spaces/1RDxlAoOeQRKL';

  try {
    const result = await formatSpaceFromUrl(testUrl);

    console.log('\n✅ Format Entrypoint Result:');
    console.log('  - Has spaceUrl:', !!result.spaceUrl);
    console.log('  - Has metadata:', !!result.metadata);
    console.log('  - Has transcription:', !!result.transcription);
    console.log('  - Has formattedTranscript:', !!result.formattedTranscript);
    console.log('  - Has formattedTranscriptMarkdown:', !!result.formattedTranscriptMarkdown);
    console.log('  - Has summary:', !!(result as any).summary, '← Should be FALSE');
    console.log('  - Has summaryMarkdown:', !!(result as any).summaryMarkdown, '← Should be FALSE');

    if ((result as any).summary || (result as any).summaryMarkdown) {
      console.error('\n❌ ERROR: Format entrypoint should NOT include summary!');
      process.exit(1);
    }

    console.log('\n✅ PASS: Format entrypoint correctly excludes summary\n');
  } catch (error) {
    console.error('❌ Format entrypoint test failed:', error);
    process.exit(1);
  }
}

async function testSummarizeEntrypoint() {
  console.log('\n🧪 Testing summarize-twitter-space entrypoint (should include summary)\n');

  const testUrl = 'https://x.com/i/spaces/1RDxlAoOeQRKL';

  try {
    const result = await summarizeSpaceFromUrl(testUrl);

    console.log('\n✅ Summarize Entrypoint Result:');
    console.log('  - Has spaceUrl:', !!result.spaceUrl);
    console.log('  - Has metadata:', !!result.metadata);
    console.log('  - Has transcription:', !!result.transcription);
    console.log('  - Has formattedTranscript:', !!result.formattedTranscript);
    console.log('  - Has formattedTranscriptMarkdown:', !!result.formattedTranscriptMarkdown);
    console.log('  - Has summary:', !!result.summary, '← Should be TRUE');
    console.log('  - Has summaryMarkdown:', !!result.summaryMarkdown, '← Should be TRUE');

    if (!result.summary || !result.summaryMarkdown) {
      console.error('\n❌ ERROR: Summarize entrypoint should include summary!');
      process.exit(1);
    }

    console.log('\n✅ PASS: Summarize entrypoint correctly includes summary\n');
  } catch (error) {
    console.error('❌ Summarize entrypoint test failed:', error);
    process.exit(1);
  }
}

// 运行测试
async function main() {
  console.log('='.repeat(70));
  console.log('Testing Entrypoint Separation');
  console.log('='.repeat(70));

  // 测试 format entrypoint
  await testFormatEntrypoint();

  // 测试 summarize entrypoint
  await testSummarizeEntrypoint();

  console.log('='.repeat(70));
  console.log('✅ All tests passed!');
  console.log('='.repeat(70));
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
