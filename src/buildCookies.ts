/**
 * 从手动提供的 auth_token 和 ct0 构建 cookies
 *
 * 使用方法:
 * bun run src/buildCookies.ts <auth_token> <ct0>
 */

import * as fs from 'fs';
import * as path from 'path';

const authToken = process.argv[2];
const ct0 = process.argv[3];

if (!authToken) {
  console.error('❌ 错误: 缺少 auth_token');
  console.error('\n使用方法:');
  console.error('  bun run src/buildCookies.ts <auth_token> [ct0]');
  console.error('\n示例:');
  console.error('  bun run src/buildCookies.ts d33a7e3f3089f779504cc8d73878e14f681a6a58');
  process.exit(1);
}

console.log('\n=== 构建 Twitter Cookies ===\n');
console.log(`auth_token: ${authToken.substring(0, 20)}...`);

// 构建基本的 cookies
const cookies = [
  {
    key: 'auth_token',
    value: authToken,
    domain: '.twitter.com',
    path: '/'
  }
];

// 如果提供了 ct0，添加它
if (ct0) {
  console.log(`ct0: ${ct0.substring(0, 20)}...`);
  cookies.push({
    key: 'ct0',
    value: ct0,
    domain: '.twitter.com',
    path: '/'
  });
} else {
  console.log('\n⚠️  未提供 ct0 (CSRF token)');
  console.log('   尝试只使用 auth_token，如果不行需要提供 ct0');
}

// 添加一些常见的辅助 cookies
cookies.push(
  {
    key: 'guest_id',
    value: `v1%3A${Date.now()}`,
    domain: '.twitter.com',
    path: '/'
  },
  {
    key: 'lang',
    value: 'en',
    domain: '.twitter.com',
    path: '/'
  }
);

const cookiesJson = JSON.stringify(cookies);

console.log(`\n✓ 已构建 ${cookies.length} 个 cookies`);

// 保存到 .env
const envPath = path.join(process.cwd(), '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// 检查是否已有 TWITTER_COOKIES
if (envContent.includes('TWITTER_COOKIES=')) {
  envContent = envContent.replace(
    /TWITTER_COOKIES=.*/,
    `TWITTER_COOKIES=${cookiesJson}`
  );
  console.log('\n✓ 已更新 .env 中的 TWITTER_COOKIES');
} else {
  envContent += `\n# Twitter Cookies\nTWITTER_COOKIES=${cookiesJson}\n`;
  console.log('\n✓ 已添加 TWITTER_COOKIES 到 .env');
}

fs.writeFileSync(envPath, envContent);

console.log('\n📝 Cookies 内容:');
console.log(cookiesJson);

console.log('\n✅ 完成!');
console.log('\n下一步:');
console.log('  1. 验证 cookies: bun run src/verifyCookies.ts');
console.log('  2. 测试下载: bun run src/testDownload.ts <space_url>');
console.log('');
