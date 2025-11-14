/**
 * API Client Module
 * Handles all API requests to the backend
 */

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || 'http://localhost:3001'; // Dashboard API port
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const authParams = await walletManager.getAuthParams();

    // Build URL with auth query params
    const url = new URL(endpoint, this.baseURL);
    Object.keys(authParams).forEach(key => {
      url.searchParams.append(key, authParams[key]);
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  /**
   * Get user's spaces
   */
  async getMySpaces(limit = 50, offset = 0) {
    return this.request(`/api/spaces/mine?limit=${limit}&offset=${offset}`);
  }

  /**
   * Search spaces
   */
  async searchSpaces(query) {
    return this.request(`/api/spaces/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Get space details
   */
  async getSpace(spaceId) {
    return this.request(`/api/spaces/${spaceId}`);
  }

  /**
   * Get space transcript
   */
  async getTranscript(spaceId) {
    return this.request(`/api/spaces/${spaceId}/transcript`);
  }

  /**
   * Check chat status
   */
  async getChatStatus(spaceId) {
    return this.request(`/api/spaces/${spaceId}/chat-status`);
  }

  /**
   * Get popular spaces
   */
  async getPopularSpaces(limit = 10) {
    const url = new URL('/api/spaces/popular', this.baseURL);
    url.searchParams.append('limit', limit);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch popular spaces');
    }

    return response.json();
  }

  /**
   * Get user stats
   */
  async getUserStats() {
    return this.request('/api/user/stats');
  }

  /**
   * Get payment history
   */
  async getPaymentHistory() {
    return this.request('/api/user/payments');
  }
}

// Export singleton instance
const apiClient = new APIClient();
