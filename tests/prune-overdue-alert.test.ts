/**
 * Tests for the prune-overdue-alert system
 *
 * Covers:
 *  1. getPruneStatus helper (unit tests with mocked pool)
 *     - returns never_run when the history table is empty
 *     - returns ok when last prune was recent
 *     - returns stale/isOverdue when last prune exceeded threshold
 *     - throws/propagates DB errors
 *  2. checkAndSendPruneOverdueAlert (unit tests with mocked DB + external services)
 *     - healthy status → skipped=true, no notifications sent
 *     - overdue but no channels configured → skipped=true
 *     - overdue with email configured → email sent, skipped=false
 *     - overdue with Discord configured → discord sent, skipped=false
 *     - overdue with both channels → both notifications sent
 *     - email send failure → error captured, skipped=false
 *     - Discord webhook failure → error captured, skipped=false
 *     - DB query error → skipped=true, error captured
 *  3. POST /api/scheduler/prune-overdue-alert handler (unit tests with mocked lib)
 *     - returns 405 for non-POST methods
 *     - returns 401 when x-scan-key header is absent
 *     - returns 401 when x-scan-key header is wrong
 *     - returns 200 with correct shape on success (skipped path)
 *     - returns 200 with overdue=true when alert fired
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
  beforeAll,
} from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { PRUNE_STALE_HOURS } from '../lib/admin/config';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockEmailSend = vi.fn();
const mockGetResendClient = vi.fn();

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

vi.mock('../lib/email/resend', () => ({
  getResendClient: (...args: unknown[]) => mockGetResendClient(...args),
}));

// Import modules under test AFTER mocks are registered (vitest hoists vi.mock)
const { getPruneStatus, checkAndSendPruneOverdueAlert } = await import(
  '../lib/admin/prune-alert'
);
const { default: pruneOverdueAlertHandler } = await import(
  '../pages/api/scheduler/prune-overdue-alert'
);

// ─── Request / Response helpers ────────────────────────────────────────────────

interface MockReqOptions {
  method?: string;
  headers?: Record<string, string>;
}

function makeReq(opts: MockReqOptions = {}): NextApiRequest {
  const { method = 'POST', headers = {} } = opts;
  return { method, headers } as NextApiRequest;
}

interface MockResResult {
  res: NextApiResponse;
  statusCode(): number;
  body(): unknown;
}

function makeRes(): MockResResult {
  let _statusCode = 200;
  let _body: unknown = { _unset: true };

  const res = {
    status(code: number) {
      _statusCode = code;
      return res;
    },
    json(data: unknown) {
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

// ─── Shared state for env isolation ───────────────────────────────────────────

const savedEnv = { ...process.env };

// ─── Unit tests: getPruneStatus ───────────────────────────────────────────────

describe('getPruneStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns never_run with isOverdue=true when history table is empty', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const result = await getPruneStatus();

    expect(result.status).toBe('never_run');
    expect(result.isOverdue).toBe(true);
    expect(result.lastPrunedAt).toBeNull();
    expect(result.hoursSincePrune).toBeNull();
    expect(result.thresholdHours).toBe(PRUNE_STALE_HOURS);
  });

  it('returns ok with isOverdue=false when last prune was 1 hour ago', async () => {
    const recentPrunedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ pruned_at: recentPrunedAt }], rowCount: 1 });

    const result = await getPruneStatus();

    expect(result.status).toBe('ok');
    expect(result.isOverdue).toBe(false);
    expect(result.lastPrunedAt).toBe(recentPrunedAt);
    expect(result.hoursSincePrune).not.toBeNull();
    expect(result.hoursSincePrune!).toBeCloseTo(1, 0);
    expect(result.thresholdHours).toBe(PRUNE_STALE_HOURS);
  });

  it('returns stale with isOverdue=true when last prune exceeded PRUNE_STALE_HOURS', async () => {
    const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
    const stalePrunedAt = new Date(Date.now() - staleMs).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ pruned_at: stalePrunedAt }], rowCount: 1 });

    const result = await getPruneStatus();

    expect(result.status).toBe('stale');
    expect(result.isOverdue).toBe(true);
    expect(result.lastPrunedAt).toBe(stalePrunedAt);
    expect(result.hoursSincePrune).not.toBeNull();
    expect(result.hoursSincePrune!).toBeGreaterThan(PRUNE_STALE_HOURS);
  });

  it('hoursSincePrune is rounded to one decimal place', async () => {
    const prunedAt = new Date(Date.now() - 1.55 * 60 * 60 * 1000).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ pruned_at: prunedAt }], rowCount: 1 });

    const result = await getPruneStatus();

    const decimalPlaces = (
      result.hoursSincePrune!.toString().split('.')[1] ?? ''
    ).length;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });

  it('propagates DB errors to the caller', async () => {
    mockQuery.mockRejectedValue(new Error('connection refused'));

    await expect(getPruneStatus()).rejects.toThrow('connection refused');
  });

  it('queries oracle_fallback_prune_history ordered by pruned_at DESC', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await getPruneStatus();

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql] = mockQuery.mock.calls[0] as [string];
    expect(sql).toMatch(/oracle_fallback_prune_history/i);
    expect(sql).toMatch(/ORDER BY pruned_at DESC/i);
    expect(sql).toMatch(/LIMIT 1/i);
  });
});

// ─── Unit tests: checkAndSendPruneOverdueAlert ────────────────────────────────

describe('checkAndSendPruneOverdueAlert', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...savedEnv,
      PRUNE_ALERT_EMAIL: '',
      PRUNE_ALERT_DISCORD_WEBHOOK: '',
      MIRDT_SCAN_KEY: undefined as unknown as string,
    };

    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    mockGetResendClient.mockResolvedValue({
      client: { emails: { send: mockEmailSend } },
      fromEmail: 'alerts@axiomprotocol.app',
    });
    mockEmailSend.mockResolvedValue({ id: 'mock-email-id' });
  });

  afterEach(() => {
    process.env = savedEnv;
    vi.unstubAllGlobals();
  });

  describe('healthy status (not overdue)', () => {
    it('returns skipped=true and sends no notifications when pruning is healthy', async () => {
      const recentPrunedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: recentPrunedAt }],
        rowCount: 1,
      });

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(true);
      expect(result.notificationsSent).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.alertStatus.isOverdue).toBe(false);
      expect(result.alertStatus.status).toBe('ok');
    });
  });

  describe('overdue with no alert channels configured', () => {
    it('returns skipped=true when no email or Discord webhook is set', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = '';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(true);
      expect(result.alertStatus.isOverdue).toBe(true);
      expect(result.notificationsSent).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns skipped=true for never_run status when no channels configured', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      process.env.PRUNE_ALERT_EMAIL = '';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(true);
      expect(result.alertStatus.status).toBe('never_run');
      expect(result.alertStatus.isOverdue).toBe(true);
      expect(result.notificationsSent).toHaveLength(0);
    });
  });

  describe('overdue with email channel configured', () => {
    beforeEach(() => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = 'ops@example.com';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';
    });

    it('sends email alert and returns skipped=false', async () => {
      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(false);
      expect(result.notificationsSent).toContain('email');
      expect(result.errors).toHaveLength(0);
      expect(mockEmailSend).toHaveBeenCalledOnce();
    });

    it('passes correct recipients to email client', async () => {
      process.env.PRUNE_ALERT_EMAIL = 'alice@example.com,bob@example.com';

      await checkAndSendPruneOverdueAlert();

      const callArgs = mockEmailSend.mock.calls[0][0] as {
        to: string[];
        subject: string;
      };
      expect(callArgs.to).toEqual(['alice@example.com', 'bob@example.com']);
    });

    it('email subject contains ALERT and status', async () => {
      await checkAndSendPruneOverdueAlert();

      const callArgs = mockEmailSend.mock.calls[0][0] as { subject: string };
      expect(callArgs.subject).toMatch(/ALERT/i);
      expect(callArgs.subject).toMatch(/stale/i);
    });

    it('captures email error and still returns skipped=false when send fails', async () => {
      mockEmailSend.mockRejectedValue(new Error('SMTP timeout'));

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(false);
      expect(result.notificationsSent).not.toContain('email');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/email/i);
      expect(result.errors[0]).toMatch(/SMTP timeout/);
    });

    it('trims whitespace from comma-separated email addresses', async () => {
      process.env.PRUNE_ALERT_EMAIL = '  alice@example.com , bob@example.com  ';

      await checkAndSendPruneOverdueAlert();

      const callArgs = mockEmailSend.mock.calls[0][0] as { to: string[] };
      expect(callArgs.to).toEqual(['alice@example.com', 'bob@example.com']);
    });
  });

  describe('overdue with Discord channel configured', () => {
    beforeEach(() => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = '';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK =
        'https://discord.com/api/webhooks/123/abc';
    });

    it('sends Discord webhook and returns skipped=false', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(false);
      expect(result.notificationsSent).toContain('discord');
      expect(result.errors).toHaveLength(0);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it('POSTs JSON to the Discord webhook URL', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);

      await checkAndSendPruneOverdueAlert();

      const [url, options] = fetchSpy.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(url).toBe('https://discord.com/api/webhooks/123/abc');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
      const payload = JSON.parse(options.body as string);
      expect(payload).toHaveProperty('embeds');
      expect(payload.embeds[0]).toHaveProperty('title');
    });

    it('captures Discord error when webhook returns non-ok status', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      } as unknown as Response);

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.notificationsSent).not.toContain('discord');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/discord/i);
      expect(result.errors[0]).toMatch(/429/);
    });

    it('captures Discord error when fetch throws a network error', async () => {
      fetchSpy.mockRejectedValue(new Error('network unreachable'));

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.notificationsSent).not.toContain('discord');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/discord/i);
    });
  });

  describe('overdue with both email and Discord configured', () => {
    beforeEach(() => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = 'ops@example.com';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK =
        'https://discord.com/api/webhooks/123/abc';
      fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);
    });

    it('fires both email and Discord and returns skipped=false', async () => {
      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(false);
      expect(result.notificationsSent).toContain('email');
      expect(result.notificationsSent).toContain('discord');
      expect(result.errors).toHaveLength(0);
    });

    it('still sends Discord even if email fails', async () => {
      mockEmailSend.mockRejectedValue(new Error('email down'));
      fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.notificationsSent).toContain('discord');
      expect(result.notificationsSent).not.toContain('email');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/email/i);
    });

    it('still sends email even if Discord fails', async () => {
      fetchSpy.mockRejectedValue(new Error('discord down'));

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.notificationsSent).toContain('email');
      expect(result.notificationsSent).not.toContain('discord');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/discord/i);
    });
  });

  describe('DB query failure', () => {
    it('returns skipped=true and captures the DB error without throwing', async () => {
      mockQuery.mockRejectedValue(new Error('pg: connection reset'));

      const result = await checkAndSendPruneOverdueAlert();

      expect(result.skipped).toBe(true);
      expect(result.notificationsSent).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/DB error/i);
      expect(result.errors[0]).toMatch(/pg: connection reset/);
    });
  });
});

// ─── Unit tests: /api/scheduler/prune-overdue-alert handler ──────────────────

describe('/api/scheduler/prune-overdue-alert handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...savedEnv,
      MIRDT_SCAN_KEY: 'test-scan-key',
      PRUNE_ALERT_EMAIL: '',
      PRUNE_ALERT_DISCORD_WEBHOOK: '',
    };

    // Default: healthy prune (skipped=true, no notifications)
    mockQuery.mockResolvedValue({
      rows: [
        {
          pruned_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      rowCount: 1,
    });

    // Default email client mock (used when PRUNE_ALERT_EMAIL is set)
    mockGetResendClient.mockResolvedValue({
      client: { emails: { send: mockEmailSend } },
      fromEmail: 'alerts@axiomprotocol.app',
    });
    mockEmailSend.mockResolvedValue({ id: 'mock-email-id' });
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  describe('HTTP method guard', () => {
    it('returns 405 for GET requests', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ method: 'GET', headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );
      expect(statusCode()).toBe(405);
      expect((body() as { success: boolean }).success).toBe(false);
    });

    it('returns 405 for PUT requests', async () => {
      const { res, statusCode } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ method: 'PUT', headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );
      expect(statusCode()).toBe(405);
    });

    it('returns 405 for DELETE requests', async () => {
      const { res, statusCode } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({
          method: 'DELETE',
          headers: { 'x-scan-key': 'test-scan-key' },
        }),
        res,
      );
      expect(statusCode()).toBe(405);
    });

    it('error body for 405 includes error field', async () => {
      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ method: 'GET', headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );
      expect((body() as { error: string }).error).toBeTruthy();
    });
  });

  describe('authorization', () => {
    it('returns 401 when x-scan-key header is absent', async () => {
      const { res, statusCode, body } = makeRes();
      await pruneOverdueAlertHandler(makeReq({ headers: {} }), res);
      expect(statusCode()).toBe(401);
      expect((body() as { success: boolean; error: string }).success).toBe(
        false,
      );
      expect((body() as { error: string }).error).toBe('Unauthorized');
    });

    it('returns 401 when x-scan-key header is wrong', async () => {
      const { res, statusCode } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'wrong-key' } }),
        res,
      );
      expect(statusCode()).toBe(401);
    });

    it('returns 200 when correct x-scan-key is provided', async () => {
      const { res, statusCode } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );
      expect(statusCode()).toBe(200);
    });

    it('allows any request in development when MIRDT_SCAN_KEY is unset', async () => {
      process.env = {
        ...savedEnv,
        MIRDT_SCAN_KEY: undefined as unknown as string,
        NODE_ENV: 'development',
        PRUNE_ALERT_EMAIL: '',
        PRUNE_ALERT_DISCORD_WEBHOOK: '',
      };

      const { res, statusCode } = makeRes();
      await pruneOverdueAlertHandler(makeReq({ headers: {} }), res);
      expect(statusCode()).toBe(200);
    });
  });

  describe('response shape', () => {
    it('200 response includes success, overdue, status, notificationsSent, errors, skipped', async () => {
      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      const b = body() as Record<string, unknown>;
      expect(b).toHaveProperty('success', true);
      expect(b).toHaveProperty('overdue');
      expect(b).toHaveProperty('status');
      expect(b).toHaveProperty('notificationsSent');
      expect(b).toHaveProperty('errors');
      expect(b).toHaveProperty('skipped');
      expect(b).toHaveProperty('thresholdHours');
    });

    it('returns overdue=false and skipped=true for a healthy prune', async () => {
      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      const b = body() as {
        overdue: boolean;
        skipped: boolean;
        status: string;
      };
      expect(b.overdue).toBe(false);
      expect(b.skipped).toBe(true);
      expect(b.status).toBe('ok');
    });

    it('returns overdue=true and skipped=true when stale but no channels configured', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = '';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';

      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      const b = body() as {
        overdue: boolean;
        skipped: boolean;
        status: string;
      };
      expect(b.overdue).toBe(true);
      expect(b.skipped).toBe(true);
      expect(b.status).toBe('stale');
    });

    it('returns overdue=true and skipped=false when stale with email configured', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 2) * 60 * 60 * 1000;
      mockQuery.mockResolvedValue({
        rows: [{ pruned_at: new Date(Date.now() - staleMs).toISOString() }],
        rowCount: 1,
      });
      process.env.PRUNE_ALERT_EMAIL = 'ops@example.com';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';
      mockEmailSend.mockResolvedValue({ id: 'email-id' });

      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      const b = body() as {
        overdue: boolean;
        skipped: boolean;
        notificationsSent: string[];
      };
      expect(b.overdue).toBe(true);
      expect(b.skipped).toBe(false);
      expect(b.notificationsSent).toContain('email');
    });

    it('returns overdue=true, status=never_run when history table is empty', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      process.env.PRUNE_ALERT_EMAIL = '';
      process.env.PRUNE_ALERT_DISCORD_WEBHOOK = '';

      const { res, statusCode, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      expect(statusCode()).toBe(200);
      const b = body() as { overdue: boolean; status: string };
      expect(b.overdue).toBe(true);
      expect(b.status).toBe('never_run');
    });

    it('lastPrunedAt and hoursSincePrune are null for never_run', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const { res, body } = makeRes();
      await pruneOverdueAlertHandler(
        makeReq({ headers: { 'x-scan-key': 'test-scan-key' } }),
        res,
      );

      const b = body() as {
        lastPrunedAt: null;
        hoursSincePrune: null;
      };
      expect(b.lastPrunedAt).toBeNull();
      expect(b.hoursSincePrune).toBeNull();
    });
  });
});

// ─── Integration tests (require DATABASE_URL + MIRDT_SCAN_KEY + running server) ──
//
// These tests seed rows via the real database, then exercise the live HTTP
// endpoint with real fetch calls. They are skipped unless both DATABASE_URL
// *and* MIRDT_SCAN_KEY are set so that CI environments which have a DB but no
// running Next.js server (or no scan key configured) do not produce false
// failures. If the server is unavailable the fetch calls will throw and the
// test will fail with a clear network error rather than a misleading assertion.

const INTEGRATION_DB_URL = process.env.DATABASE_URL;
const INTEGRATION_SCAN_KEY = process.env.MIRDT_SCAN_KEY;
const integrationDescribe =
  INTEGRATION_DB_URL && INTEGRATION_SCAN_KEY ? describe : describe.skip;

interface PruneOverdueAlertResponse {
  success: boolean;
  overdue: boolean;
  status: 'ok' | 'stale' | 'never_run';
  lastPrunedAt: string | null;
  hoursSincePrune: number | null;
  thresholdHours: number;
  notificationsSent: string[];
  errors: string[];
  skipped: boolean;
  cleanup?: {
    deletedCount: number;
    retentionDays: number;
    error: string | null;
  };
}

integrationDescribe(
  '/api/scheduler/prune-overdue-alert integration (real DB)',
  () => {
    let pgPool: Pool;
    const insertedIds: number[] = [];
    const baseUrl = `http://localhost:${process.env.PORT ?? 5000}`;
    const endpoint = `${baseUrl}/api/scheduler/prune-overdue-alert`;

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

    it('rejects with 401 when x-scan-key is missing', async () => {
      const resp = await fetch(endpoint, { method: 'POST' });
      expect(resp.status).toBe(401);
    });

    it('rejects with 401 when x-scan-key is wrong', async () => {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-scan-key': 'definitely-wrong-key' },
      });
      expect(resp.status).toBe(401);
    });

    it('rejects with 405 for GET requests', async () => {
      const resp = await fetch(endpoint, {
        method: 'GET',
        headers: { 'x-scan-key': INTEGRATION_SCAN_KEY ?? '' },
      });
      expect(resp.status).toBe(405);
    });

    it('returns overdue=false and skipped=true after a recent prune is seeded', async () => {
      const recentPrunedAt = new Date(Date.now() - 60 * 60 * 1000);
      await seedPruneHistory(recentPrunedAt);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-scan-key': INTEGRATION_SCAN_KEY ?? '' },
      });
      const body = (await resp.json()) as PruneOverdueAlertResponse;

      expect(resp.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.overdue).toBe(false);
      expect(body.status).toBe('ok');
      expect(body.skipped).toBe(true);
      expect(body.notificationsSent).toEqual([]);
      expect(body.lastPrunedAt).not.toBeNull();
      expect(body.thresholdHours).toBe(PRUNE_STALE_HOURS);
    });

    it('returns overdue=true with status=stale after an old prune is seeded', async () => {
      const staleMs = (PRUNE_STALE_HOURS + 5) * 60 * 60 * 1000;
      const stalePrunedAt = new Date(Date.now() - staleMs);
      await seedPruneHistory(stalePrunedAt);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-scan-key': INTEGRATION_SCAN_KEY ?? '' },
      });
      const body = (await resp.json()) as PruneOverdueAlertResponse;

      expect(resp.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.overdue).toBe(true);
      expect(body.status).toBe('stale');
      expect(body.lastPrunedAt).not.toBeNull();
      expect(body.hoursSincePrune).not.toBeNull();
      expect(body.hoursSincePrune!).toBeGreaterThan(PRUNE_STALE_HOURS);
      expect(body.thresholdHours).toBe(PRUNE_STALE_HOURS);
    });

    it('response body always includes the documented fields', async () => {
      const recentPrunedAt = new Date(Date.now() - 60 * 60 * 1000);
      await seedPruneHistory(recentPrunedAt);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-scan-key': INTEGRATION_SCAN_KEY ?? '' },
      });
      const body = (await resp.json()) as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('overdue');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('lastPrunedAt');
      expect(body).toHaveProperty('hoursSincePrune');
      expect(body).toHaveProperty('thresholdHours');
      expect(body).toHaveProperty('notificationsSent');
      expect(body).toHaveProperty('errors');
      expect(body).toHaveProperty('skipped');
    });
  },
);
