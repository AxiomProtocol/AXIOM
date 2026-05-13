/**
 * Programmatic migration runner.
 * Applies all pending Drizzle SQL migrations in ./migrations to the configured
 * DATABASE_URL. Safe to run multiple times — drizzle-orm tracks applied
 * migrations in the `drizzle.__drizzle_migrations` table.
 *
 * Usage:  npm run db:migrate
 *
 * Safety guard: When NODE_ENV=test this script requires TEST_DATABASE_URL to be
 * set and will REFUSE to read DATABASE_URL. This prevents accidental migration
 * of production or staging databases during test runs.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const HANDWRITTEN_MIGRATIONS_DIR = path.join(
  process.cwd(),
  'drizzle',
  'migrations',
);

export async function applyHandwrittenMigrations(
  pool: Pool,
  migrationsDir: string = HANDWRITTEN_MIGRATIONS_DIR,
): Promise<void> {
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS handwritten_migrations (
      filename     text PRIMARY KEY,
      checksum     text NOT NULL,
      applied_at   timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query<{ filename: string }>(
    'SELECT filename FROM handwritten_migrations',
  );
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    console.log(`[migrate] Applying handwritten migration ${file}…`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO handwritten_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        [file, checksum],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(
        `Failed to apply handwritten migration ${file}: ${(err as Error).message}`,
      );
    } finally {
      client.release();
    }
  }
}

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? true : undefined,
    max: 1,
  });

  try {
    const db = drizzle(pool);
    console.log('[migrate] Applying pending Drizzle migrations…');
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'migrations'),
    });
    console.log('[migrate] Applying pending handwritten migrations…');
    await applyHandwrittenMigrations(pool);
    console.log('[migrate] All migrations applied successfully.');
  } finally {
    await pool.end();
  }
}

export async function main(
  runner: (connectionString: string) => Promise<void> = runMigrations,
): Promise<void> {
  const isTest = process.env.NODE_ENV === 'test';

  let connectionString: string | undefined;

  if (isTest) {
    connectionString = process.env.TEST_DATABASE_URL;
    if (!connectionString) {
      console.error(
        '[migrate] NODE_ENV=test but TEST_DATABASE_URL is not set.\n' +
        '[migrate] Refusing to fall back to DATABASE_URL to avoid migrating a production or staging database.\n' +
        '[migrate] Set TEST_DATABASE_URL to a dedicated test database and retry.'
      );
      process.exit(1);
      return;
    }
    console.log('[migrate] NODE_ENV=test — using TEST_DATABASE_URL.');
  } else {
    connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[migrate] DATABASE_URL is not set — cannot run migrations');
      process.exit(1);
      return;
    }
  }

  await runner(connectionString);
}

/**
 * Auto-run guard.
 *
 * This module is imported by `vitest.globalSetup.ts` to call `runMigrations`
 * directly, and is also executed as a CLI script via `npm run db:migrate`.
 * We must NOT call `main()` (which can `process.exit(1)`) at import time
 * during a test run.
 *
 * Previously this relied on `process.argv[1]?.endsWith('scripts/migrate.ts')`,
 * but that heuristic is brittle in CI (compiled JS, path aliasing, monorepo
 * layouts, etc.). We now use an explicit allow-list:
 *
 *   - `SKIP_DB_MIGRATE=true` is a hard opt-out (highest priority).
 *   - We refuse to auto-run when NODE_ENV=test or under vitest, regardless
 *     of how the module was loaded.
 *   - Otherwise, the original path heuristic is used as a best-effort signal
 *     that the file was invoked directly from the CLI.
 *
 * Callers that want to force the auto-run from a non-standard entry point
 * can set `RUN_DB_MIGRATE=true`.
 */
const isTestEnv =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const isExplicitlySkipped = process.env.SKIP_DB_MIGRATE === 'true';
const isExplicitlyForced = process.env.RUN_DB_MIGRATE === 'true';
const matchesCliPath =
  process.argv[1]?.endsWith('scripts/migrate.ts') ||
  process.argv[1]?.endsWith('scripts/migrate.js') ||
  process.argv[1]?.endsWith('scripts/migrate');

// Allow explicit force (RUN_DB_MIGRATE=true) to bypass the test-env guard so
// that CI can run `npm run db:migrate` with NODE_ENV=test without triggering
// the vitest import-time auto-run lockout.
const isDirectRun =
  !isExplicitlySkipped &&
  (isExplicitlyForced || (!isTestEnv && matchesCliPath));

if (isDirectRun) {
  main().catch((err) => {
    console.error('[migrate] Migration failed:', err);
    process.exit(1);
  });
}
