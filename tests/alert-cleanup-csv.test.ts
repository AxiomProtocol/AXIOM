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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

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
