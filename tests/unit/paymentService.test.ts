/**
 * Unit Test: Payment Service
 */

import { describe, test, expect } from 'bun:test';
import { calculateChatPrice } from '../../src/services/paymentService';

describe('Payment Service', () => {
  describe('calculateChatPrice', () => {
    test('should calculate price for single space', () => {
      const price = calculateChatPrice(1);
      expect(price).toBe('0.90');
    });

    test('should calculate price for multiple spaces', () => {
      expect(calculateChatPrice(2)).toBe('1.00'); // 0.9 + 0.1
      expect(calculateChatPrice(3)).toBe('1.10'); // 0.9 + 0.2
      expect(calculateChatPrice(5)).toBe('1.30'); // 0.9 + 0.4
      expect(calculateChatPrice(10)).toBe('1.80'); // 0.9 + 0.9
    });

    test('should handle edge cases', () => {
      expect(calculateChatPrice(0)).toBe('0.90'); // Min 0.9
      expect(calculateChatPrice(-1)).toBe('0.90'); // Negative defaults to base
    });

    test('should return string with 2 decimal places', () => {
      const prices = [
        calculateChatPrice(1),
        calculateChatPrice(2),
        calculateChatPrice(10),
      ];

      prices.forEach(price => {
        expect(price).toMatch(/^\d+\.\d{2}$/);
      });
    });
  });
});
