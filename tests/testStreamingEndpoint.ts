/**
 * 测试 format-twitter-space 的流式端点
 *
 * 需要的环境变量:
 * - PRIVATE_KEY: 支付签名的私钥 (0x...)
 * - RESOURCE_SERVER_URL: Agent 服务器地址 (例如: http://localhost:8787)
 * - TEST_SPACE_URL: 要测试的 Twitter Space URL (可选，有默认值)
 *
 * 运行方式:
 * ```bash
 * # 1. 确保 .env 文件中配置了必需的环境变量
 * # 2. 启动 agent 服务器: bun run src/index.ts
 * # 3. 在另一个终端运行测试:
 * bun run tests/testStreamingEndpoint.ts
 * ```
 */

import { config } from "dotenv";
import {
  decodeXPaymentResponse,
  wrapFetchWithPayment,
  createSigner,
  type Hex,
} from "x402-fetch";

// 加载 .env.test 文件（覆盖已有的环境变量）
config({ path: '.env.test', override: true });

// 从环境变量读取配置
const privateKey = process.env.PRIVATE_KEY as Hex | string;

// 调试: 显示实际加载的私钥
console.log('DEBUG: Loaded private key starts with:', privateKey?.substring(0, 20));
const baseURL = process.env.RESOURCE_SERVER_URL || "http://localhost:8787";
const testSpaceUrl = process.env.TEST_SPACE_URL || "https://x.com/i/spaces/1RDxlAoOeQRKL";

// 流式端点路径
const streamEndpointPath = "/entrypoints/format-twitter-space/stream";
const streamUrl = `${baseURL}${streamEndpointPath}`;

// 非流式端点路径（用于对比）
const invokeEndpointPath = "/entrypoints/format-twitter-space/invoke";
const invokeUrl = `${baseURL}${invokeEndpointPath}`;

/**
 * 验证必需的环境变量
 */
function validateEnv(): void {
  if (!privateKey) {
    console.error("❌ 错误: 缺少 PRIVATE_KEY 环境变量");
    console.error("\n请在 .env 文件中配置:");
    console.error("PRIVATE_KEY=0x...");
    process.exit(1);
  }

  console.log("✅ 环境变量配置:");
  console.log(`   PRIVATE_KEY: ${privateKey.substring(0, 10)}...`);
  console.log(`   RESOURCE_SERVER_URL: ${baseURL}`);
  console.log(`   TEST_SPACE_URL: ${testSpaceUrl}`);
  console.log();
}

/**
 * 解析 SSE (Server-Sent Events) 流
 */
async function parseSSEStream(response: Response): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  console.log("\n📡 开始接收流式数据...\n");
  console.log("=".repeat(60));

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.substring(7).trim();
        } else if (line.startsWith("data: ")) {
          const dataStr = line.substring(6);

          try {
            const data = JSON.parse(dataStr);

            if (currentEvent === "text") {
              // 进度消息
              console.log(`\n${data.text}`);
            } else if (currentEvent === "delta") {
              // 详细信息
              process.stdout.write(data.delta);
            } else if (currentEvent === "run-start") {
              console.log(`\n🚀 Run started: ${data.run_id}`);
            } else if (currentEvent === "run-end") {
              console.log("\n" + "=".repeat(60));
              console.log("\n✅ 处理完成!\n");
              console.log("📊 最终结果:");
              console.log(`   Run ID: ${data.run_id}`);
              console.log(`   Status: ${data.status}`);
              console.log(`   Title: ${data.output.title}`);
              console.log(`   Duration: ${data.output.duration?.toFixed(1)}s`);
              console.log(`   Participants: ${data.output.participants.length}`);
              console.log(`   Speakers: ${data.output.participants.join(', ')}`);
              console.log(`\n💰 成本估算:`);
              console.log(`   Whisper API: $${data.output.costBreakdown.whisper}`);
              console.log(`   GPT-4o: $${data.output.costBreakdown.gpt4o}`);
              console.log(`   Total: $${data.output.costBreakdown.total}`);
              console.log(`\n⏱️  处理时间: ${data.usage.processing_time_seconds.toFixed(1)}s`);
              console.log(`📝 输出字符数: ${data.output.formattedTranscript.length.toLocaleString()}`);
            } else if (currentEvent === "error") {
              console.error(`\n❌ 错误: [${data.code}] ${data.message}`);
            } else if (currentEvent === "control") {
              console.log(`\n⚙️  Control: ${data.action}`);
            }
          } catch (parseError) {
            console.error(`\n⚠️  JSON 解析错误:`, dataStr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * 测试流式端点
 */
async function testStreamEndpoint(): Promise<void> {
  console.log("\n🧪 测试 1: 流式端点 (SSE)\n");
  console.log("Endpoint:", streamUrl);
  console.log("Space URL:", testSpaceUrl);

  const signer = await createSigner("base", privateKey);
  console.log('\nDEBUG: Signer address:', signer.account.address);
  console.log('DEBUG: Expected address: 0x6799567aa32f07c29fd98a251863aa441c68732b\n');

  // 设置 maxValue 为 1 USDC (1,000,000 基本单位)，以支持最高 1 USDC 的支付
  const maxValue = BigInt(1 * 10 ** 6); // 1 USDC = 1,000,000 基本单位
  const fetchWithPayment = wrapFetchWithPayment(fetch, signer, maxValue);

  const startTime = Date.now();

  const response = await fetchWithPayment(streamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        spaceUrl: testSpaceUrl,
      }
    }),
  });

  // if (!response.ok) {
  //   const errorText = await response.text();
  //   throw new Error(`HTTP ${response.status}: ${errorText}`);
  // }

  // 检查支付响应
  const paymentResponse = response.headers.get("x-payment-response");
  if (paymentResponse) {
    const decoded = decodeXPaymentResponse(paymentResponse);
    console.log("\n💳 支付信息:");
    console.log(`   Transaction: ${decoded.txHash || 'pending'}`);
    console.log(`   Amount: ${decoded.amount}`);
    console.log();
  }

  // 解析 SSE 流
  await parseSSEStream(response);

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n⏱️  总耗时: ${duration.toFixed(1)}s\n`);
}

/**
 * 测试非流式端点（用于对比）
 */
async function testInvokeEndpoint(): Promise<void> {
  console.log("\n🧪 测试 2: 非流式端点 (JSON)\n");
  console.log("Endpoint:", invokeUrl);
  console.log("Space URL:", testSpaceUrl);

  const signer = await createSigner("base", privateKey);
  // 设置 maxValue 为 1 USDC (1,000,000 基本单位)，以支持最高 1 USDC 的支付
  const maxValue = BigInt(1 * 10 ** 6); // 1 USDC = 1,000,000 基本单位
  const fetchWithPayment = wrapFetchWithPayment(fetch, signer, maxValue);

  const startTime = Date.now();

  console.log("\n⏳ 等待处理完成（无进度更新）...\n");

  const response = await fetchWithPayment(invokeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        spaceUrl: testSpaceUrl,
      }
    }),
  });

  // if (!response.ok) {
  //   const errorText = await response.text();
  //   throw new Error(`HTTP ${response.status}: ${errorText}`);
  // }

  const result = await response.json();
  const duration = (Date.now() - startTime) / 1000;

  console.log("=".repeat(60));
  console.log("\n✅ 处理完成!\n");
  console.log("📊 结果:");
  console.log(`   Run ID: ${result.run_id}`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Title: ${result.output.title}`);
  console.log(`   Duration: ${result.output.duration?.toFixed(1)}s`);
  console.log(`   Participants: ${result.output.participants.length}`);
  console.log(`   Speakers: ${result.output.participants.join(', ')}`);
  console.log(`\n💰 成本估算:`);
  console.log(`   Whisper API: $${result.output.costBreakdown.whisper}`);
  console.log(`   GPT-4o: $${result.output.costBreakdown.gpt4o}`);
  console.log(`   Total: $${result.output.costBreakdown.total}`);
  console.log(`\n⏱️  处理时间: ${result.usage.processing_time_seconds.toFixed(1)}s`);
  console.log(`   总耗时: ${duration.toFixed(1)}s`);

  // 检查支付响应
  const paymentResponse = response.headers.get("x-payment-response");
  if (paymentResponse) {
    const decoded = decodeXPaymentResponse(paymentResponse);
    console.log("\n💳 支付信息:");
    console.log(`   Transaction: ${decoded.txHash || 'pending'}`);
    console.log(`   Amount: ${decoded.amount}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 Twitter Space 流式 API 测试");
  console.log("=".repeat(60));

  validateEnv();

  // 询问用户要测试哪个端点
  const testMode = process.argv[2] || "stream";

  if (testMode === "stream") {
    await testStreamEndpoint();
  } else if (testMode === "invoke") {
    await testInvokeEndpoint();
  } else if (testMode === "both") {
    await testStreamEndpoint();
    console.log("\n" + "━".repeat(60) + "\n");
    await testInvokeEndpoint();
  } else {
    console.error("❌ 未知的测试模式:", testMode);
    console.error("\n使用方式:");
    console.error("  bun run tests/testStreamingEndpoint.ts [stream|invoke|both]");
    console.error("\n示例:");
    console.error("  bun run tests/testStreamingEndpoint.ts stream   # 测试流式端点（默认）");
    console.error("  bun run tests/testStreamingEndpoint.ts invoke   # 测试非流式端点");
    console.error("  bun run tests/testStreamingEndpoint.ts both     # 两个都测试");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ 测试失败:");
  console.error(error?.response?.data?.error ?? error);
  process.exit(1);
});
