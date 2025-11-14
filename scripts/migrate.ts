import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from '../src/db/client';

console.log('Running database migrations...');

try {
  migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('✅ Migrations completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
