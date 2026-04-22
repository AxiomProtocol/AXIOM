/**
 * tests/migrate-handwritten.test.ts
 *
 * Integration test for the handwritten-migration runner end-to-end.
 *
 * Verifies:
 *   1. Running the migration runner against a fresh (empty) tracking table
 *      records every .sql file from a known migrations directory in the
 *      real `handwritten_migrations` Postgres table.
 *   2. Re-running the migration runner is idempotent — the row count in
 *      `handwritten_migrations` does not change and no errors are thrown.
 *
 * A temporary migrations directory with two self-contained, idempotent SQL
 * files is used so the test is independent of the state of the live
 * drizzle/migrations files (which may reference columns not present in the
 * current shared test database).
 *
 * Skipped when DATABASE_URL is not set so the test suite remains green in
 * environments without a Postgres instance.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyHandwrittenMigrations } from '../scripts/migrate';

const DB_URL = process.env.DATABASE_URL;
const integrationDescribe = DB_URL ? describe : describe.skip;

integrationDescribe('applyHandwrittenMigrations (integration)', () => {
  let pool: Pool;
  let tmpDir: string;

  const MIGRATION_A = '0001_create_test_sentinel_a.sql';
  const MIGRATION_B = '0002_create_test_sentinel_b.sql';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DB_URL,
      ssl: DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-hw-test-'));

    fs.writeFileSync(
      path.join(tmpDir, MIGRATION_A),
      `CREATE TABLE IF NOT EXISTS _migrate_hw_test_sentinel_a (id serial PRIMARY KEY, tag text NOT NULL);`,
    );
    fs.writeFileSync(
      path.join(tmpDir, MIGRATION_B),
      `CREATE TABLE IF NOT EXISTS _migrate_hw_test_sentinel_b (id serial PRIMARY KEY, tag text NOT NULL);`,
    );

    await pool.query(`
      DELETE FROM handwritten_migrations
      WHERE filename IN ($1, $2)
    `, [MIGRATION_A, MIGRATION_B]);

    await pool.query(`DROP TABLE IF EXISTS _migrate_hw_test_sentinel_a`);
    await pool.query(`DROP TABLE IF EXISTS _migrate_hw_test_sentinel_b`);
  }, 30_000);

  afterAll(async () => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    if (pool) {
      await pool.query(`
        DELETE FROM handwritten_migrations
        WHERE filename IN ($1, $2)
      `, [MIGRATION_A, MIGRATION_B]).catch(() => {});
      await pool.query(`DROP TABLE IF EXISTS _migrate_hw_test_sentinel_a`).catch(() => {});
      await pool.query(`DROP TABLE IF EXISTS _migrate_hw_test_sentinel_b`).catch(() => {});
      await pool.end().catch(() => {});
    }
  }, 30_000);

  it('applies both SQL files and records them in handwritten_migrations', async () => {
    await applyHandwrittenMigrations(pool, tmpDir);

    const { rows } = await pool.query<{ filename: string; checksum: string }>(
      `SELECT filename, checksum
         FROM handwritten_migrations
        WHERE filename IN ($1, $2)
        ORDER BY filename`,
      [MIGRATION_A, MIGRATION_B],
    );

    expect(rows.map((r) => r.filename)).toEqual(
      [MIGRATION_A, MIGRATION_B].sort(),
    );

    for (const row of rows) {
      expect(
        row.checksum,
        `expected a 64-char hex checksum for ${row.filename}`,
      ).toMatch(/^[0-9a-f]{64}$/);
    }

    const { rows: sentinelA } = await pool.query(
      `SELECT to_regclass('public._migrate_hw_test_sentinel_a') AS oid`,
    );
    expect(sentinelA[0].oid).not.toBeNull();

    const { rows: sentinelB } = await pool.query(
      `SELECT to_regclass('public._migrate_hw_test_sentinel_b') AS oid`,
    );
    expect(sentinelB[0].oid).not.toBeNull();
  });

  it('is idempotent — re-running does not add rows or throw', async () => {
    const { rowCount: before } = await pool.query(
      `SELECT 1 FROM handwritten_migrations WHERE filename IN ($1, $2)`,
      [MIGRATION_A, MIGRATION_B],
    );

    await expect(
      applyHandwrittenMigrations(pool, tmpDir),
    ).resolves.toBeUndefined();

    const { rowCount: after } = await pool.query(
      `SELECT 1 FROM handwritten_migrations WHERE filename IN ($1, $2)`,
      [MIGRATION_A, MIGRATION_B],
    );

    expect(after).toBe(before);
    expect(after).toBe(2);
  });

  it('applies files in alphabetical order — sentinel_a table has a lower oid than sentinel_b', async () => {
    const { rows } = await pool.query<{ relname: string; oid: number }>(
      `SELECT relname, oid
         FROM pg_class
        WHERE relname IN ('_migrate_hw_test_sentinel_a', '_migrate_hw_test_sentinel_b')
          AND relkind = 'r'
        ORDER BY oid`,
    );

    expect(rows.length).toBe(2);
    expect(rows[0].relname).toBe('_migrate_hw_test_sentinel_a');
    expect(rows[1].relname).toBe('_migrate_hw_test_sentinel_b');
  });
});
