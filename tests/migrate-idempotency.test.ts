/**
 * tests/migrate-idempotency.test.ts
 *
 * Smoke test asserting that every handwritten SQL migration in
 * drizzle/migrations/ is safe to re-run ("idempotent") against a database
 * whose schema has already been fully migrated.
 *
 * Why this exists:
 *   Task #290 fixed a specific handwritten migration that was not idempotent
 *   and therefore broke `npm run test:vitest` on local dev databases that had
 *   already been migrated once.  Without an automated guard the same class of
 *   bug can silently sneak back in whenever a new migration is added without
 *   the required IF NOT EXISTS / IF EXISTS / information_schema.columns guards.
 *
 * How the test works:
 *   For each .sql file in drizzle/migrations/ the test:
 *     1. Opens a transaction against the live (fully-migrated) database.
 *     2. Temporarily deletes the file's row from handwritten_migrations inside
 *        that transaction — simulating the "this migration has not yet been
 *        applied" state.
 *     3. Executes the migration SQL directly.
 *     4. ROLLBACKs the transaction, which reverses both the DELETE and any DDL
 *        changes (Postgres DDL is transactional), leaving the database exactly
 *        as it was.
 *
 *   Because Postgres rolls back DDL changes, the schema stays at the
 *   fully-applied state throughout the test.  This means:
 *   - A migration that uses ADD COLUMN IF NOT EXISTS succeeds on re-run ✓
 *   - A migration that uses ADD COLUMN (without IF NOT EXISTS) fails on re-run
 *     because the column already exists in the committed schema ✗ → test fails
 *
 * What "done looks like" per the task spec:
 *   - Adding a deliberately broken handwritten migration (e.g. an unguarded
 *     ALTER TABLE ... ADD COLUMN, or an unguarded CREATE INDEX) causes this
 *     test to fail with a clear error message that names the offending file.
 *   - The test and CI step run immediately after the initial migration step so
 *     the failure is visible before any other suite runs.
 *
 * Skip behaviour:
 *   The integration block is skipped when DATABASE_URL is unset so the suite
 *   stays green in unit-test-only environments without a Postgres instance.
 *   CI always sets DATABASE_URL before running this file (see
 *   .github/workflows/main.yml, step "Verify migration bootstrap is
 *   idempotent").
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { applyHandwrittenMigrations } from '../scripts/migrate';
import fs from 'fs';
import path from 'path';

const DB_URL = process.env.DATABASE_URL;

const HANDWRITTEN_MIGRATIONS_DIR = path.join(
  process.cwd(),
  'drizzle',
  'migrations',
);

const integrationDescribe = DB_URL ? describe : describe.skip;

integrationDescribe('handwritten migration bootstrap idempotency', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DB_URL,
      ssl: DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 4,
    });

    await applyHandwrittenMigrations(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end().catch(() => {});
  });

  it(
    'every handwritten migration can be re-executed against an already-migrated database',
    async () => {
      if (!fs.existsSync(HANDWRITTEN_MIGRATIONS_DIR)) {
        return;
      }

      const files = fs
        .readdirSync(HANDWRITTEN_MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      if (files.length === 0) {
        return;
      }

      const failures: Array<{ file: string; error: string }> = [];

      for (const file of files) {
        const fullPath = path.join(HANDWRITTEN_MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(fullPath, 'utf8');

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          await client.query(
            'DELETE FROM handwritten_migrations WHERE filename = $1',
            [file],
          );

          await client.query(sql);

          await client.query('ROLLBACK');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          failures.push({
            file,
            error: (err as Error).message,
          });
        } finally {
          client.release();
        }
      }

      const summary = failures
        .map(
          (f) =>
            `  • ${f.file}:\n      ${f.error.split('\n')[0]}`,
        )
        .join('\n');

      expect(
        failures,
        `${failures.length} handwritten migration(s) are not idempotent — they fail when re-executed ` +
          `against an already-migrated database.\n\n` +
          `Ensure every migration in drizzle/migrations/ uses IF NOT EXISTS / IF EXISTS guards ` +
          `(or information_schema.columns checks for ALTER TABLE statements) so it is safe to ` +
          `re-run on a database whose schema already reflects the migration.\n\n` +
          `Failing migrations:\n${summary}`,
      ).toHaveLength(0);
    },
    120_000,
  );

  it(
    'second pass of applyHandwrittenMigrations inserts no new rows into handwritten_migrations',
    async () => {
      const { rows: before } = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM handwritten_migrations',
      );
      const countBefore = parseInt(before[0].count, 10);

      await applyHandwrittenMigrations(pool);

      const { rows: after } = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM handwritten_migrations',
      );
      const countAfter = parseInt(after[0].count, 10);

      expect(
        countAfter,
        `Second migration pass inserted ${countAfter - countBefore} row(s) into ` +
          'handwritten_migrations — at least one handwritten migration is not tracked correctly.',
      ).toBe(countBefore);
    },
    60_000,
  );
});
