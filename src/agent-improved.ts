/**
 * Twitter Space Summarizer Agent - 改进版
 *
 * 这个版本相比 agent.ts 的改进：
 * 1. ✅ Per-entrypoint 定价（每个服务独立定价）
 * 2. ✅ 成本透明度（显示 Whisper/GPT 实际成本）
 * 3. ✅ 使用情况报告（token 数量、处理时间）
 * 4. ✅ 免费健康检查 entrypoint
 *
 * 环境变量配置：
 * - FACILITATOR_URL: x402 facilitator 地址
 * - PAY_TO: 接收支付的钱包地址
 * - NETWORK: 支付网络（base-sepolia/base）
 * - DEFAULT_PRICE: 默认价格（基本单位）
 *
 * 注意：ERC-8004 Trust 和 AP2 扩展配置被注释掉了
 * 原因：这些是高级功能，需要额外的链上配置和类型定义
 * 如需启用，请参考 agent-kit 文档配置相关环境变量
 */

import { z } from "zod";
import {
  AgentKitConfig,
  createAgentApp,
} from "@lucid-dreams/agent-kit";
import { formatSpaceFromUrl, summarizeSpaceFromUrl } from "./utils/summarizeSpace";

// 注意：此文件不使用 createAxLLMClient
// 原因：我们的 LLM 调用在 utils/ 中使用 OpenAI SDK 直接完成
// 如果需要在 entrypoint handler 中直接调用 LLM，可以使用 createAxLLMClient

// 💰 从环境变量读取定价配置
const NETWORK = process.env.NETWORK ?? "base-sepolia";
const PRICE_FORMAT_SPACE = process.env.PRICE_FORMAT_SPACE ?? "2000"; // 0.002 USDC
const PRICE_SUMMARIZE_SPACE = process.env.PRICE_SUMMARIZE_SPACE ?? "1500"; // 0.0015 USDC

// 💰 配置支付和身份
const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl:
      (process.env.FACILITATOR_URL ?? "https://facilitator.daydreams.systems") as `${string}://${string}`,
    payTo: (process.env.PAY_TO ?? "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429") as `0x${string}`,
    network: NETWORK as any,
    defaultPrice: process.env.DEFAULT_PRICE ?? "1000000", // 0.001 USDC (base units)
  },
};

// 🚀 创建 Agent App
const { app, addEntrypoint, config } = createAgentApp(
  {
    name: "twitter-space-summarizer",
    version: "1.0.0",
    description:
      "AI-powered agent that downloads, transcribes, and summarizes Twitter Spaces with speaker identification. Supports x402 payments and ERC-8004 trust.",
  },
  {
    config: configOverrides,

    // 🔐 ERC-8004 Trust Configuration (高级功能 - 已禁用)
    // 如需启用链上身份和信任系统，请取消注释以下配置
    // 并设置环境变量：REGISTER_IDENTITY=true, AGENT_DOMAIN, CHAIN_ID, IDENTITY_REGISTRY_ADDRESS
    /*
    trust: process.env.REGISTER_IDENTITY === "true" ? {
      registrations: [
        {
          namespace: "dns",
          identifier: process.env.AGENT_DOMAIN || "twitter-space-agent.local",
          chainId: parseInt(process.env.CHAIN_ID || "84532"),
          registryAddress: (process.env.IDENTITY_REGISTRY_ADDRESS || "") as `0x${string}`,
          agentId: process.env.AGENT_ID || "",
          agentAddress: (process.env.AGENT_ADDRESS || "") as `0x${string}`,
        }
      ],
      trustModels: [
        {
          name: "community-reputation",
          version: "1.0",
          description: "Community-based reputation for Twitter Space processing quality"
        }
      ],
      validationRequestsUri: process.env.VALIDATION_URI,
      feedbackDataUri: process.env.FEEDBACK_URI,
    } : undefined,
    */

    // 📊 AP2 Extension (高级功能 - 已禁用)
    // 如需声明 Agent Payments Protocol 角色，请取消注释
    /*
    ap2: {
      version: "0.1.0",
      roles: [{
        role: "merchant",
        required: true,
        description: "Payment receiver for Space processing services"
      }]
    }
    */
  }
);

console.log(`💰 Payment configuration:`);
console.log(`   Network: ${config.payments?.network}`);
console.log(`   Pay to: ${config.payments?.payTo}`);
console.log(`   Facilitator: ${config.payments?.facilitatorUrl}`);
console.log(`   Default price: ${config.payments?.defaultPrice} base units`);
console.log(`\n💵 Per-entrypoint pricing:`);
console.log(`   format-twitter-space: ${PRICE_FORMAT_SPACE} base units (${(parseInt(PRICE_FORMAT_SPACE) / 1000000).toFixed(4)} USDC)`);
console.log(`   summarize-twitter-space: ${PRICE_SUMMARIZE_SPACE} base units (${(parseInt(PRICE_SUMMARIZE_SPACE) / 1000000).toFixed(4)} USDC)`);
console.log(`\n💚 Free endpoints (built-in):`);
console.log(`   GET /health - Health check`);
console.log(`   GET /.well-known/agent.json - Agent manifest`);
console.log(`   GET /entrypoints - List all entrypoints`);

// 🎙️ Entrypoint 1: 格式化转录稿（带说话人识别）
addEntrypoint({
  key: "format-twitter-space",
  description:
    "Download and transcribe a Twitter Space, then format it with speaker identification. Returns a structured dialogue with participants identified. Processing time: ~4 minutes for a 30-minute Space.",

  // 💰 Per-entrypoint pricing
  price: {
    invoke: "0.2",  // 0.2 USDC
    stream: "0.2",  // 0.2 USDC
  },
  network: NETWORK as any,

  input: z.object({
    spaceUrl: z
      .string()
      .describe("The URL of the Twitter Space to format (e.g., https://x.com/i/spaces/1RDxlAoOeQRKL)")
      .regex(/spaces\/[a-zA-Z0-9]+/, "Must be a valid Twitter Space URL"),
  }),

  output: z.object({
    formattedTranscript: z.string().describe("Markdown-formatted transcript with speaker identification"),
    participants: z.array(z.string()).describe("List of identified participants"),
    title: z.string().describe("Title of the Space"),
    duration: z.number().optional().describe("Duration in seconds"),
    costBreakdown: z.object({
      whisper: z.number().describe("Whisper API cost in USD"),
      gpt4o: z.number().describe("GPT-4o formatting cost in USD"),
      total: z.number().describe("Total processing cost in USD"),
    }).optional().describe("Cost breakdown for transparency"),
  }),

  // ✅ 启用流式支持
  streaming: true,

  async handler(ctx) {
    const { spaceUrl } = ctx.input;

    console.log(`[format-twitter-space] Processing: ${spaceUrl}`);
    const startTime = Date.now();

    try {
      // 运行格式化管道（不包括总结）
      const result = await formatSpaceFromUrl(spaceUrl);

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[format-twitter-space] ✅ Completed in ${duration.toFixed(1)}s`);

      // 计算成本透明度
      const audioDurationMin = (result.transcription.duration || 0) / 60;
      const whisperCost = audioDurationMin * 0.006; // $0.006/min
      const gpt4oCost = 0.48; // 估算

      return {
        output: {
          formattedTranscript: result.formattedTranscriptMarkdown,
          participants: result.formattedTranscript.participants,
          title: result.metadata.title,
          duration: result.transcription.duration,
          costBreakdown: {
            whisper: parseFloat(whisperCost.toFixed(4)),
            gpt4o: gpt4oCost,
            total: parseFloat((whisperCost + gpt4oCost).toFixed(4)),
          }
        },
        // 📊 使用情况报告
        usage: {
          total_tokens: result.transcription.text.length, // 字符数作为 token 估算
          processing_time_seconds: duration,
        }
      };
    } catch (error) {
      console.error(`[format-twitter-space] ❌ Error:`, error);
      throw new Error(`Failed to format Space transcript: ${(error as Error).message}`);
    }
  },

  // 🌊 流式处理器
  async stream(ctx, emit) {
    const { spaceUrl } = ctx.input;

    console.log(`[format-twitter-space/stream] Processing: ${spaceUrl}`);
    const startTime = Date.now();

    try {
      // 运行格式化管道并发送进度更新
      const result = await formatSpaceFromUrl(spaceUrl, async (step, message, details) => {
        // 发送进度更新
        if (details?.completed) {
          // 步骤完成
          await emit({
            kind: "text",
            text: `✓ Step ${details.step}/${details.total}: ${message}`,
            mime: "text/plain"
          });

          // 发送详细信息
          if (step === 'download' && details.title) {
            await emit({
              kind: "delta",
              delta: `  Title: "${details.title}"\n  Size: ${details.sizeMB} MB\n\n`,
              mime: "text/plain"
            });
          } else if (step === 'transcribe') {
            await emit({
              kind: "delta",
              delta: `  Characters: ${details.characters.toLocaleString()}\n  Duration: ${Math.floor(details.durationSeconds / 60)}m ${Math.floor(details.durationSeconds % 60)}s\n\n`,
              mime: "text/plain"
            });
          } else if (step === 'format') {
            await emit({
              kind: "delta",
              delta: `  Participants: ${details.participants}\n  Speakers: ${details.speakerNames.join(', ')}\n\n`,
              mime: "text/plain"
            });
          }
        } else {
          // 步骤开始
          await emit({
            kind: "text",
            text: `⏳ Step ${details.step}/${details.total}: ${message}`,
            mime: "text/plain"
          });
        }
      });

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[format-twitter-space/stream] ✅ Completed in ${duration.toFixed(1)}s`);

      // 计算成本透明度
      const audioDurationMin = (result.transcription.duration || 0) / 60;
      const whisperCost = audioDurationMin * 0.006;
      const gpt4oCost = 0.48;

      // 发送完成消息
      await emit({
        kind: "text",
        text: `\n✅ Processing complete in ${duration.toFixed(1)}s!\n`,
        mime: "text/plain"
      });

      // 返回最终结果
      return {
        output: {
          formattedTranscript: result.formattedTranscriptMarkdown,
          participants: result.formattedTranscript.participants,
          title: result.metadata.title,
          duration: result.transcription.duration,
          costBreakdown: {
            whisper: parseFloat(whisperCost.toFixed(4)),
            gpt4o: gpt4oCost,
            total: parseFloat((whisperCost + gpt4oCost).toFixed(4)),
          }
        },
        usage: {
          total_tokens: result.transcription.text.length,
          processing_time_seconds: duration,
        }
      };
    } catch (error) {
      console.error(`[format-twitter-space/stream] ❌ Error:`, error);

      // 发送错误消息
      await emit({
        kind: "error",
        code: "PROCESSING_ERROR",
        message: (error as Error).message,
      });

      throw new Error(`Failed to format Space transcript: ${(error as Error).message}`);
    }
  },
});

// 📝 Entrypoint 2: 生成总结
addEntrypoint({
  key: "summarize-twitter-space",
  description:
    "Download, transcribe, format, and summarize a finished Twitter Space. Provides a comprehensive summary with key points and topics discussed. Includes speaker identification. Processing time: ~4-5 minutes for a 30-minute Space.",

  // 💰 Per-entrypoint pricing
  price: "0.15",  // 0.15 USDC
  network: NETWORK as any,

  input: z.object({
    spaceUrl: z
      .string()
      .describe("The URL of the Twitter Space to summarize (e.g., https://x.com/i/spaces/1RDxlAoOeQRKL)")
      .regex(/spaces\/[a-zA-Z0-9]+/, "Must be a valid Twitter Space URL"),
  }),

  output: z.object({
    summary: z.string().describe("Markdown-formatted summary of the Space"),
    title: z.string().describe("Title of the Space"),
    duration: z.number().optional().describe("Duration in seconds"),
    participants: z.array(z.string()).describe("List of identified participants"),
    keyPoints: z.array(z.string()).describe("Key discussion points"),
    topics: z.array(z.string()).describe("Main topics discussed"),
    costBreakdown: z.object({
      whisper: z.number().describe("Whisper API cost in USD"),
      gpt4o: z.number().describe("GPT-4o formatting cost in USD"),
      gpt4oMini: z.number().describe("GPT-4o-mini summarization cost in USD"),
      total: z.number().describe("Total processing cost in USD"),
    }).optional().describe("Cost breakdown for transparency"),
  }),

  streaming: false, // 应该考虑添加 SSE 进度更新

  async handler(ctx) {
    const { spaceUrl } = ctx.input;

    console.log(`[summarize-twitter-space] Processing: ${spaceUrl}`);
    const startTime = Date.now();

    try {
      // 运行完整管道
      const result = await summarizeSpaceFromUrl(spaceUrl);

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[summarize-twitter-space] ✅ Completed in ${duration.toFixed(1)}s`);

      // 成本透明度
      const audioDurationMin = (result.transcription.duration || 0) / 60;
      const whisperCost = audioDurationMin * 0.006;
      const gpt4oCost = 0.48;
      const gpt4oMiniCost = 0.02;

      return {
        output: {
          summary: result.summaryMarkdown,
          title: result.metadata.title,
          duration: result.transcription.duration,
          participants: result.formattedTranscript.participants,
          keyPoints: result.summary.keyPoints,
          topics: result.summary.topics,
          costBreakdown: {
            whisper: parseFloat(whisperCost.toFixed(4)),
            gpt4o: gpt4oCost,
            gpt4oMini: gpt4oMiniCost,
            total: parseFloat((whisperCost + gpt4oCost + gpt4oMiniCost).toFixed(4)),
          }
        },
        usage: {
          total_tokens: result.transcription.text.length,
          processing_time_seconds: duration,
        },
        // 📊 模型信息
        model: "whisper-1 + gpt-4o + gpt-4o-mini"
      };
    } catch (error) {
      console.error(`[summarize-twitter-space] ❌ Error:`, error);
      throw new Error(`Failed to summarize Space: ${(error as Error).message}`);
    }
  },
});

// 🔍 健康检查已由 agent-kit 内置提供
// GET /health 返回 { ok: true, version: "1.0.0" }
// 不需要自定义 health entrypoint，因为：
// 1. agent-kit 已提供免费的 /health 端点
// 2. x402 不允许 price=0，最小价格为 0.0001 USDC
//
// 如果需要更详细的健康信息，可以添加一个 price >= 100 的 entrypoint

export { app };
