/**
 * tests/alert-cleanup-csv.test.ts
 *
 * Unit tests for /api/admin/oracle-fallbacks-alert-cleanup-csv
 *
 * Covers:
 *  1. HTTP method guard — returns 405 for non-GET requests
 *  2. Authorization — returns 401 when x-admin-key is absent or wrong
 *  3. CSV output — returns 200 with correct Content-Type, Content-Disposition,
 *     and the four expected column headers (ran_at, deleted_count,
 *     retention_days, triggered_by)
 *  4. CSV rows — data rows are included and correctly formatted
 *  5. Date-range filtering — from/to query params produce the expected SQL
 *  6. Error handling — returns 500 when the database throws
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

const { default: alertCleanupCsvHandler } = await import(
  '../pages/api/admin/oracle-fallbacks-alert-cleanup-csv'
);

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'GET', headers = {}, query = {} } = opts;
  return { method, headers, query } as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): string;
  headers(): Record<string, string | string[]>;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body = '';
  const _headers: Record<string, string | string[]> = {};

  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
      _body = JSON.stringify(data);
      return res;
    },
    send(data: unknown) {
      _body = String(data);
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      _headers[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as NextApiResponse;

  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
    headers: () => _headers,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('/api/admin/oracle-fallbacks-alert-cleanup-csv handler', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...savedEnv, ADMIN_SOLVENCY_KEY: 'test-admin-key' };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // ── HTTP method guard ──────────────────────────────────────────────────────

  describe('HTTP method guard', () => {
    it('returns 405 for POST requests', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ method: 'POST', headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(405);
      expect(JSON.parse(body())).toMatchObject({ success: false });
    });

    it('returns 405 for DELETE requests', async () => {
      const { res, statusCode } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ method: 'DELETE', headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(405);
    });
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  describe('authorization', () => {
    it('returns 401 when x-admin-key header is absent', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(makeReq({ headers: {} }), res);
      expect(statusCode()).toBe(401);
      expect(JSON.parse(body())).toMatchObject({ success: false, error: 'Unauthorized' });
    });

    it('returns 401 when x-admin-key header has the wrong value', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'wrong-key' } }),
        res,
      );
      expect(statusCode()).toBe(401);
      expect(JSON.parse(body())).toMatchObject({ success: false });
    });
  });

  // ── CSV format: empty table ────────────────────────────────────────────────

  describe('CSV output — empty table', () => {
    it('returns 200 with Content-Type text/csv', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode, headers } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(200);
      expect(String(headers()['content-type'])).toMatch(/text\/csv/);
    });

    it('sets Content-Disposition to attachment with the expected filename', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, headers } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(String(headers()['content-disposition'])).toContain(
        'prune-alert-log-cleanup-history.csv',
      );
      expect(String(headers()['content-disposition'])).toMatch(/attachment/i);
    });

    it('includes the four expected column headers in the first line', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const firstLine = body().split(/\r\n|\r|\n/)[0];
      expect(firstLine).toBe('ran_at,deleted_count,retention_days,triggered_by');
    });

    it('produces only the header row when the table is empty', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines).toHaveLength(1);
    });

    it('sets X-Row-Count header to 0 when no rows match', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, headers } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(String(headers()['x-row-count'])).toBe('0');
    });
  });

  // ── CSV format: with data rows ─────────────────────────────────────────────

  describe('CSV output — with data rows', () => {
    const fakeRows = [
      {
        ran_at: '2026-04-15T02:30:00.000Z',
        deleted_count: 42,
        retention_days: 90,
        triggered_by: 'pg_cron',
      },
      {
        ran_at: '2026-04-14T02:30:00.000Z',
        deleted_count: 0,
        retention_days: 90,
        triggered_by: 'http',
      },
    ];

    beforeEach(() => {
      mockQuery.mockResolvedValue({ rows: fakeRows });
    });

    it('includes one data row per result row', async () => {
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines).toHaveLength(3);
    });

    it('data rows have exactly four comma-separated columns', async () => {
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        expect(cols, `row ${i} must have 4 columns`).toHaveLength(4);
      }
    });

    it('first data row reflects the first database row', async () => {
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('2026-04-15T02:30:00.000Z');
      expect(lines[1]).toContain('42');
      expect(lines[1]).toContain('pg_cron');
    });

    it('sets Cache-Control to no-store', async () => {
      const { res, headers } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(String(headers()['cache-control'])).toContain('no-store');
    });

    it('sets X-Row-Count header to the number of returned rows', async () => {
      const { res, headers } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(String(headers()['x-row-count'])).toBe('2');
    });

    it('orders by ran_at DESC', async () => {
      const { res } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const sql = String(mockQuery.mock.calls[0][0]);
      expect(sql).toMatch(/ORDER\s+BY\s+ran_at\s+DESC/);
    });

    it('selects from prune_alert_log_cleanup_history', async () => {
      const { res } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const sql = String(mockQuery.mock.calls[0][0]);
      expect(sql).toMatch(/FROM\s+prune_alert_log_cleanup_history/);
    });
  });

  // ── CSV escaping ───────────────────────────────────────────────────────────

  describe('CSV value escaping', () => {
    it('wraps values containing commas in double quotes', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            ran_at: '2026-04-15T02:30:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'cron,job',
          },
        ],
      });
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('"cron,job"');
    });

    it('escapes double quotes inside values with doubled quotes', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            ran_at: '2026-04-15T02:30:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'say "hi"',
          },
        ],
      });
      const { res, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('"say ""hi"""');
    });
  });

  // ── Date-range filtering ───────────────────────────────────────────────────

  describe('date-range filtering', () => {
    function lastQueryCall(): { sql: string; params: string[] } {
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const call = mockQuery.mock.calls[0];
      return { sql: String(call[0]), params: (call[1] ?? []) as string[] };
    }

    it('issues a query with no WHERE clause and no params when neither from nor to is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).not.toMatch(/\bWHERE\b/);
      expect(params).toEqual([]);
    });

    it('issues a ran_at >= $1 filter when only from is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { from: '2026-04-10T00:00:00.000Z' },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(/WHERE\s+ran_at\s*>=\s*\$1::timestamptz/);
      expect(sql).not.toMatch(/ran_at\s*<=/);
      expect(params).toEqual(['2026-04-10T00:00:00.000Z']);
    });

    it('issues a ran_at <= $1 filter when only to is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { to: '2026-04-20T23:59:59.000Z' },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(/WHERE\s+ran_at\s*<=\s*\$1::timestamptz/);
      expect(sql).not.toMatch(/ran_at\s*>=/);
      expect(params).toEqual(['2026-04-20T23:59:59.000Z']);
    });

    it('combines both filters with AND when from and to are both given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-04-10T00:00:00.000Z',
            to: '2026-04-20T23:59:59.000Z',
          },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(
        /WHERE\s+ran_at\s*>=\s*\$1::timestamptz\s+AND\s+ran_at\s*<=\s*\$2::timestamptz/,
      );
      expect(params).toEqual([
        '2026-04-10T00:00:00.000Z',
        '2026-04-20T23:59:59.000Z',
      ]);
    });

    it('returns 400 when from is not a valid date string', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { from: 'not-a-date' },
        }),
        res,
      );
      expect(statusCode()).toBe(400);
      expect(JSON.parse(body())).toMatchObject({ success: false });
      expect(JSON.parse(body()).error).toMatch(/from/);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns 400 when to is not a valid date string', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { to: 'tomorrow' },
        }),
        res,
      );
      expect(statusCode()).toBe(400);
      expect(JSON.parse(body())).toMatchObject({ success: false });
      expect(JSON.parse(body()).error).toMatch(/to/);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns 400 when from is provided as an array', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { from: ['2026-04-10T00:00:00.000Z', '2026-04-11T00:00:00.000Z'] },
        }),
        res,
      );
      expect(statusCode()).toBe(400);
      expect(JSON.parse(body())).toMatchObject({ success: false });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns 400 when from is later than to', async () => {
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-05-01T00:00:00.000Z',
            to: '2026-04-01T00:00:00.000Z',
          },
        }),
        res,
      );
      expect(statusCode()).toBe(400);
      expect(JSON.parse(body())).toMatchObject({ success: false });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('still returns the standard CSV header row when filters yield zero rows', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-04-10T00:00:00.000Z',
            to: '2026-04-20T00:00:00.000Z',
          },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const firstLine = body().split(/\r\n|\r|\n/)[0];
      expect(firstLine).toBe('ran_at,deleted_count,retention_days,triggered_by');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('database error handling', () => {
    it('returns 500 when the database query throws', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));
      const { res, statusCode, body } = makeRes();
      await alertCleanupCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(500);
      expect(JSON.parse(body())).toMatchObject({
        success: false,
        error: 'connection refused',
      });
    });
  });
});

// ─── Integration tests (real DB) ──────────────────────────────────────────────
//
// These exercise the live HTTP endpoint against a real Postgres instance so
// schema drift in `prune_alert_log_cleanup_history` (column renames, type
// changes, removed indexes) is caught before it can break the CSV download
// in production. The unit tests above mock the pg pool and therefore cannot
// detect any of those failure modes.
//
// Skipped unless both TEST_DATABASE_URL and ADMIN_SOLVENCY_KEY are set so CI
// environments without a test DB or running Next.js server do not produce
// false failures. Mirrors the integration block in
// tests/prune-history-csv.test.ts.

const INTEGRATION_DB_URL = process.env.TEST_DATABASE_URL;
const INTEGRATION_ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;
const integrationDescribe =
  INTEGRATION_DB_URL && INTEGRATION_ADMIN_KEY ? describe : describe.skip;

integrationDescribe(
  '/api/admin/oracle-fallbacks-alert-cleanup-csv integration (real DB)',
  () => {
    let pgPool: Pool;
    const insertedIds: number[] = [];

    beforeAll(async () => {
      pgPool = new Pool({
        connectionString: INTEGRATION_DB_URL ?? '',
        ssl: INTEGRATION_DB_URL?.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
        max: 2,
      });

      const check = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'prune_alert_log_cleanup_history'
         ) AS exists`,
      );
      if (check.rows[0].exists !== true) {
        throw new Error(
          'Integration test prerequisite missing: ' +
            'prune_alert_log_cleanup_history table not found. ' +
            'Apply migration 0049 before running integration tests.',
        );
      }
    });

    afterEach(async () => {
      if (insertedIds.length > 0) {
        await pgPool.query(
          `DELETE FROM prune_alert_log_cleanup_history WHERE id = ANY($1::bigint[])`,
          [insertedIds],
        );
        insertedIds.length = 0;
      }
    });

    afterAll(async () => {
      await pgPool.end().catch(() => {});
    });

    interface SeedRow {
      ranAt: Date;
      deletedCount: number;
      retentionDays: number;
      triggeredBy: string;
    }

    async function seedAlertCleanupHistory(row: SeedRow): Promise<number> {
      const result = await pgPool.query<{ id: number }>(
        `INSERT INTO prune_alert_log_cleanup_history
           (ran_at, deleted_count, retention_days, triggered_by)
         VALUES ($1::timestamptz, $2, $3, $4)
         RETURNING id`,
        [row.ranAt.toISOString(), row.deletedCount, row.retentionDays, row.triggeredBy],
      );
      const id = result.rows[0].id;
      insertedIds.push(id);
      return id;
    }

    function parseCsv(csv: string): { header: string[]; rows: string[][] } {
      const lines = csv.split(/\r\n|\r|\n/).filter(Boolean);
      const header = lines[0].split(',');
      const rows = lines.slice(1).map((line) => {
        // Simple CSV parser sufficient for the values we seed (no embedded
        // commas/quotes/newlines in our test data).
        return line.split(',');
      });
      return { header, rows };
    }

    it('returns seeded rows in the CSV with the expected four-column header and ordering', async () => {
      // Use a unique triggered_by tag so we can locate our seeded rows even
      // if other history rows exist in the test database.
      const tag = `alert-csv-integ-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

      const olderAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const newerAt = new Date(Date.now() - 1 * 60 * 60 * 1000);

      await seedAlertCleanupHistory({
        ranAt: olderAt,
        deletedCount: 7,
        retentionDays: 90,
        triggeredBy: `${tag}-older`,
      });
      await seedAlertCleanupHistory({
        ranAt: newerAt,
        deletedCount: 13,
        retentionDays: 90,
        triggeredBy: `${tag}-newer`,
      });

      const resp = await fetch(
        `http://localhost:${process.env.PORT ?? 3000}/api/admin/oracle-fallbacks-alert-cleanup-csv`,
        { headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' } },
      );

      expect(resp.status).toBe(200);
      expect(resp.headers.get('content-type') ?? '').toMatch(/text\/csv/);

      const csv = await resp.text();
      const { header, rows } = parseCsv(csv);

      expect(header).toEqual([
        'ran_at',
        'deleted_count',
        'retention_days',
        'triggered_by',
      ]);

      const ourRows = rows.filter(
        (r) => r[3] === `${tag}-older` || r[3] === `${tag}-newer`,
      );
      expect(ourRows).toHaveLength(2);

      const newerRow = ourRows.find((r) => r[3] === `${tag}-newer`)!;
      const olderRow = ourRows.find((r) => r[3] === `${tag}-older`)!;

      expect(newerRow[1]).toBe('13');
      expect(newerRow[2]).toBe('90');
      expect(olderRow[1]).toBe('7');
      expect(olderRow[2]).toBe('90');

      // ran_at column should be a parseable timestamp matching what we seeded.
      expect(new Date(newerRow[0]).getTime()).toBeCloseTo(newerAt.getTime(), -3);
      expect(new Date(olderRow[0]).getTime()).toBeCloseTo(olderAt.getTime(), -3);

      // The endpoint orders by ran_at DESC, so within our two rows the newer
      // one must appear before the older one in the CSV output.
      const newerIdx = rows.findIndex((r) => r[3] === `${tag}-newer`);
      const olderIdx = rows.findIndex((r) => r[3] === `${tag}-older`);
      expect(newerIdx).toBeGreaterThanOrEqual(0);
      expect(olderIdx).toBeGreaterThan(newerIdx);
    });

    it('date-range filter: only rows inside [from, to] appear in the CSV', async () => {
      // Seed three rows: one before the window, one inside, one after. Then
      // query with from/to set to the window and verify only the in-window
      // row is present in the returned CSV.
      const tag = `alert-csv-range-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

      const beforeAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const insideAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const afterAt = new Date(Date.now() - 1 * 60 * 60 * 1000);

      const fromAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const toAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

      await seedAlertCleanupHistory({
        ranAt: beforeAt,
        deletedCount: 1,
        retentionDays: 90,
        triggeredBy: `${tag}-before`,
      });
      await seedAlertCleanupHistory({
        ranAt: insideAt,
        deletedCount: 2,
        retentionDays: 90,
        triggeredBy: `${tag}-inside`,
      });
      await seedAlertCleanupHistory({
        ranAt: afterAt,
        deletedCount: 3,
        retentionDays: 90,
        triggeredBy: `${tag}-after`,
      });

      const url =
        `http://localhost:${process.env.PORT ?? 3000}/api/admin/oracle-fallbacks-alert-cleanup-csv` +
        `?from=${encodeURIComponent(fromAt.toISOString())}` +
        `&to=${encodeURIComponent(toAt.toISOString())}`;

      const resp = await fetch(url, {
        headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' },
      });
      expect(resp.status).toBe(200);

      const csv = await resp.text();
      const { rows } = parseCsv(csv);

      const ourRows = rows.filter((r) => r[3]?.startsWith(tag));
      const triggers = ourRows.map((r) => r[3]).sort();
      expect(triggers).toEqual([`${tag}-inside`]);
    });
  },
);
