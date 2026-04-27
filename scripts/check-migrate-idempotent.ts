/**
 * scripts/check-migrate-idempotent.ts
 *
 * Idempotency guard for the handwritten migration bootstrap.
 *
 * Records the number of rows in handwritten_migrations, runs the full
 * migration bootstrap (runMigrations), then records the count again and
 * exits non-zero if any new rows were inserted — i.e. if this "second pass"
 * modified the table.
 *
 * Usage (called from CI as a second migration pass):
 *   npm run db:migrate:idempotency-check
 *
 * The script uses the same database-URL selection logic as scripts/migrate.ts:
 * - NODE_ENV=test → TEST_DATABASE_URL (refuses DATABASE_URL)
 * - otherwise      → DATABASE_URL
 */

import { Pool } from 'pg';
import { runMigrations } from './migrate';

async function checkIdempotency(connectionString: string): Promise<void> {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? true : undefined,
    max: 1,
  });

  try {
    const { rows: before } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'handwritten_migrations'`,
    );
    const tableExists = parseInt(before[0].count, 10) > 0;

    const countBefore = tableExists
      ? parseInt(
          (
            await pool.query<{ count: string }>(
              'SELECT COUNT(*) AS count FROM handwritten_migrations',
            )
          ).rows[0].count,
          10,
        )
      : 0;

    console.log(
      `[idempotency] handwritten_migrations row count before second pass: ${countBefore}`,
    );

    await runMigrations(connectionString);

    const { rows: afterTableRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'handwritten_migrations'`,
    );
    const tableExistsAfter = parseInt(afterTableRows[0].count, 10) > 0;
    const countAfter = tableExistsAfter
      ? parseInt(
          (
            await pool.query<{ count: string }>(
              'SELECT COUNT(*) AS count FROM handwritten_migrations',
            )
          ).rows[0].count,
          10,
        )
      : 0;

    console.log(
      `[idempotency] handwritten_migrations row count after second pass: ${countAfter}`,
    );

    const inserted = countAfter - countBefore;
    if (inserted !== 0) {
      console.error(
        `[idempotency] FAIL: second migration pass inserted ${inserted} row(s) into ` +
          'handwritten_migrations — at least one handwritten migration is not idempotent.\n' +
          'Ensure every migration in drizzle/migrations/ uses IF NOT EXISTS / IF EXISTS guards ' +
          'so it is safe to re-run on an already-migrated database.',
      );
      process.exit(1);
    }

    console.log(
      '[idempotency] PASS: second migration pass is a no-op (0 new rows inserted).',
    );
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const isTest = process.env.NODE_ENV === 'test';

  let connectionString: string | undefined;

  if (isTest) {
    connectionString = process.env.TEST_DATABASE_URL;
    if (!connectionString) {
      console.error(
        '[idempotency] NODE_ENV=test but TEST_DATABASE_URL is not set.\n' +
          '[idempotency] Refusing to fall back to DATABASE_URL to avoid touching a non-test database.',
      );
      process.exit(1);
      return;
    }
    console.log('[idempotency] NODE_ENV=test — using TEST_DATABASE_URL.');
  } else {
    connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[idempotency] DATABASE_URL is not set — cannot run check');
      process.exit(1);
      return;
    }
  }

  await checkIdempotency(connectionString);
}

main().catch((err) => {
  console.error('[idempotency] Unexpected error:', err);
  process.exit(1);
});
