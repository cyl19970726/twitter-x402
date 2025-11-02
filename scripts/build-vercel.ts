#!/usr/bin/env bun
/**
 * Build script for Vercel deployment
 * Bundles all source code into a single api/index.js file
 */

import { $ } from 'bun';

console.log('🔨 Building for Vercel deployment...\n');

// Build command: bundle everything into one file
await $`bun build api/index.ts \
  --outfile api/index.js \
  --target node \
  --format esm \
  --minify \
  --external @vercel/node`;

console.log('✅ Build complete: api/index.js');

// Show file size
const stat = await Bun.file('api/index.js').stat();
const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
console.log(`📦 Bundle size: ${sizeMB} MB\n`);
