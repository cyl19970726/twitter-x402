import { app } from "./agent-improved";

// Debug: Log environment variables on startup
console.log("=== Environment Variables Check ===");
console.log("PORT:", process.env.PORT);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Missing");
console.log("TWITTER_COOKIES:", process.env.TWITTER_COOKIES ? `✓ Set (length: ${process.env.TWITTER_COOKIES.length})` : "✗ Missing");
console.log("TWITTER_USERNAME:", process.env.TWITTER_USERNAME ? "✓ Set" : "✗ Missing");
console.log("TWITTER_PASSWORD:", process.env.TWITTER_PASSWORD ? "✓ Set" : "✗ Missing");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✓ Set" : "✗ Missing");
console.log("NETWORK:", process.env.NETWORK);
console.log("===================================");

const port = Number(process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(
  `🚀 Agent ready at http://${server.hostname}:${server.port}/.well-known/agent.json`
);
