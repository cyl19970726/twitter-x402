#!/usr/bin/env bun

/**
 * 测试支付脚本
 *
 * 使用 x402 协议进行真实 USDC 支付来转录 Twitter Space
 */

import { x402Fetch } from 'x402-fetch';

// 配置
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8787';
const TEST_SPACE_URL = process.env.TEST_SPACE_URL || 'https://twitter.com/i/spaces/1RDxlAoOeQRKL';

console.log('🧪 测试 x402 支付...\n');
console.log('📝 配置:');
console.log(`   Agent URL: ${AGENT_URL}`);
console.log(`   Space URL: ${TEST_SPACE_URL}`);
console.log('   Price: 0.2 USDC');
console.log('');

async function testTranscription() {
  try {
    console.log('💳 发送支付请求...');

    const response = await x402Fetch(`${AGENT_URL}/invoke/transcribe-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spaceUrl: TEST_SPACE_URL,
        title: 'Test Space Transcription',
      }),
    });

    const result = await response.json();

    console.log('\n✅ 支付成功！');
    console.log('\n📊 响应:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n🎉 任务已入队！');
      console.log(`📍 Space ID: ${result.spaceId}`);
      console.log(`⏱️  预计时间: ${result.estimatedTimeMinutes} 分钟`);
      console.log(`📋 队列位置: ${result.queuePosition || 1}`);
      console.log('\n💡 提示:');
      console.log('   - 查看 Worker 日志: tail -f logs/worker.log');
      console.log('   - 查看数据库: bun run db:studio');
    }

  } catch (error) {
    console.error('\n❌ 支付失败:', error);
    console.log('\n💡 可能的原因:');
    console.log('   1. 钱包余额不足（需要 >0.2 USDC）');
    console.log('   2. Agent 服务未运行');
    console.log('   3. 网络问题');
  }
}

// 执行测试
testTranscription();
