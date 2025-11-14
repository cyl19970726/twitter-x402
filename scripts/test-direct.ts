#!/usr/bin/env bun

/**
 * 直接测试脚本（绕过支付）
 *
 * 直接调用 Agent handler 测试功能，无需真实支付
 */

import { db } from '../src/db/client';
import { spaces, jobs, users, transcriptionPayments } from '../src/db/schema';
import { getOrCreateUser } from '../src/db/queries/users';
import { getOrCreateSpace } from '../src/db/queries/spaces';
import { queueJob } from '../src/db/queries/queue';
import { recordTranscriptionPayment } from '../src/services/paymentService';

const TEST_WALLET = '0xTESTWALLET' + Date.now();
const TEST_SPACE_URL = 'https://twitter.com/i/spaces/1RDxlAoOeQRKL';
const TEST_SPACE_ID = '1RDxlAoOeQRKL';

console.log('🧪 直接测试（无需支付）\n');

async function testDirect() {
  try {
    // 1. 创建用户
    console.log('1️⃣ 创建测试用户...');
    const user = await getOrCreateUser(TEST_WALLET);
    console.log(`   ✅ 用户 ID: ${user.id}, 钱包: ${user.walletAddress}`);

    // 2. 创建 Space 记录
    console.log('\n2️⃣ 创建 Space 记录...');
    const space = await getOrCreateSpace(
      TEST_SPACE_ID,
      TEST_SPACE_URL,
      'Test Space - Direct Payment'
    );
    console.log(`   ✅ Space ID: ${space.id}, SpaceId: ${space.spaceId}`);
    console.log(`   📊 状态: ${space.status}`);

    // 3. 记录支付
    console.log('\n3️⃣ 记录测试支付...');
    const payment = await recordTranscriptionPayment(
      TEST_WALLET,
      TEST_SPACE_ID,
      'TEST_TX_' + Date.now()
    );
    console.log(`   ✅ 支付记录 ID: ${payment.paymentId}`);
    console.log(`   💰 金额: ${payment.amount} USDC`);

    // 4. 入队任务
    console.log('\n4️⃣ 入队转录任务...');
    const job = await queueJob(space.id, 0);
    console.log(`   ✅ 任务 ID: ${job.id}`);
    console.log(`   📋 状态: ${job.status}`);

    console.log('\n✅ 测试完成！\n');
    console.log('📊 后续步骤:');
    console.log('   1. Worker 会在 10 秒内检测到任务');
    console.log('   2. 查看 Worker 日志: tail -f logs/worker.log');
    console.log('   3. 查看数据库: bun run db:studio');
    console.log(`   4. Space 状态将变为: pending → processing → completed`);

    console.log('\n🔍 数据库查询:');
    console.log(`   Space: SELECT * FROM spaces WHERE spaceId = '${TEST_SPACE_ID}';`);
    console.log(`   Job: SELECT * FROM jobs WHERE spaceId = ${space.id};`);
    console.log(`   Payment: SELECT * FROM transcription_payments WHERE userId = ${user.id};`);

  } catch (error) {
    console.error('\n❌ 错误:', error);
    throw error;
  }
}

testDirect();
