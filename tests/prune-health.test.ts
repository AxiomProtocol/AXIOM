/**
 * Tests for the pruning staleness warning system
 *
 * Covers:
 *  1. getPruneStaleness helper (pure unit tests)
 *     - returns isStale=true and hoursAgo=null when lastPrune is null
 *     - returns isStale=true when last prune was >48 hours ago
 *     - returns isStale=false when last prune was recent
 *     - boundary: exactly at PRUNE_STALE_HOURS is considered stale
 *     - boundary: one millisecond under the threshold is not stale
 *  2. GET /api/admin/prune-health handler (unit tests with mocked pool)
 *     - returns 405 for non-GET methods
 *     - returns 401 when admin key header is absent
 *     - returns 401 when admin key header is wrong
 *     - returns never_run status when the history table is empty
 *     - returns ok status with correct shape for a recent prune
 *     - returns stale status when the last prune exceeds the threshold
 *     - returns 500 when the database throws
 *  3. Integration tests against a real database (skipped when DATABASE_URL is absent)
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { getPruneStaleness } from '../lib/admin/prune-staleness';
import { PRUNE_STALE_HOURS } from '../lib/admin/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PruneHealthOk {
  ok: true;
  status: 'ok';
  last_pruned_at: string;
  hours_since_prune: number;
  threshold_hours: number;
}

interface PruneHealthNotOk {
  ok: false;
  status: 'stale' | 'never_run';
  last_pruned_at: string | null;
  hours_since_prune: number | null;
  threshold_hours: number;
}

interface PruneHealthError {
  success: false;
  error: string;
}

type PruneHealthResponse = PruneHealthOk | PruneHealthNotOk | PruneHealthError;

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

const { default: pruneHealthHandler } = await import('../pages/api/admin/prune-health');

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'GET', headers = {} } = opts;
  return { method, headers } as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): PruneHealthResponse;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body: PruneHealthResponse = { success: false, error: 'no response sent' };

  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: PruneHealthResponse) {
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

// ─── Unit tests: getPruneStaleness ────────────────────────────────────────────
//
// Time is frozen for the entire block with vi.useFakeTimers() so that
// Date.now() returns the same value both when we compute `prunedAt` and when
// getPruneStaleness() calls Date.now() internally.  This makes threshold
// boundary assertions (exact-at-threshold, 1 ms under threshold) perfectly
// deterministic.

describe('getPruneStaleness', () => {
  const FROZEN_NOW = new Date('2026-01-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns isStale=true and hoursAgo=null when lastPrune is null (never_run)', () => {
    const result = getPruneStaleness(null);
    expect(result.isStale).toBe(true);
    expect(result.hoursAgo).toBeNull();
  });

  it('returns isStale=true when last prune was more than PRUNE_STALE_HOURS ago', () => {
    const staleMs = (PRUNE_STALE_HOURS + 1) * 60 * 60 * 1000;
    const prunedAt = new Date(FROZEN_NOW - staleMs).toISOString();
    const result = getPruneStaleness({
      pruned_at: prunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'http',
    });
    expect(result.isStale).toBe(true);
    expect(result.hoursAgo).not.toBeNull();
    expect(result.hoursAgo!).toBeGreaterThan(PRUNE_STALE_HOURS);
  });

  it('returns isStale=false when last prune was recent (1 hour ago)', () => {
    const recentMs = 1 * 60 * 60 * 1000;
    const prunedAt = new Date(FROZEN_NOW - recentMs).toISOString();
    const result = getPruneStaleness({
      pruned_at: prunedAt,
      deleted_count: 5,
      retention_days: 90,
      triggered_by: 'http',
    });
    expect(result.isStale).toBe(false);
    expect(result.hoursAgo).not.toBeNull();
    expect(result.hoursAgo!).toBeCloseTo(1, 0);
  });

  it('treats a prune exactly at the threshold as stale (>= comparison)', () => {
    const exactMs = PRUNE_STALE_HOURS * 60 * 60 * 1000;
    const prunedAt = new Date(FROZEN_NOW - exactMs).toISOString();
    const result = getPruneStaleness({
      pruned_at: prunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'http',
    });
    expect(result.isStale).toBe(true);
  });

  it('treats a prune one millisecond under the threshold as not stale', () => {
    const justUnderMs = PRUNE_STALE_HOURS * 60 * 60 * 1000 - 1;
    const prunedAt = new Date(FROZEN_NOW - justUnderMs).toISOString();
    const result = getPruneStaleness({
      pruned_at: prunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'http',
    });
    expect(result.isStale).toBe(false);
  });

  it('hoursAgo is a positive number reflecting the elapsed time', () => {
    const twentyFourHrsMs = 24 * 60 * 60 * 1000;
    const prunedAt = new Date(FROZEN_NOW - twentyFourHrsMs).toISOString();
    const result = getPruneStaleness({
      pruned_at: prunedAt,
      deleted_count: 0,
      retention_days: 90,
      triggered_by: 'pg_cron',
    });
    expect(result.hoursAgo).not.toBeNull();
    expect(result.hoursAgo!).toBeCloseTo(24, 0);
  });
});

// ─── Unit tests: /api/admin/prune-health handler ──────────────────────────────

describe('/api/admin/prune-health handler', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...savedEnv, ADMIN_SOLVENCY_KEY: 'test-admin-key' };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  describe('HTTP method guard', () => {
    it('returns 405 for POST requests', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ method: 'POST', headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(statusCode()).toBe(405);
      expect((body() as PruneHealthError).success).toBe(false);
    });

    it('returns 405 for DELETE requests', async () => {
      const { res, statusCode } = makeRes();
      await pruneHealthHandler(makeReq({ method: 'DELETE', headers: { 'x-admin-key': 'test-admin-key' } }), res);
      expect(statusCode()).toBe(405);
    });
  });

  describe('authorization', () => {
    it('returns 401 when x-admin-key header is absent', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: {} }), res);
      expect(statusCode()).toBe(401);
      expect((body() as PruneHealthError).success).toBe(false);
      expect((body() as PruneHealthError).error).toBe('Unauthorized');
    });

    it('returns 401 when x-admin-key header is wrong', async () => {
      const { res, statusCode } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'wrong-key' } }), res);
      expect(statusCode()).toBe(401);
    });

    it('accepts x-admin-solvency-key as an alias for x-admin-key', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const { res, statusCode } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-solvency-key': 'test-admin-key' } }), res);
      expect(statusCode()).toBe(200);
    });
  });

  describe('never_run status', () => {
    it('returns ok=false, status=never_run when the history table has no rows', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      expect(statusCode()).toBe(200);
      const b = body() as PruneHealthNotOk;
      expect(b.ok).toBe(false);
      expect(b.status).toBe('never_run');
      expect(b.last_pruned_at).toBeNull();
      expect(b.hours_since_prune).toBeNull();
      expect(b.threshold_hours).toBe(PRUNE_STALE_HOURS);
    });

    it('response shape for never_run includes all required fields', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const { res, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      const b = body() as PruneHealthNotOk;
      expect(b).toHaveProperty('ok');
      expect(b).toHaveProperty('status');
      expect(b).toHaveProperty('last_pruned_at');
      expect(b).toHaveProperty('hours_since_prune');
      expect(b).toHaveProperty('threshold_hours');
    });
  });

  describe('ok status (recent prune)', () => {
    it('returns ok=true, status=ok when last prune was 1 hour ago', async () => {
      const recentPrunedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      mockQuery.mockResolvedValue({ rows: [{ pruned_at: recentPrunedAt }], rowCount: 1 });

      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      expect(statusCode()).toBe(200);
      const b = body() as PruneHealthOk;
      expect(b.ok).toBe(true);
      expect(b.status).toBe('ok');
      expect(b.last_pruned_at).toBe(recentPrunedAt);
      expect(b.hours_since_prune).toBeCloseTo(1, 0);
      expect(b.threshold_hours).toBe(PRUNE_STALE_HOURS);
    });

    it('hours_since_prune is rounded to one decimal place', async () => {
      const prunedAt = new Date(Date.now() - 1.55 * 60 * 60 * 1000).toISOString();
      mockQuery.mockResolvedValue({ rows: [{ pruned_at: prunedAt }], rowCount: 1 });

      const { res, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      const b = body() as PruneHealthOk;
      const decimalPlaces = (b.hours_since_prune.toString().split('.')[1] ?? '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('stale status (overdue prune)', () => {
    it('returns ok=false, status=stale when last prune exceeded PRUNE_STALE_HOURS', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
      const stalePrunedAt = new Date(Date.now() - staleMs).toISOString();
      mockQuery.mockResolvedValue({ rows: [{ pruned_at: stalePrunedAt }], rowCount: 1 });

      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      expect(statusCode()).toBe(200);
      const b = body() as PruneHealthNotOk;
      expect(b.ok).toBe(false);
      expect(b.status).toBe('stale');
      expect(b.last_pruned_at).toBe(stalePrunedAt);
      expect(b.hours_since_prune).not.toBeNull();
      expect(b.hours_since_prune!).toBeGreaterThan(PRUNE_STALE_HOURS);
      expect(b.threshold_hours).toBe(PRUNE_STALE_HOURS);
    });

    it('uses HTTP 200 for stale responses (monitors must inspect the body)', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 1) * 60 * 60 * 1000;
      const stalePrunedAt = new Date(Date.now() - staleMs).toISOString();
      mockQuery.mockResolvedValue({ rows: [{ pruned_at: stalePrunedAt }], rowCount: 1 });

      const { res, statusCode } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      expect(statusCode()).toBe(200);
    });
  });

  describe('database error handling', () => {
    it('returns 500 when the database query throws', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));

      const { res, statusCode, body } = makeRes();
      await pruneHealthHandler(makeReq({ headers: { 'x-admin-key': 'test-admin-key' } }), res);

      expect(statusCode()).toBe(500);
      expect((body() as PruneHealthError).success).toBe(false);
      expect((body() as PruneHealthError).error).toBe('connection refused');
    });
  });
});

// ─── Integration tests (require DATABASE_URL + ADMIN_SOLVENCY_KEY + running server) ──
//
// These tests seed rows via the real database, then exercise the live HTTP
// endpoint.  They are skipped unless both DATABASE_URL *and*
// ADMIN_SOLVENCY_KEY are set so that CI environments which have a DB but no
// running Next.js server (or no admin key configured) do not produce false
// failures.  If the server is unavailable the fetch calls will throw and the
// test will fail with a clear network error rather than a misleading assertion.

const DB_URL = process.env.DATABASE_URL;
const INTEGRATION_ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;
const integrationDescribe = DB_URL && INTEGRATION_ADMIN_KEY ? describe : describe.skip;

integrationDescribe('/api/admin/prune-health integration (real DB)', () => {
  let pgPool: Pool;
  const insertedIds: number[] = [];

  beforeAll(async () => {
    pgPool = new Pool({
      connectionString: DB_URL ?? '',
      ssl: DB_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
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

  async function seedPruneHistory(prunedAt: Date): Promise<number> {
    const result = await pgPool.query<{ id: number }>(
      `INSERT INTO oracle_fallback_prune_history (pruned_at, deleted_count, retention_days, triggered_by)
       VALUES ($1, 0, 90, 'test-suite')
       RETURNING id`,
      [prunedAt.toISOString()],
    );
    const id = result.rows[0].id;
    insertedIds.push(id);
    return id;
  }

  it('returns never_run when there are no history rows', async () => {
    const maxBefore = await pgPool.query<{ max_id: number | null }>(
      'SELECT MAX(id) AS max_id FROM oracle_fallback_prune_history',
    );
    const prevMaxId = maxBefore.rows[0].max_id ?? 0;

    const resp = await fetch(
      `http://localhost:${process.env.PORT ?? 3000}/api/admin/prune-health`,
      { headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' } },
    );
    const body: PruneHealthOk | PruneHealthNotOk = await resp.json();

    if (prevMaxId === 0) {
      expect(body.ok).toBe(false);
      expect(body.status).toBe('never_run');
    } else {
      expect(['ok', 'stale', 'never_run']).toContain(body.status);
    }
  });

  it('returns ok status after a recent prune is seeded', async () => {
    const recentPrunedAt = new Date(Date.now() - 60 * 60 * 1000);
    await seedPruneHistory(recentPrunedAt);

    const resp = await fetch(
      `http://localhost:${process.env.PORT ?? 3000}/api/admin/prune-health`,
      { headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' } },
    );
    const body: PruneHealthOk | PruneHealthNotOk = await resp.json();

    expect(resp.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('ok');
    expect(body.last_pruned_at).not.toBeNull();
    expect(body.threshold_hours).toBe(PRUNE_STALE_HOURS);
  });

  it('returns stale status after an old prune is seeded', async () => {
    const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
    const stalePrunedAt = new Date(Date.now() - staleMs);
    await seedPruneHistory(stalePrunedAt);

    const resp = await fetch(
      `http://localhost:${process.env.PORT ?? 3000}/api/admin/prune-health`,
      { headers: { 'x-admin-key': INTEGRATION_ADMIN_KEY ?? '' } },
    );
    const body: PruneHealthOk | PruneHealthNotOk = await resp.json();

    expect(resp.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.status).toBe('stale');
  });
});
