/**
 * Tests for POST /api/scheduler/prune-oracle-fallback
 *
 * Covers:
 *  1. Unauthorized requests are rejected with 401
 *  2. Records older than the retention window are deleted
 *  3. Records within the retention window are preserved
 *  4. ORACLE_FALLBACK_RETENTION_DAYS env var is respected
 *
 * Unit tests mock the database pool to exercise handler logic in isolation.
 * Integration tests run against a real database when DATABASE_URL is set,
 * verifying the SQL function's timestamp-based pruning semantics directly.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// ─── Typed response shape ────────────────────────────────────────────────────

interface PruneSuccessBody {
  success: true;
  deletedCount: number;
  retentionDays: number;
}

interface PruneErrorBody {
  success: false;
  error: string;
}

type PruneResponseBody = PruneSuccessBody | PruneErrorBody;

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

const { default: handler } = await import('../pages/api/scheduler/prune-oracle-fallback');

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
}

function makeReq(opts: MockRequestOptions = {}): NextApiRequest {
  const { method = 'POST', headers = {} } = opts;
  // NextApiRequest extends IncomingMessage; we supply only the fields the
  // handler actually reads so we avoid blanket `as any` across assertions.
  return { method, headers } as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): PruneResponseBody;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body: PruneResponseBody = { success: false, error: 'no response sent' };

  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: PruneResponseBody) {
      _body = data;
      return res;
    },
  } as unknown as NextApiResponse;

  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('prune-oracle-fallback handler', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...savedEnv };
    mockQuery.mockResolvedValue({ rows: [{ deleted_count: '0' }], rowCount: 1 });
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  describe('authorization', () => {
    it('returns 401 when MIRDT_SCAN_KEY is set and x-scan-key header is absent', async () => {
      process.env.MIRDT_SCAN_KEY = 'secret-key';
      delete process.env.NODE_ENV;

      const { res, statusCode, body } = makeRes();
      await handler(makeReq({ headers: {} }), res);

      expect(statusCode()).toBe(401);
      expect(body().success).toBe(false);
      expect((body() as PruneErrorBody).error).toBe('Unauthorized');
    });

    it('returns 401 when x-scan-key header value is wrong', async () => {
      process.env.MIRDT_SCAN_KEY = 'secret-key';

      const { res, statusCode, body } = makeRes();
      await handler(makeReq({ headers: { 'x-scan-key': 'wrong-key' } }), res);

      expect(statusCode()).toBe(401);
      expect(body().success).toBe(false);
    });

    it('returns 200 when x-scan-key header matches MIRDT_SCAN_KEY', async () => {
      process.env.MIRDT_SCAN_KEY = 'secret-key';
      mockQuery.mockResolvedValue({ rows: [{ deleted_count: '5' }], rowCount: 1 });

      const { res, statusCode, body } = makeRes();
      await handler(makeReq({ headers: { 'x-scan-key': 'secret-key' } }), res);

      expect(statusCode()).toBe(200);
      expect(body().success).toBe(true);
    });

    it('allows requests in development mode when MIRDT_SCAN_KEY is absent', async () => {
      delete process.env.MIRDT_SCAN_KEY;
      process.env.NODE_ENV = 'development';

      const { res, statusCode, body } = makeRes();
      await handler(makeReq(), res);

      expect(statusCode()).toBe(200);
      expect(body().success).toBe(true);
    });
  });

  // ── Pruning behavior ───────────────────────────────────────────────────────

  describe('pruning behavior', () => {
    beforeEach(() => {
      delete process.env.MIRDT_SCAN_KEY;
      process.env.NODE_ENV = 'development';
    });

    it('reports the correct number of rows deleted when records are outside the retention window', async () => {
      mockQuery.mockResolvedValue({ rows: [{ deleted_count: '42' }], rowCount: 1 });

      const { res, statusCode, body } = makeRes();
      await handler(makeReq(), res);

      expect(statusCode()).toBe(200);
      expect(body().success).toBe(true);
      expect((body() as PruneSuccessBody).deletedCount).toBe(42);
    });

    it('reports deletedCount = 0 when all records are within the retention window', async () => {
      mockQuery.mockResolvedValue({ rows: [{ deleted_count: '0' }], rowCount: 1 });

      const { res, statusCode, body } = makeRes();
      await handler(makeReq(), res);

      expect(statusCode()).toBe(200);
      expect(body().success).toBe(true);
      expect((body() as PruneSuccessBody).deletedCount).toBe(0);
    });

    it('calls the SQL function with 90 days (default) when ORACLE_FALLBACK_RETENTION_DAYS is absent', async () => {
      delete process.env.ORACLE_FALLBACK_RETENTION_DAYS;
      mockQuery.mockResolvedValue({ rows: [{ deleted_count: '3' }], rowCount: 1 });

      const { res } = makeRes();
      await handler(makeReq(), res);

      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('prune_oracle_fallback_events');
      expect(params).toEqual([90, 'http']);
    });

    it('passes ORACLE_FALLBACK_RETENTION_DAYS value to the SQL function', async () => {
      process.env.ORACLE_FALLBACK_RETENTION_DAYS = '30';
      mockQuery.mockResolvedValue({ rows: [{ deleted_count: '10' }], rowCount: 1 });

      const { res, body } = makeRes();
      await handler(makeReq(), res);

      expect(mockQuery).toHaveBeenCalledOnce();
      const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(params).toEqual([30, 'http']);
      expect((body() as PruneSuccessBody).retentionDays).toBe(30);
    });

    it('falls back to 90 days when ORACLE_FALLBACK_RETENTION_DAYS is not a valid number', async () => {
      process.env.ORACLE_FALLBACK_RETENTION_DAYS = 'not-a-number';

      const { res, body } = makeRes();
      await handler(makeReq(), res);

      const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(params).toEqual([90, 'http']);
      expect((body() as PruneSuccessBody).retentionDays).toBe(90);
    });

    it('falls back to 90 days when ORACLE_FALLBACK_RETENTION_DAYS is zero or negative', async () => {
      process.env.ORACLE_FALLBACK_RETENTION_DAYS = '0';

      const { res, body } = makeRes();
      await handler(makeReq(), res);

      const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
      expect(params).toEqual([90, 'http']);
      expect((body() as PruneSuccessBody).retentionDays).toBe(90);
    });
  });

  // ── HTTP method guard ──────────────────────────────────────────────────────

  describe('HTTP method guard', () => {
    it('returns 405 for GET requests', async () => {
      delete process.env.MIRDT_SCAN_KEY;
      process.env.NODE_ENV = 'development';

      const { res, statusCode, body } = makeRes();
      await handler(makeReq({ method: 'GET' }), res);

      expect(statusCode()).toBe(405);
      expect(body().success).toBe(false);
    });
  });

  // ── Database error handling ────────────────────────────────────────────────

  describe('database error handling', () => {
    it('returns 500 when the database query throws', async () => {
      delete process.env.MIRDT_SCAN_KEY;
      process.env.NODE_ENV = 'development';
      mockQuery.mockRejectedValue(new Error('connection refused'));

      const { res, statusCode, body } = makeRes();
      await handler(makeReq(), res);

      expect(statusCode()).toBe(500);
      expect(body().success).toBe(false);
      expect((body() as PruneErrorBody).error).toBe('connection refused');
    });
  });
});

// ─── Integration tests (require DATABASE_URL) ─────────────────────────────────
//
// These tests exercise the SQL function's timestamp-based pruning semantics
// directly — inserting rows with known `occurred_at` values, calling
// prune_oracle_fallback_events(), and then asserting which rows survive.

const DB_URL = process.env.DATABASE_URL;
const integrationDescribe = DB_URL ? describe : describe.skip;

integrationDescribe('prune_oracle_fallback_events SQL function (integration)', () => {
  // We bypass the vi.mock'd pool by constructing a dedicated pg.Pool directly.
  // This ensures integration tests talk to the real database regardless of how
  // the unit-test mock is registered above.
  let pgPool: Pool;
  let tableExists = false;
  const insertedIds: number[] = [];

  beforeAll(async () => {
    pgPool = new Pool({
      connectionString: DB_URL ?? '',
      ssl: DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });

    // Check whether the table AND SQL function have been migrated (migration 0045).
    // When DATABASE_URL is set (i.e. a real Postgres instance is available) we
    // treat missing migrations as a hard failure rather than a silent skip, so
    // CI cannot pass while the SQL function goes untested.
    try {
      const tblCheck = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'axusd_oracle_fallback_events'
         ) AS exists`,
      );
      const fnCheck = await pgPool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'prune_oracle_fallback_events'
         ) AS exists`,
      );
      tableExists =
        tblCheck.rows[0].exists === true && fnCheck.rows[0].exists === true;

      if (!tableExists) {
        throw new Error(
          'Integration test prerequisite missing: ' +
          'axusd_oracle_fallback_events table or prune_oracle_fallback_events ' +
          'SQL function not found. Apply migrations 0044 and 0045 before running ' +
          'integration tests (e.g. psql "$DATABASE_URL" -f migrations/0044_axusd_oracle_fallback_events.sql && ' +
          'psql "$DATABASE_URL" -f migrations/0045_oracle_fallback_pruning.sql).',
        );
      }
    } catch (err) {
      tableExists = false;
      throw err;
    }
  });

  async function insertRow(occurredAt: Date): Promise<number> {
    const result = await pgPool.query<{ id: number }>(
      `INSERT INTO axusd_oracle_fallback_events (occurred_at, caller, reason)
       VALUES ($1, 'test-suite', 'prune-test')
       RETURNING id`,
      [occurredAt.toISOString()],
    );
    const id = result.rows[0].id;
    insertedIds.push(id);
    return id;
  }

  afterEach(async () => {
    // Clean up any rows left behind (e.g. if the prune call didn't delete them).
    if (tableExists && insertedIds.length > 0) {
      await pgPool.query(
        `DELETE FROM axusd_oracle_fallback_events WHERE id = ANY($1::int[])`,
        [insertedIds],
      );
      insertedIds.length = 0;
    }
  });

  afterAll(async () => {
    await pgPool.end().catch(() => {});
  });

  it('deletes rows older than the retention window and keeps recent rows', async () => {
    const now = new Date();
    const tooOld = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
    const recent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);  // 10 days ago

    const oldId = await insertRow(tooOld);
    const recentId = await insertRow(recent);

    // Call the SQL pruning function with a 90-day window.
    const result = await pgPool.query<{ deleted_count: string }>(
      'SELECT deleted_count FROM prune_oracle_fallback_events($1)',
      [90],
    );
    const deletedCount = parseInt(result.rows[0].deleted_count, 10);

    // At least the one old row we inserted must have been pruned.
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    // The old row is gone.
    const oldCheck = await pgPool.query(
      'SELECT id FROM axusd_oracle_fallback_events WHERE id = $1',
      [oldId],
    );
    expect(oldCheck.rows).toHaveLength(0);

    // The recent row still exists.
    const recentCheck = await pgPool.query(
      'SELECT id FROM axusd_oracle_fallback_events WHERE id = $1',
      [recentId],
    );
    expect(recentCheck.rows).toHaveLength(1);

    // Remove recentId from cleanup list since it still exists; delete manually.
    const idx = insertedIds.indexOf(recentId);
    if (idx !== -1) insertedIds.splice(idx, 1);
    await pgPool.query('DELETE FROM axusd_oracle_fallback_events WHERE id = $1', [recentId]);
  });

  it('preserves rows that fall within the retention window (89 days for a 90-day cutoff)', async () => {
    const now = new Date();
    // 89 days ago — comfortably inside the 90-day window.
    const boundary = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);

    const boundaryId = await insertRow(boundary);

    await pgPool.query<{ deleted_count: string }>(
      'SELECT deleted_count FROM prune_oracle_fallback_events($1)',
      [90],
    );

    // The boundary row must still exist — it is within the 90-day window.
    const check = await pgPool.query(
      'SELECT id FROM axusd_oracle_fallback_events WHERE id = $1',
      [boundaryId],
    );
    expect(check.rows).toHaveLength(1);

    // Clean up manually since the prune didn't remove it.
    await pgPool.query('DELETE FROM axusd_oracle_fallback_events WHERE id = $1', [boundaryId]);
    const idx = insertedIds.indexOf(boundaryId);
    if (idx !== -1) insertedIds.splice(idx, 1);
  });
});
