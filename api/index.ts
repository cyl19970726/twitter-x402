// Vercel Serverless Function Entry Point
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/agent-improved';

// Vercel handler - wraps the Hono app
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = `https://${req.headers.host}${req.url}`;
  const request = new Request(url, {
    method: req.method || 'GET',
    headers: req.headers as HeadersInit,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  try {
    const response = await app.fetch(request);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
