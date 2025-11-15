import type { AuthParams } from '../hooks/useAuth';

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '';
  }

  private async request(endpoint: string, authParams: AuthParams, options: RequestInit = {}) {
    const url = new URL(endpoint, this.baseURL || window.location.origin);

    // Add auth params to URL
    Object.entries(authParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getMySpaces(authParams: AuthParams, limit = 50, offset = 0) {
    return this.request(`/api/spaces/mine?limit=${limit}&offset=${offset}`, authParams);
  }

  async searchSpaces(authParams: AuthParams, query: string) {
    return this.request(`/api/spaces/search?q=${encodeURIComponent(query)}`, authParams);
  }

  async getSpace(authParams: AuthParams, spaceId: string) {
    return this.request(`/api/spaces/${spaceId}`, authParams);
  }

  async getUserStats(authParams: AuthParams) {
    return this.request('/api/user/stats', authParams);
  }

  async getPaymentHistory(authParams: AuthParams) {
    return this.request('/api/user/payments', authParams);
  }
}

export const apiClient = new APIClient();
