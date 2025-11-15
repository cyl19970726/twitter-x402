/**
 * Unit Test: Chat Service
 */

import { describe, test, expect } from 'bun:test';
import { validateQuestion } from '../../src/services/chatService';

describe('Chat Service', () => {
  describe('validateQuestion', () => {
    test('should accept valid questions', () => {
      const questions = [
        'What is the main topic?',
        'Can you summarize the key points discussed?',
        'Who were the main speakers?',
        'a'.repeat(10), // Minimum length
        'a'.repeat(500), // Maximum length
      ];

      questions.forEach(q => {
        const result = validateQuestion(q);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject empty questions', () => {
      const result = validateQuestion('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    test('should reject whitespace-only questions', () => {
      const result = validateQuestion('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    test('should reject questions that are too short', () => {
      const result = validateQuestion('Hello');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    test('should reject questions that are too long', () => {
      const result = validateQuestion('a'.repeat(501));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('less than 500 characters');
    });

    test('should handle special characters', () => {
      const result = validateQuestion('What is AI? How does it work?');
      expect(result.valid).toBe(true);
    });

    test('should handle Unicode characters', () => {
      const result = validateQuestion('这个Space讨论了什么话题？');
      expect(result.valid).toBe(true);
    });
  });
});
