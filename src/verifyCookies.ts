/**
 * 验证 Twitter Cookies 是否有效
 */

const cookiesJson = process.env.TWITTER_COOKIES;

if (!cookiesJson) {
  console.error('❌ Error: TWITTER_COOKIES not found in .env');
  process.exit(1);
}

try {
  const cookies = JSON.parse(cookiesJson);

  console.log('\n=== Twitter Cookies Verification ===\n');
  console.log(`Total cookies: ${cookies.length}`);

  // 检查必需的 cookies
  const requiredCookies = ['auth_token', 'ct0'];
  const cookieNames = cookies.map((c: any) => c.key);

  console.log('\nRequired cookies:');
  for (const required of requiredCookies) {
    const exists = cookieNames.includes(required);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${required}: ${exists ? 'Found' : 'Missing'}`);

    if (exists) {
      const cookie = cookies.find((c: any) => c.key === required);
      const valuePreview = cookie.value.substring(0, 20) + '...';
      console.log(`      Value: ${valuePreview}`);
    }
  }

  console.log('\nOther cookies found:');
  const otherCookies = cookies.filter((c: any) => !requiredCookies.includes(c.key));
  otherCookies.slice(0, 5).forEach((c: any) => {
    console.log(`  - ${c.key}`);
  });
  if (otherCookies.length > 5) {
    console.log(`  ... and ${otherCookies.length - 5} more`);
  }

  // 最终判断
  const hasAuthToken = cookieNames.includes('auth_token');
  const hasCt0 = cookieNames.includes('ct0');

  console.log('\n=================================');
  if (hasAuthToken && hasCt0) {
    console.log('✅ Cookies are valid!');
    console.log('You can now run: bun run src/testDownload.ts <space_url>');
  } else {
    console.log('❌ Cookies are incomplete!');
    console.log('\nProblem:');
    if (!hasAuthToken) {
      console.log('  - Missing auth_token (you may not be logged in)');
    }
    if (!hasCt0) {
      console.log('  - Missing ct0 (CSRF token)');
    }
    console.log('\nSolution:');
    console.log('  1. Login to Twitter/X in your browser');
    console.log('  2. Re-export cookies using the guide in COOKIE_EXPORT_GUIDE.md');
  }
  console.log('=================================\n');

  process.exit(hasAuthToken && hasCt0 ? 0 : 1);

} catch (error) {
  console.error('❌ Error parsing cookies:', (error as Error).message);
  process.exit(1);
}
