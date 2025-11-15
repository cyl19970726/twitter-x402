import { paymentMiddleware, Network } from 'x402-next';
import type { Address } from 'viem';

if (!process.env.PAY_TO_ADDRESS) {
  throw new Error('PAY_TO_ADDRESS environment variable is required');
}

if (!process.env.FACILITATOR_URL) {
  throw new Error('FACILITATOR_URL environment variable is required');
}

export const middleware = paymentMiddleware(
  process.env.PAY_TO_ADDRESS as Address,
  {
    '/api/transcribe': {
      price: '$0.20',
      network: 'base' as Network,
      config: {
        description: 'Transcribe Twitter Space',
      },
    },
    '/api/chat': {
      price: '$0.50',
      network: 'base' as Network,
      config: {
        description: 'AI Chat with Space',
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL,
  },
  {
    appName: 'Twitter Space Transcription',
    appLogo: '/logo.png',
  }
);

export const config = {
  matcher: ['/api/transcribe', '/api/chat'],
};
