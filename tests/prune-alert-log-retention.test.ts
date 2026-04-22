/**
 * Integration tests for the prune_prune_alert_log() SQL function defined in
 * migration 0048 (and updated by migration 0049 to also write a cleanup history
 * row).
 *
 * Unit tests for `pruneAlertLogRetention` exercise this code path with a
 * mocked pg pool, which confirms the wiring but cannot prove that the SQL
 * function actually deletes the right rows. These tests insert real rows with
 * varied `sent_at` ages, invoke the function with a small retention window,
 * and then assert:
 *
 *   1. The reported `deleted_count` matches the number of old rows seeded
 *      EXACTLY (not >=) — the test isolates itself in a transaction so no
 *      ambient data from other suites can perturb the count.
 *   2. Old rows (older than the window) are gone after the call.
 *   3. Recent rows (inside the window) survive.
 *   4. The cooldown read (`ORDER BY sent_at DESC LIMIT 1`) returns the most
 *      recent surviving row — i.e. cooldown semantics are preserved.
 *
 * Each test runs inside a BEGIN / ROLLBACK transaction on a dedicated client
 * so that:
 *   - Concurrent or earlier-leaked rows in `prune_alert_log` cannot interfere
 *     with the deleted_count assertion (the transaction sees an empty table
 *     of seeded data).
 *   - All side effects — including the cleanup-history row that
 *     prune_prune_alert_log() inserts — are unwound at the end of the test
 *     and never persist to the shared database.
 *
 * Skipped automatically when DATABASE_URL is unset so unit-only runs (and
 * developer machines without a Postgres) still pass. When DATABASE_URL is
 * present we treat missing migrations as a hard failure — CI must not pass
 * silently while the SQL function goes untested.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Pool, type PoolClient } from 'pg';

const DB_URL = process.env.DATABASE_URL;
const integrationDescribe = DB_URL ? describe : describe.skip;

integrationDescribe(
  'prune_prune_alert_log SQL function (integration)',
  () => {
    let pgPool: Pool;
    let client: PoolClient;

    beforeAll(async () => {
      pgPool = new Pool({
        connectionString: DB_URL ?? '',
        ssl: DB_URL?.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
        max: 2,
      });

      const tblCheck = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'prune_alert_log'
         ) AS exists`,
      );
      const fnCheck = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'prune_prune_alert_log'
         ) AS exists`,
      );
      if (!tblCheck.rows[0].exists || !fnCheck.rows[0].exists) {
        throw new Error(
          'Integration test prerequisite missing: prune_alert_log table or ' +
            'prune_prune_alert_log SQL function not found. Apply migration 0048 ' +
            '(and 0049 for the two-arg signature) before running integration tests ' +
            '(e.g. psql "$DATABASE_URL" -f migrations/0048_prune_alert_log_retention.sql && ' +
            'psql "$DATABASE_URL" -f migrations/0049_prune_alert_log_cleanup_history.sql).',
        );
      }
    });

    beforeEach(async () => {
      // Acquire a dedicated client and open a transaction so seeded rows are
      // the only rows visible inside prune_alert_log for the duration of the
      // test. ROLLBACK in afterEach undoes everything — including the
      // cleanup-history row written by the function — so the suite leaves no
      // residue behind.
      client = await pgPool.connect();
      await client.query('BEGIN');
      // Belt-and-braces: explicitly remove any rows visible to *this*
      // transaction so the deleted_count assertions are based on a clean
      // slate. Other concurrent transactions are unaffected — they live in
      // their own snapshots.
      await client.query('DELETE FROM prune_alert_log');
    });

    afterEach(async () => {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    afterAll(async () => {
      await pgPool.end().catch(() => {});
    });

    async function insertAlertRow(sentAt: Date): Promise<number> {
      const result = await client.query<{ id: string }>(
        `INSERT INTO prune_alert_log (sent_at, alert_status, channels)
         VALUES ($1, 'stale', ARRAY['test-suite']::TEXT[])
         RETURNING id`,
        [sentAt.toISOString()],
      );
      // node-postgres returns BIGINT as string; normalise to number for the
      // assertions below (the values comfortably fit in JS Number range).
      return Number(result.rows[0].id);
    }

    async function callPrune(retentionDays: number): Promise<number> {
      const result = await client.query<{ deleted_count: string }>(
        `SELECT deleted_count FROM prune_prune_alert_log($1, 'integration-test')`,
        [retentionDays],
      );
      return parseInt(result.rows[0].deleted_count, 10);
    }

    it('deletes exactly the rows older than the retention window and reports the matching count', async () => {
      const RETENTION_DAYS = 7;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Two rows comfortably older than the 7-day window.
      const old1 = await insertAlertRow(new Date(now - 30 * dayMs));
      const old2 = await insertAlertRow(new Date(now - 10 * dayMs));
      // Two rows inside the 7-day window.
      const recent1 = await insertAlertRow(new Date(now - 6 * dayMs));
      const recent2 = await insertAlertRow(new Date(now - 1 * 60 * 60 * 1000));

      const deletedCount = await callPrune(RETENTION_DAYS);

      // Transaction isolation guarantees the table contained only our 4
      // seeded rows when the function ran, so the reported delete count must
      // be exactly 2.
      expect(deletedCount).toBe(2);

      // Old rows are gone, recent rows survive.
      const survivors = await client.query<{ id: string }>(
        `SELECT id FROM prune_alert_log ORDER BY id`,
      );
      const survivorIds = survivors.rows.map((r) => Number(r.id)).sort();
      expect(survivorIds).toEqual([recent1, recent2].sort());
      // Sanity: the deleted ids really are gone.
      expect(survivorIds).not.toContain(old1);
      expect(survivorIds).not.toContain(old2);
    });

    it('preserves cooldown semantics: ORDER BY sent_at DESC LIMIT 1 returns the most recent surviving row', async () => {
      const RETENTION_DAYS = 3;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Old rows that should be deleted.
      await insertAlertRow(new Date(now - 30 * dayMs));
      await insertAlertRow(new Date(now - 5 * dayMs));
      // Two surviving rows inside the 3-day window. The newer of the two
      // (mostRecentSentAt) is what the cooldown read must return.
      const olderSurvivorSentAt = new Date(now - 2 * dayMs);
      const mostRecentSentAt = new Date(now - 30 * 60 * 1000); // 30 min ago
      await insertAlertRow(olderSurvivorSentAt);
      const mostRecentId = await insertAlertRow(mostRecentSentAt);

      const deletedCount = await callPrune(RETENTION_DAYS);
      expect(deletedCount).toBe(2);

      // Mirror the real cooldown read used by the alert-cooldown feature.
      const cooldownRead = await client.query<{ id: string; sent_at: Date }>(
        `SELECT id, sent_at FROM prune_alert_log
         ORDER BY sent_at DESC
         LIMIT 1`,
      );

      expect(cooldownRead.rows).toHaveLength(1);
      expect(Number(cooldownRead.rows[0].id)).toBe(mostRecentId);
      // Sanity: the timestamp returned is the most recent one we seeded.
      expect(new Date(cooldownRead.rows[0].sent_at).getTime()).toBeCloseTo(
        mostRecentSentAt.getTime(),
        -3, // tolerance: within ~1s, accounts for TZ/round-trip jitter
      );
    });

    it('reports deleted_count = 0 when no rows fall outside the retention window', async () => {
      const RETENTION_DAYS = 90;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Both rows are well inside the 90-day window.
      const r1 = await insertAlertRow(new Date(now - 1 * dayMs));
      const r2 = await insertAlertRow(new Date(now - 60 * 60 * 1000));

      const deletedCount = await callPrune(RETENTION_DAYS);

      // Transaction-isolated: the only rows visible were our two recent
      // seeds, so the function must report exactly zero deletions.
      expect(deletedCount).toBe(0);

      const stillThere = await client.query<{ id: string }>(
        `SELECT id FROM prune_alert_log ORDER BY id`,
      );
      expect(stillThere.rows.map((r) => Number(r.id)).sort()).toEqual(
        [r1, r2].sort(),
      );
    });
  },
);
