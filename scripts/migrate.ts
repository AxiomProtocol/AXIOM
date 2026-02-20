/**
 * Programmatic migration runner.
 * Applies all pending Drizzle SQL migrations in ./migrations to the configured
 * DATABASE_URL. Safe to run multiple times — drizzle-orm tracks applied
 * migrations in the `drizzle.__drizzle_migrations` table.
 *
 * Usage:  npm run db:migrate
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[migrate] DATABASE_URL is not set — cannot run migrations');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? true : undefined,
    max: 1,
  });

  const db = drizzle(pool);

  console.log('[migrate] Applying pending migrations…');
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'migrations'),
  });
  console.log('[migrate] All migrations applied successfully.');

  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
