// Vercel Serverless Function Entry Point
import { app } from '../src/agent-improved';

// Export the Hono app's fetch handler for Vercel
export default app.fetch;
