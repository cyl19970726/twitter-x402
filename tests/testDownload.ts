/**
 * 测试 Twitter Space 下载功能
 *
 * 使用方法:
 * bun run src/testDownload.ts <space_url>
 *
 * 示例:
 * bun run src/testDownload.ts https://twitter.com/i/spaces/1vOGwMvBnYjxB
 */

import { downloadFinishedSpace } from './utils/downloadSpace';

async function main() {
  const spaceUrl = process.argv[2];

  if (!spaceUrl) {
    console.error('❌ Error: Please provide a Space URL as argument');
    console.error('\nUsage:');
    console.error('  bun run src/testDownload.ts <space_url>');
    console.error('\nExample:');
    console.error('  bun run src/testDownload.ts https://twitter.com/i/spaces/1vOGwMvBnYjxB');
    process.exit(1);
  }

  try {
    const result = await downloadFinishedSpace(spaceUrl);

    console.log('\n=== Download Successful! ===');
    console.log('Audio Path:', result.audioPath);
    console.log('Title:', result.metadata.title);
    console.log('Creator:', result.metadata.creator);
    console.log('Available for Replay:', result.metadata.isAvailableForReplay);
    console.log('\nYou can now use this audio file for transcription.');

  } catch (error) {
    console.error('\n❌ Download Failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

main();
