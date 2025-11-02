/**
 * 测试 Twitter 认证状态
 */

import { Scraper } from '@pacoyang/agent-twitter-client';

async function testAuth() {
  const scraper = new Scraper();

  // 设置 cookies
  const cookiesJson = process.env.TWITTER_COOKIES;
  if (!cookiesJson) {
    console.error('Missing TWITTER_COOKIES');
    process.exit(1);
  }

  const cookies = JSON.parse(cookiesJson);
  const cookieStrings = cookies.map((c: any) => `${c.key}=${c.value}`);

  console.log('Setting cookies...');
  await scraper.setCookies(cookieStrings);
  console.log('Cookies set!');

  console.log('\nChecking if logged in...');
  const isLoggedIn = await scraper.isLoggedIn();
  console.log(`Logged in: ${isLoggedIn}`);

  if (isLoggedIn) {
    try {
      console.log('\nGetting profile info...');
      const profile = await scraper.me();
      console.log('✅ Logged in as:', profile);
    } catch (error) {
      console.log('❌ Failed to get profile:', (error as Error).message);
    }
  } else {
    console.log('\n❌ Not logged in! Cookies may be invalid or expired.');
  }
}

testAuth();
