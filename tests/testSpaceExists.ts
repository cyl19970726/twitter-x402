/**
 * Test to check if a Twitter Space exists and is accessible
 */

import { Scraper } from '@pacoyang/agent-twitter-client';
import * as fs from 'fs';
import * as path from 'path';

async function testSpaceExists(spaceId: string) {
  console.log(`\n=== Testing Space Existence ===`);
  console.log(`Space ID: ${spaceId}\n`);

  const scraper = new Scraper();

  // Load cookies from .env
  const cookiesJson = process.env.TWITTER_COOKIES;
  if (!cookiesJson) {
    throw new Error('TWITTER_COOKIES environment variable not set');
  }

  console.log('Setting cookies...');
  const cookies = JSON.parse(cookiesJson);
  const cookieStrings = cookies.map((c: any) => `${c.key}=${c.value}`);
  await scraper.setCookies(cookieStrings);
  console.log('✓ Cookies set\n');

  try {
    console.log('Fetching Space data...');
    const space = await scraper.getSpace(spaceId);

    console.log('\n✅ Space exists and is accessible!');
    console.log('\nSpace details:');
    console.log('  State:', space?.state);
    console.log('  Title:', space?.metadata?.title);
    console.log('  Created:', space?.metadata?.created_at);
    console.log('  Started:', space?.metadata?.started_at);
    console.log('  Ended:', space?.metadata?.ended_at);
    console.log('  Is available for replay:', space?.metadata?.is_available_for_replay);

    return true;
  } catch (error) {
    console.error('\n❌ Space not accessible');
    console.error('Error:', (error as Error).message);

    if ((error as Error).message.includes('invalid broadcast_ids')) {
      console.error('\nThis Space ID is invalid or the Space has been deleted.');
      console.error('Possible reasons:');
      console.error('  1. Space ended more than 30 days ago');
      console.error('  2. Space was deleted by the host');
      console.error('  3. Invalid Space ID format');
    }

    return false;
  }
}

// Test with the Space ID from the error
const testSpaceId = process.argv[2] || '1vOGwMvBnYjxB';

testSpaceExists(testSpaceId)
  .then(exists => {
    console.log(`\n=== Test Complete ===`);
    console.log(`Space ${testSpaceId} exists: ${exists}`);
    process.exit(exists ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
