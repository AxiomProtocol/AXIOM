/**
 * tests/prune-history-csv.test.ts
 *
 * Unit tests for /api/admin/oracle-fallbacks-prune-csv
 *
 * Covers:
 *  1. HTTP method guard — returns 405 for non-GET requests
 *  2. Authorization — returns 401 when x-admin-key is absent or wrong
 *  3. CSV output — returns 200 with correct Content-Type, Content-Disposition,
 *     and the six expected column headers (pruned_at, deleted_count,
 *     retention_days, triggered_by, gap_hours, overdue)
 *  4. CSV rows — data rows are included and correctly formatted, including
 *     the gap_hours and overdue columns derived from consecutive runs
 *  5. Error handling — returns 500 when the database throws
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

const { default: pruneCsvHandler } = await import('../pages/api/admin/oracle-fallbacks-prune-csv');

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

describe('/api/admin/oracle-fallbacks-prune-csv handler', () => {
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
      await pruneCsvHandler(
        makeReq({ method: 'POST', headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(405);
      expect(JSON.parse(body())).toMatchObject({ success: false });
    });

    it('returns 405 for DELETE requests', async () => {
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
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
      await pruneCsvHandler(makeReq({ headers: {} }), res);
      expect(statusCode()).toBe(401);
      expect(JSON.parse(body())).toMatchObject({ success: false, error: 'Unauthorized' });
    });

    it('returns 401 when x-admin-key header has the wrong value', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'wrong-key' } }), res);
      expect(statusCode()).toBe(401);
      expect(JSON.parse(body())).toMatchObject({ success: false });
    });

    it('accepts x-admin-solvency-key as an alias', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
        makeReq({ headers: { 'x-admin-solvency-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(200);
    });
  });

  // ── CSV format: empty table ────────────────────────────────────────────────

  describe('CSV output — empty table', () => {
    it('returns 200 with Content-Type text/csv', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode, headers } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(statusCode()).toBe(200);
      expect(String(headers()['content-type'])).toMatch(/text\/csv/);
    });

    it('sets Content-Disposition to attachment with the expected filename', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, headers } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(String(headers()['content-disposition'])).toContain(
        'oracle-fallback-prune-history.csv',
      );
      expect(String(headers()['content-disposition'])).toMatch(/attachment/i);
    });

    it('includes the six expected column headers in the first line', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const firstLine = body().split(/\r\n|\r|\n/)[0];
      expect(firstLine).toBe(
        'pruned_at,deleted_count,retention_days,triggered_by,gap_hours,overdue',
      );
    });

    it('produces only the header row when the table is empty', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines).toHaveLength(1);
    });
  });

  // ── CSV format: with data rows ─────────────────────────────────────────────

  describe('CSV output — with data rows', () => {
    const fakeRows = [
      {
        pruned_at: '2026-01-15T12:00:00.000Z',
        deleted_count: 42,
        retention_days: 90,
        triggered_by: 'pg_cron',
      },
      {
        pruned_at: '2026-01-14T12:00:00.000Z',
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
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines).toHaveLength(3);
    });

    it('data rows have exactly six comma-separated columns', async () => {
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        expect(cols, `row ${i} must have 6 columns`).toHaveLength(6);
      }
    });

    it('first data row reflects the first database row', async () => {
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('2026-01-15T12:00:00.000Z');
      expect(lines[1]).toContain('42');
      expect(lines[1]).toContain('pg_cron');
    });

    it('sets Cache-Control to no-store', async () => {
      const { res, headers } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(String(headers()['cache-control'])).toContain('no-store');
    });

    it('sets X-Row-Count header to the number of returned rows', async () => {
      const { res, headers } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(String(headers()['x-row-count'])).toBe('2');
    });
  });

  describe('X-Row-Count header — empty result', () => {
    it('sets X-Row-Count header to 0 when no rows match', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, headers } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(String(headers()['x-row-count'])).toBe('0');
    });
  });

  // ── CSV escaping ───────────────────────────────────────────────────────────

  describe('CSV value escaping', () => {
    it('wraps values containing commas in double quotes', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            pruned_at: '2026-01-15T12:00:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'cron,job',
          },
        ],
      });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('"cron,job"');
    });

    it('escapes double quotes inside values with doubled quotes', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            pruned_at: '2026-01-15T12:00:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'say "hello"',
          },
        ],
      });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      expect(lines[1]).toContain('"say ""hello"""');
    });
  });

  // ── Date-range filtering (from / to query params) ──────────────────────────
  //
  // The handler builds a SQL WHERE clause based on `from` and `to` query
  // parameters. Since the database is mocked, we verify the *exact* SQL and
  // parameter values passed to pool.query — that is the contract that
  // determines whether out-of-range rows are excluded by Postgres.

  describe('date-range filtering', () => {
    function lastQueryCall(): { sql: string; params: string[] } {
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const call = mockQuery.mock.calls[0];
      return { sql: String(call[0]), params: (call[1] ?? []) as string[] };
    }

    it('issues a query with no WHERE clause and no params when neither from nor to is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
        makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).not.toMatch(/\bWHERE\b/);
      expect(params).toEqual([]);
    });

    it('issues a pruned_at >= $1 filter when only from is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { from: '2026-01-10T00:00:00.000Z' },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(/WHERE\s+pruned_at\s*>=\s*\$1::timestamptz/);
      expect(sql).not.toMatch(/pruned_at\s*<=/);
      expect(params).toEqual(['2026-01-10T00:00:00.000Z']);
    });

    it('issues a pruned_at <= $1 filter when only to is given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { to: '2026-01-20T23:59:59.000Z' },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(/WHERE\s+pruned_at\s*<=\s*\$1::timestamptz/);
      expect(sql).not.toMatch(/pruned_at\s*>=/);
      expect(params).toEqual(['2026-01-20T23:59:59.000Z']);
    });

    it('combines both filters with AND when from and to are both given', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { res, statusCode } = makeRes();
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-01-10T00:00:00.000Z',
            to: '2026-01-20T23:59:59.000Z',
          },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const { sql, params } = lastQueryCall();
      expect(sql).toMatch(
        /WHERE\s+pruned_at\s*>=\s*\$1::timestamptz\s+AND\s+pruned_at\s*<=\s*\$2::timestamptz/,
      );
      expect(params).toEqual([
        '2026-01-10T00:00:00.000Z',
        '2026-01-20T23:59:59.000Z',
      ]);
    });

    it('returns 400 with an error when from is not a valid date string', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(
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

    it('returns 400 with an error when to is not a valid date string', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(
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

    it('returns 400 when from is provided as an array (repeated query param)', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: { from: ['2026-01-10T00:00:00.000Z', '2026-01-11T00:00:00.000Z'] },
        }),
        res,
      );
      expect(statusCode()).toBe(400);
      expect(JSON.parse(body())).toMatchObject({ success: false });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns 400 when from is later than to', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-02-01T00:00:00.000Z',
            to: '2026-01-01T00:00:00.000Z',
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
      await pruneCsvHandler(
        makeReq({
          headers: { 'x-admin-key': 'test-admin-key' },
          query: {
            from: '2026-01-10T00:00:00.000Z',
            to: '2026-01-20T00:00:00.000Z',
          },
        }),
        res,
      );
      expect(statusCode()).toBe(200);
      const firstLine = body().split(/\r\n|\r|\n/)[0];
      expect(firstLine).toBe(
        'pruned_at,deleted_count,retention_days,triggered_by,gap_hours,overdue',
      );
    });
  });

  // ── Gap-hours and overdue columns ──────────────────────────────────────────

  describe('gap_hours and overdue columns', () => {
    it('leaves gap_hours and overdue empty for the oldest (last) row', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            pruned_at: '2026-01-15T12:00:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
          {
            pruned_at: '2026-01-14T12:00:00.000Z',
            deleted_count: 2,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
        ],
      });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      const lastRow = lines[2].split(',');
      expect(lastRow[4]).toBe('');
      expect(lastRow[5]).toBe('');
    });

    it('reports a 24h gap as 24.0 with overdue=no when within the threshold', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            pruned_at: '2026-01-15T12:00:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
          {
            pruned_at: '2026-01-14T12:00:00.000Z',
            deleted_count: 2,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
        ],
      });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      const firstRow = lines[1].split(',');
      expect(firstRow[4]).toBe('24.0');
      expect(firstRow[5]).toBe('no');
    });

    it('marks overdue=yes when the gap exceeds the warn threshold (48h)', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            pruned_at: '2026-01-16T12:00:00.000Z',
            deleted_count: 1,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
          {
            pruned_at: '2026-01-14T12:00:00.000Z',
            deleted_count: 2,
            retention_days: 90,
            triggered_by: 'pg_cron',
          },
        ],
      });
      const { res, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      const lines = body().split(/\r\n|\r|\n/).filter(Boolean);
      const firstRow = lines[1].split(',');
      expect(firstRow[4]).toBe('48.0');
      expect(firstRow[5]).toBe('yes');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('database error handling', () => {
    it('returns 500 when the database query throws', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));
      const { res, statusCode, body } = makeRes();
      await pruneCsvHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(statusCode()).toBe(500);
      expect(JSON.parse(body())).toMatchObject({ success: false, error: 'connection refused' });
    });
  });
});

// ─── Integration tests (require TEST_DATABASE_URL + ADMIN_SOLVENCY_KEY + running server) ──
//
// These tests seed real rows into oracle_fallback_prune_history via a real
// Postgres connection and then exercise the live HTTP endpoint to confirm the
// rows actually appear in the CSV download. They catch mismatches between the
// SELECT query and the on-disk table schema (column names, types, ordering)
// that mocked unit tests cannot detect.
//
// Skipped unless TEST_DATABASE_URL, ADMIN_SOLVENCY_KEY, and CAPINFRA_BASE_URL
// are all set. CAPINFRA_BASE_URL must point at a running Next.js server (e.g.
// http://localhost:5000). Without it the fetch calls have nowhere to connect
// and will always produce ECONNREFUSED rather than a test failure.

const INTEGRATION_DB_URL = process.env.TEST_DATABASE_URL;
const INTEGRATION_ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;
const INTEGRATION_BASE_URL = process.env.CAPINFRA_BASE_URL ?? null;
const integrationDescribe =
  INTEGRATION_DB_URL && INTEGRATION_ADMIN_KEY && INTEGRATION_BASE_URL ? describe : describe.skip;

integrationDescribe('/api/admin/oracle-fallbacks-prune-csv integration (real DB)', () => {
  let pgPool: Pool;
  const insertedIds: number[] = [];

  beforeAll(async () => {
    pgPool = new Pool({
      connectionString: INTEGRATION_DB_URL ?? '',
      ssl: INTEGRATION_DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });

    const check = await pgPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'oracle_fallback_prune_history'
       ) AS exists`,
    );
    if (check.rows[0].exists !== true) {
      throw new Error(
        'Integration test prerequisite missing: ' +
        'oracle_fallback_prune_history table not found. ' +
        'Apply migrations 0046 and 0047 before running integration tests.',
      );
    }
  });

  afterEach(async () => {
    if (insertedIds.length > 0) {
      await pgPool.query(
        `DELETE FROM oracle_fallback_prune_history WHERE id = ANY($1::bigint[])`,
        [insertedIds],
      );
      insertedIds.length = 0;
    }
  });

  afterAll(async () => {
    await pgPool.end().catch(() => {});
  });

  interface SeedRow {
    prunedAt: Date;
    deletedCount: number;
    retentionDays: number;
    triggeredBy: string;
  }

  async function seedPruneHistory(row: SeedRow): Promise<number> {
    const result = await pgPool.query<{ id: number }>(
      `INSERT INTO oracle_fallback_prune_history
         (pruned_at, deleted_count, retention_days, triggered_by)
       VALUES ($1::timestamptz, $2, $3, $4)
       RETURNING id`,
      [row.prunedAt.toISOString(), row.deletedCount, row.retentionDays, row.triggeredBy],
    );
    const id = result.rows[0].id;
    insertedIds.push(id);
    return id;
  }

  function parseCsv(csv: string): { header: string[]; rows: string[][] } {
    const lines = csv.split(/\r\n|\r|\n/).filter(Boolean);
    const header = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
      // Simple CSV parser sufficient for the values we seed (no embedded
      // commas/quotes/newlines in our test data).
      return line.split(',');
    });
    return { header, rows };
  }

  it('returns seeded rows in the CSV with correct column values and ordering', async () => {
    // Use a unique triggered_by tag so we can locate our seeded rows even if
    // other history rows exist in the test database.
    const tag = `csv-integ-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const olderAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const newerAt = new Date(Date.now() - 1 * 60 * 60 * 1000);

    await seedPruneHistory({
      prunedAt: olderAt,
      deletedCount: 7,
      retentionDays: 90,
      triggeredBy: `${tag}-older`,
    });
    await seedPruneHistory({
      prunedAt: newerAt,
      deletedCount: 13,
      retentionDays: 90,
      triggeredBy: `${tag}-newer`,
    });

    const resp = await fetch(
      `${INTEGRATION_BASE_URL}/api/admin/oracle-fallbacks-prune-csv`,
      { headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' } },
    );

    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type') ?? '').toMatch(/text\/csv/);

    const csv = await resp.text();
    const { header, rows } = parseCsv(csv);

    expect(header).toEqual([
      'pruned_at',
      'deleted_count',
      'retention_days',
      'triggered_by',
      'gap_hours',
      'overdue',
    ]);

    const ourRows = rows.filter(r => r[3] === `${tag}-older` || r[3] === `${tag}-newer`);
    expect(ourRows).toHaveLength(2);

    const newerRow = ourRows.find(r => r[3] === `${tag}-newer`)!;
    const olderRow = ourRows.find(r => r[3] === `${tag}-older`)!;

    expect(newerRow[1]).toBe('13');
    expect(newerRow[2]).toBe('90');
    expect(olderRow[1]).toBe('7');
    expect(olderRow[2]).toBe('90');

    // pruned_at column should be a parseable timestamp matching what we seeded.
    expect(new Date(newerRow[0]).getTime()).toBeCloseTo(newerAt.getTime(), -3);
    expect(new Date(olderRow[0]).getTime()).toBeCloseTo(olderAt.getTime(), -3);

    // gap_hours / overdue: the older seeded row may not be the global-oldest
    // row in the test DB, so we cannot assert it has empty gap. But the newer
    // row has a known previous run (the older seeded row, ~1h earlier), and
    // *if* the older seeded row happens to be the immediate predecessor of
    // the newer one, the newer row's gap should be ~1h with overdue=no.
    // We assert overdue is one of the valid string values and, when the gap
    // is present, that it parses as a finite number.
    expect(['', 'yes', 'no']).toContain(newerRow[5]);
    if (newerRow[4] !== '') {
      const gap = parseFloat(newerRow[4]);
      expect(Number.isFinite(gap)).toBe(true);
      expect(gap).toBeGreaterThan(0);
      // Overdue flag must agree with the 25h threshold for the gap we read.
      expect(newerRow[5]).toBe(gap > 25 ? 'yes' : 'no');
    }

    // The endpoint orders by pruned_at DESC, so within our two rows the newer
    // one must appear before the older one in the CSV output.
    const newerIdx = rows.findIndex(r => r[3] === `${tag}-newer`);
    const olderIdx = rows.findIndex(r => r[3] === `${tag}-older`);
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(olderIdx).toBeGreaterThan(newerIdx);
  });

  it('date-range filter: only rows inside [from, to] appear in the CSV', async () => {
    // Seed three rows: one before the window, one inside, one after. Then
    // query with from/to set to the window and verify only the in-window row
    // is present in the returned CSV.
    const tag = `csv-range-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const beforeAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const insideAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const afterAt = new Date(Date.now() - 1 * 60 * 60 * 1000);

    const fromAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const toAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

    await seedPruneHistory({
      prunedAt: beforeAt,
      deletedCount: 1,
      retentionDays: 90,
      triggeredBy: `${tag}-before`,
    });
    await seedPruneHistory({
      prunedAt: insideAt,
      deletedCount: 2,
      retentionDays: 90,
      triggeredBy: `${tag}-inside`,
    });
    await seedPruneHistory({
      prunedAt: afterAt,
      deletedCount: 3,
      retentionDays: 90,
      triggeredBy: `${tag}-after`,
    });

    const url =
      `${INTEGRATION_BASE_URL}/api/admin/oracle-fallbacks-prune-csv` +
      `?from=${encodeURIComponent(fromAt.toISOString())}` +
      `&to=${encodeURIComponent(toAt.toISOString())}`;

    const resp = await fetch(url, {
      headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' },
    });
    expect(resp.status).toBe(200);

    const csv = await resp.text();
    const { rows } = parseCsv(csv);

    const ourRows = rows.filter(r => r[3]?.startsWith(tag));
    const triggers = ourRows.map(r => r[3]).sort();
    expect(triggers).toEqual([`${tag}-inside`]);
  });
});
