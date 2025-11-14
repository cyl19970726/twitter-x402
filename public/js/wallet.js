/**
 * Wallet Connection Module
 * Handles MetaMask/wallet connection and signing
 */

class WalletManager {
  constructor() {
    this.connected = false;
    this.address = null;
    this.provider = null;
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask
   */
  async connect() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      this.address = accounts[0];
      this.connected = true;
      this.provider = window.ethereum;

      console.log('Wallet connected:', this.address);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          window.location.reload();
        }
      });

      return this.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    this.connected = false;
    this.address = null;
    this.provider = null;
    window.location.reload();
  }

  /**
   * Sign a message for authentication
   */
  async signMessage(message) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.address],
      });

      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Create authentication parameters for API requests
   */
  async getAuthParams() {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = `Sign in to Twitter Space Dashboard\nTimestamp: ${timestamp}`;
    const signature = await this.signMessage(message);

    return {
      wallet: this.address,
      signature,
      message,
      timestamp: timestamp.toString(),
    };
  }

  /**
   * Format address for display
   */
  formatAddress(address = this.address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

// Export singleton instance
const walletManager = new WalletManager();
