/**
 * Integration Test: HTTP API
 *
 * Tests the free API endpoints
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { app } from '../../src/api/server';
import { getOrCreateUser } from '../../src/db/queries/users';
import { getOrCreateSpace } from '../../src/db/queries/spaces';
import { recordTranscriptionPayment } from '../../src/services/paymentService';

describe('HTTP API', () => {
  const testWallet = '0xAPITEST789';
  const testSpaceId = 'API_TEST_' + Date.now();
  let authParams: URLSearchParams;

  beforeAll(async () => {
    // Setup test data
    await getOrCreateUser(testWallet);

    const space = await getOrCreateSpace(
      testSpaceId,
      `https://twitter.com/i/spaces/${testSpaceId}`,
      'API Test Space'
    );

    await recordTranscriptionPayment(testWallet, testSpaceId, 'TEST_API_TX');

    // Mock auth params (in production, this would be signed)
    authParams = new URLSearchParams({
      wallet: testWallet,
      signature: 'MOCK_SIGNATURE',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    });
  });

  test('GET /health should return OK', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('GET /api/user/stats should return user statistics', async () => {
    const response = await app.request(`/api/user/stats?${authParams}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.stats).toBeDefined();
    expect(data.stats.spacesOwned).toBeGreaterThanOrEqual(0);
    expect(data.stats.transcriptionsPurchased).toBeGreaterThanOrEqual(0);
  });

  test('GET /api/spaces/mine should return user spaces', async () => {
    const response = await app.request(`/api/spaces/mine?${authParams}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.spaces).toBeDefined();
    expect(Array.isArray(data.spaces)).toBe(true);
  });

  test('GET /api/spaces/:spaceId should return space details', async () => {
    const response = await app.request(`/api/spaces/${testSpaceId}?${authParams}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.space).toBeDefined();
    expect(data.space.spaceId).toBe(testSpaceId);
  });

  test('GET /api/spaces/search should search spaces', async () => {
    const searchParams = new URLSearchParams(authParams);
    searchParams.append('q', 'Test');

    const response = await app.request(`/api/spaces/search?${searchParams}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
  });

  test('GET /api/spaces/popular should return popular spaces', async () => {
    const response = await app.request(`/api/spaces/popular?${authParams}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.spaces).toBeDefined();
    expect(Array.isArray(data.spaces)).toBe(true);
  });

  test('should reject requests without auth', async () => {
    const response = await app.request('/api/spaces/mine');
    expect(response.status).toBe(401);
  });

  test('should reject requests with expired timestamp', async () => {
    const expiredParams = new URLSearchParams({
      wallet: testWallet,
      signature: 'MOCK_SIGNATURE',
      timestamp: (Math.floor(Date.now() / 1000) - 400).toString(), // 400 seconds ago
    });

    const response = await app.request(`/api/spaces/mine?${expiredParams}`);
    expect(response.status).toBe(401);
  });
});
