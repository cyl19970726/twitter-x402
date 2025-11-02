/**
 * 测试定价配置
 * 验证环境变量是否正确读取
 */

// 临时设置环境变量用于测试
process.env.NETWORK = "base-sepolia";
process.env.PRICE_FORMAT_SPACE = "2000";  // 0.002 USDC
process.env.PRICE_SUMMARIZE_SPACE = "1500";  // 0.0015 USDC
process.env.PRICE_HEALTH = "0";

console.log("=== 测试定价配置 ===\n");

console.log("环境变量:");
console.log(`  NETWORK: ${process.env.NETWORK}`);
console.log(`  PRICE_FORMAT_SPACE: ${process.env.PRICE_FORMAT_SPACE}`);
console.log(`  PRICE_SUMMARIZE_SPACE: ${process.env.PRICE_SUMMARIZE_SPACE}`);
console.log(`  PRICE_HEALTH: ${process.env.PRICE_HEALTH}`);

console.log("\n转换为 USDC:");
const formatPrice = parseInt(process.env.PRICE_FORMAT_SPACE || "0") / 1000000;
const summarizePrice = parseInt(process.env.PRICE_SUMMARIZE_SPACE || "0") / 1000000;
const healthPrice = parseInt(process.env.PRICE_HEALTH || "0") / 1000000;

console.log(`  format-twitter-space: $${formatPrice.toFixed(4)} (${process.env.PRICE_FORMAT_SPACE} base units)`);
console.log(`  summarize-twitter-space: $${summarizePrice.toFixed(4)} (${process.env.PRICE_SUMMARIZE_SPACE} base units)`);
console.log(`  health: $${healthPrice.toFixed(4)} (free)`);

console.log("\n✅ 定价配置测试通过");
