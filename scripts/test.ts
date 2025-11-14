#!/usr/bin/env bun

/**
 * Test Runner
 *
 * Runs all tests with proper setup and teardown.
 */

import { $ } from 'bun';

console.log('🧪 Running tests...\n');

try {
  // Run unit tests
  console.log('📦 Running unit tests...');
  await $`bun test tests/unit/**/*.test.ts`;

  console.log('\n✅ Unit tests passed!\n');

  // Run integration tests
  console.log('🔗 Running integration tests...');
  await $`bun test tests/integration/**/*.test.ts`;

  console.log('\n✅ Integration tests passed!\n');

  console.log('🎉 All tests passed!');
} catch (error) {
  console.error('❌ Tests failed:', error);
  process.exit(1);
}
