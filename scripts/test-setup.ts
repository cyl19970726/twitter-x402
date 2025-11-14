#!/usr/bin/env bun

/**
 * 测试环境检查脚本
 */

import { db } from '../src/db/client';
import { spaces, users } from '../src/db/schema';

console.log('🔍 检查测试环境...\n');

try {
  // 1. 检查数据库连接
  console.log('1️⃣ 检查数据库连接...');
  const result = await db.select().from(spaces).limit(1);
  console.log('   ✅ 数据库连接正常');
  console.log(`   📊 当前 Spaces 数量: ${(await db.select().from(spaces)).length}`);

  // 2. 检查环境变量
  console.log('\n2️⃣ 检查环境变量...');
  const requiredVars = ['PRIVATE_KEY', 'OPENAI_API_KEY', 'TWITTER_COOKIES'];
  const optionalVars = ['DATABASE_URL', 'API_PORT', 'PORT'];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: 已配置`);
    } else {
      console.log(`   ❌ ${varName}: 未配置（必需）`);
    }
  }

  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: ${process.env[varName]}`);
    } else {
      console.log(`   ℹ️  ${varName}: 使用默认值`);
    }
  }

  // 3. 检查端口可用性
  console.log('\n3️⃣ 检查端口状态...');
  const agentPort = process.env.PORT || '8787';
  const apiPort = process.env.API_PORT || '3001';
  console.log(`   📡 Agent 端口: ${agentPort}`);
  console.log(`   📡 API 端口: ${apiPort}`);

  // 4. 总结
  console.log('\n✅ 环境检查完成！\n');
  console.log('📝 启动步骤：');
  console.log('');
  console.log('   终端 1: bun run dev              # 启动 Agent (x402)');
  console.log('   终端 2: bun run src/api/server.ts # 启动 API Server');
  console.log('   终端 3: bun run worker            # 启动 Worker');
  console.log('');
  console.log('🧪 测试命令：');
  console.log('');
  console.log('   bun test:unit                     # 运行单元测试');
  console.log('   curl http://localhost:8787/.well-known/agent.json');
  console.log('   curl http://localhost:3001/health');
  console.log('');

} catch (error) {
  console.error('❌ 错误:', error);
  console.log('\n💡 提示: 请先运行 `bun run scripts/migrate.ts` 初始化数据库');
  process.exit(1);
}
