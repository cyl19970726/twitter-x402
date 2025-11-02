// Vercel Serverless Function Entry Point
import { app } from '../src/agent-improved';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel expects a default export function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert Vercel request to standard Request
  const url = `https://${req.headers.host}${req.url}`;
  const request = new Request(url, {
    method: req.method || 'GET',
    headers: req.headers as HeadersInit,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  try {
    // Call Hono app's fetch handler
    const response = await app.fetch(request);

    // Convert Response to Vercel response
    res.status(response.status);

    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
