import { useAccount, useWalletClient } from 'wagmi';
import { useCallback } from 'react';

export interface AuthParams {
  wallet: string;
  signature: string;
  message: string;
  timestamp: string;
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const getAuthParams = useCallback(async (): Promise<AuthParams> => {
    if (!address || !isConnected || !walletClient) {
      throw new Error('Wallet not connected');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `Sign in to Twitter Space Dashboard\nTimestamp: ${timestamp}`;

    try {
      // Use walletClient directly instead of signMessageAsync
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      return {
        wallet: address,
        signature,
        message,
        timestamp: timestamp.toString(),
      };
    } catch (error) {
      console.error('Sign message error:', error);
      throw error;
    }
  }, [address, isConnected, walletClient]);

  return {
    address,
    isConnected,
    getAuthParams,
  };
}
