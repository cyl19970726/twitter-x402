import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import * as path from 'path';
import * as fs from 'fs';

// Get database path from environment or use default
const dbPath = process.env.DATABASE_URL || './data/database/spaces.db';

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database connection with Bun's native SQLite
const sqlite = new Database(dbPath, { create: true });

// Enable WAL mode for better concurrent access
sqlite.run('PRAGMA journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

console.log(`✓ Database connected: ${dbPath}`);
