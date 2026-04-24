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
            '(and 0049 for the two-arg signature, and 0051 for the NULL→1-day ' +
            'clamp fix) before running integration tests ' +
            '(e.g. psql "$DATABASE_URL" -f migrations/0048_prune_alert_log_retention.sql && ' +
            'psql "$DATABASE_URL" -f migrations/0049_prune_alert_log_cleanup_history.sql && ' +
            'psql "$DATABASE_URL" -f migrations/0051_prune_alert_log_null_retention_clamp.sql).',
        );
      }

      // The `prune_alert_log_cleanup_history logging` describe block below
      // depends on migration 0049 having created the audit table. Treat a
      // missing table as a hard failure so CI cannot pass silently while
      // the new logging coverage goes untested.
      const historyTblCheck = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'prune_alert_log_cleanup_history'
         ) AS exists`,
      );
      if (!historyTblCheck.rows[0].exists) {
        throw new Error(
          'Integration test prerequisite missing: ' +
            'prune_alert_log_cleanup_history table not found. Apply ' +
            'migration 0049 before running integration tests ' +
            '(e.g. psql "$DATABASE_URL" -f migrations/0049_prune_alert_log_cleanup_history.sql).',
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

    it('runs cleanly against a completely empty table and reports deleted_count = 0', async () => {
      // Regression guard: a no-op invocation (zero rows visible to delete)
      // must still execute the plpgsql body cleanly — including the
      // cleanup-history INSERT added in migration 0049 — without raising.
      // If a future change introduces e.g. a NOT NULL violation in the
      // history insert when deleted_count is 0, this test will catch it.
      //
      // beforeEach already issues `DELETE FROM prune_alert_log` inside the
      // open transaction, so the table is guaranteed empty here.
      const RETENTION_DAYS = 7;

      const sanity = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM prune_alert_log',
      );
      expect(parseInt(sanity.rows[0].count, 10)).toBe(0);

      // Must not throw, and must report exactly 0 (not just >= 0).
      const deletedCount = await callPrune(RETENTION_DAYS);
      expect(deletedCount).toBe(0);

      // Table is still empty afterwards.
      const after = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM prune_alert_log',
      );
      expect(parseInt(after.rows[0].count, 10)).toBe(0);
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

    // ── prune_alert_log_cleanup_history logging ────────────────────────────
    //
    // Migration 0049 made prune_prune_alert_log() write one audit row to the
    // new prune_alert_log_cleanup_history table on every invocation. The
    // admin dashboard reads from that table to show cleanup cadence — so a
    // missing INSERT silently breaks the dashboard. These tests prove the
    // INSERT actually fires with the right deleted_count, retention_days,
    // and triggered_by values.
    //
    // Style mirrors the `oracle_fallback_prune_history logging` block in
    // tests/prune-oracle-fallback.test.ts: capture MAX(id) on the history
    // table BEFORE the prune call, then assert exactly one row exists with
    // id > prevMaxId. We cannot rely on the outer BEGIN/ROLLBACK to "hide"
    // pre-existing committed history rows — under READ COMMITTED isolation
    // those rows are still visible to our transaction. The id-watermark
    // makes the assertions deterministic regardless of ambient data.
    //
    // The call uses triggered_by='http' to mirror the production call site
    // in lib/admin/prune-alert.ts (`pruneAlertLogRetention`) — the only
    // application-layer caller of this function.
    describe('prune_alert_log_cleanup_history logging', () => {
      async function callPruneViaHttp(
        retentionDays: number,
      ): Promise<{ deletedCount: number; historyRow: {
        deleted_count: string;
        retention_days: number;
        triggered_by: string;
      } }> {
        const maxBefore = await client.query<{ max_id: string | null }>(
          'SELECT MAX(id) AS max_id FROM prune_alert_log_cleanup_history',
        );
        const prevMaxId = maxBefore.rows[0].max_id ?? '0';

        const pruneResult = await client.query<{ deleted_count: string }>(
          `SELECT deleted_count FROM prune_prune_alert_log($1, 'http')`,
          [retentionDays],
        );
        const deletedCount = parseInt(pruneResult.rows[0].deleted_count, 10);

        // Exactly one new history row must have been inserted.
        const newRows = await client.query<{
          deleted_count: string;
          retention_days: number;
          triggered_by: string;
        }>(
          `SELECT deleted_count, retention_days, triggered_by
           FROM prune_alert_log_cleanup_history
           WHERE id > $1::bigint`,
          [prevMaxId],
        );
        expect(newRows.rows).toHaveLength(1);

        return { deletedCount, historyRow: newRows.rows[0] };
      }

      it('writes exactly one history row whose deleted_count and triggered_by match the call', async () => {
        const RETENTION_DAYS = 7;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        // Seed two old rows (both outside the 7-day window) and one recent
        // row (inside the window) so we have a non-zero, deterministic
        // delete count to assert against the history row.
        const old1 = await insertAlertRow(new Date(now - 30 * dayMs));
        const old2 = await insertAlertRow(new Date(now - 10 * dayMs));
        const recent = await insertAlertRow(new Date(now - 1 * dayMs));

        const { deletedCount, historyRow } =
          await callPruneViaHttp(RETENTION_DAYS);

        // Transaction isolation on prune_alert_log → exactly the two old
        // rows we seeded are pruned.
        expect(deletedCount).toBe(2);

        // The old rows are gone, the recent row survives.
        const survivors = await client.query<{ id: string }>(
          `SELECT id FROM prune_alert_log ORDER BY id`,
        );
        const survivorIds = survivors.rows.map((r) => Number(r.id));
        expect(survivorIds).toEqual([recent]);
        expect(survivorIds).not.toContain(old1);
        expect(survivorIds).not.toContain(old2);

        // History row matches the call: deleted_count, retention_days,
        // triggered_by.
        expect(parseInt(historyRow.deleted_count, 10)).toBe(deletedCount);
        expect(historyRow.retention_days).toBe(RETENTION_DAYS);
        expect(historyRow.triggered_by).toBe('http');
      });

      it('records deleted_count = 0 in the history row when nothing is pruned', async () => {
        const RETENTION_DAYS = 90;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        // One row well inside the 90-day window — nothing to delete.
        await insertAlertRow(new Date(now - 1 * dayMs));

        const { deletedCount, historyRow } =
          await callPruneViaHttp(RETENTION_DAYS);

        expect(deletedCount).toBe(0);
        // The history row must still be written (the cleanup ran, it just
        // had nothing to do) and must record deleted_count = 0.
        expect(parseInt(historyRow.deleted_count, 10)).toBe(0);
        expect(historyRow.retention_days).toBe(RETENTION_DAYS);
        expect(historyRow.triggered_by).toBe('http');
      });
    });

    // ── retention-window clamp guardrail ───────────────────────────────────
    //
    // The plpgsql body in migration 0051 (which supersedes the original
    // implementation in 0048/0049) defends against a destructive
    // misconfiguration with a single rule:
    //
    //   IF retention_days IS NULL OR retention_days < 1 THEN v_window := 1
    //
    // i.e. NULL is treated identically to a non-positive value and clamped
    // to a 1-day floor. The earlier implementation evaluated
    // `COALESCE(retention_days, 90)` first, which silently turned an
    // explicit NULL into a 90-day window — contradicting the inline comment
    // and surprising operators who set the GUC to an empty value expecting
    // an aggressive cleanup. Task #233 aligned the code with the comment.
    //
    // The application-level validator (`getPruneAlertLogRetentionDays`) is
    // unit-tested elsewhere, but nothing proves the in-database defence
    // works. These tests bypass the app validator entirely by invoking the
    // SQL function with `retention_days = 0` and `retention_days = NULL`
    // and assert that:
    //   - A ~12-hour-old row survives (the 1-day floor protects it).
    //   - A 2-day-old row is pruned (proving the resolved window really is
    //     1 day for both inputs — under the old 90-day NULL fallback this
    //     row would have survived).
    //
    // 12 hours / 2 days / 10 days were chosen to leave generous slack on
    // either side of the 1-day window so the tests are not flaky under
    // DST transitions or clock skew, while still being small enough to
    // distinguish a 1-day window from a 90-day one.
    describe('retention-window clamp guardrail', () => {
      it('clamps retention_days = 0 to 1 day: ~12h-old row survives, 10d-old row is pruned', async () => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        const oldId = await insertAlertRow(new Date(now - 10 * dayMs));
        const recentId = await insertAlertRow(new Date(now - 12 * 60 * 60 * 1000));

        const deletedCount = await callPrune(0);

        // Exactly one row (the 10-day-old one) must have been deleted.
        // If the clamp is missing, retention_days=0 would have deleted
        // BOTH rows because every sent_at is < NOW() - INTERVAL '0 days'.
        expect(deletedCount).toBe(1);

        const survivors = await client.query<{ id: string }>(
          `SELECT id FROM prune_alert_log ORDER BY id`,
        );
        const survivorIds = survivors.rows.map((r) => Number(r.id));
        expect(survivorIds).toEqual([recentId]);
        expect(survivorIds).not.toContain(oldId);
      });

      it('clamps retention_days = NULL to 1 day: ~12h-old row survives, 2d-old row is pruned', async () => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        // Migration 0051 makes NULL fall back to the 1-day floor (matching
        // the inline guardrail comment), NOT to the historical 90-day
        // default. This test pins that behaviour by choosing seed ages
        // that distinguish the two:
        //
        //   - A ~12-hour-old row MUST survive (inside the 1-day window
        //     and inside the old 90-day fallback — passes either way, but
        //     proves the table is not wiped).
        //   - A 2-day-old row MUST be pruned. Under the new NULL→1-day
        //     clamp this row is outside the window and gets deleted.
        //     Under the OLD NULL→90-day fallback this row would have
        //     comfortably survived, so this assertion is what locks in
        //     the new behaviour.
        const oldId = await insertAlertRow(new Date(now - 2 * dayMs));
        const recentId = await insertAlertRow(new Date(now - 12 * 60 * 60 * 1000));

        const result = await client.query<{ deleted_count: string }>(
          `SELECT deleted_count FROM prune_prune_alert_log(NULL::INT, 'integration-test')`,
        );
        const deletedCount = parseInt(result.rows[0].deleted_count, 10);

        // Without any guardrail at all the DELETE expression
        // `NOW() - (NULL || ' days')::INTERVAL` evaluates to NULL and
        // matches no rows (deletedCount = 0), so the 2-day-old row would
        // never be pruned. Asserting deletedCount === 1 catches both
        // that failure mode AND a regression that re-introduces the
        // NULL→90-day fallback (which would also leave the 2-day-old
        // row alone).
        expect(deletedCount).toBe(1);

        const survivors = await client.query<{ id: string }>(
          `SELECT id FROM prune_alert_log ORDER BY id`,
        );
        const survivorIds = survivors.rows.map((r) => Number(r.id));
        expect(survivorIds).toEqual([recentId]);
        expect(survivorIds).not.toContain(oldId);
      });
    });
  },
);
