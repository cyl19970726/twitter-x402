/**
 * Free API Server (Dashboard APIs)
 *
 * Hono-based HTTP server for free dashboard data queries.
 * Separate from the paid agent-kit APIs.
 *
 * Routes:
 * - /api/spaces/* - Space queries
 * - /api/user/* - User stats and payments
 * - /health - Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import spacesRouter from './routes/spaces';
import userRouter from './routes/user';

const app = new Hono();

// Enable CORS for dashboard frontend
app.use('/*', cors({
  origin: '*', // TODO: Restrict to dashboard domain in production
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'twitter-space-dashboard-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/spaces', spacesRouter);
app.route('/api/user', userRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.path} not found`,
      availableRoutes: [
        '/health',
        '/api/spaces/mine',
        '/api/spaces/search',
        '/api/spaces/:spaceId',
        '/api/spaces/:spaceId/transcript',
        '/api/spaces/:spaceId/chat-status',
        '/api/spaces/popular',
        '/api/user/stats',
        '/api/user/payments',
      ],
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('[API] Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// Start server
const port = Number(process.env.API_PORT ?? 3001);

export default {
  port,
  fetch: app.fetch,
};
