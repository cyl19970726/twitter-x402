import { useWalletClient } from 'wagmi';
import { useCallback, useState } from 'react';
import { wrapFetchWithPayment, createSigner } from 'x402-fetch';
import type { Network } from 'x402-fetch';

const NETWORK: Network = (import.meta.env.VITE_NETWORK || 'base') as Network;

export function usePayment() {
  const { data: walletClient } = useWalletClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const invokeEntrypoint = useCallback(
    async (entrypointKey: string, params: any) => {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      try {
        // Create x402 signer
        const signer = await createSigner(NETWORK, walletClient);
        const fetchWithPayment = wrapFetchWithPayment(fetch, signer);

        // Make payment request
        const response = await fetchWithPayment(
          `/entrypoints/${entrypointKey}/invoke`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Payment failed');
        }

        const result = await response.json();
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [walletClient]
  );

  return {
    invokeEntrypoint,
    isProcessing,
    isReady: !!walletClient,
  };
}
