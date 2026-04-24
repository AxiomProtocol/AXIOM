/**
 * Tests for the on-call pager that fans `collateral.integrity_failed`
 * notifications out to email + Discord.
 *
 * Covers:
 *  1. pageOnCallForIntegrityFailure (lib/capinfra/notifications/integrityPager.ts)
 *     - skipped=true when no channels configured
 *     - email channel only → email sent, fetch not called
 *     - Discord channel only → fetch called, email not called
 *     - both channels → both invoked
 *     - email send failure → captured, function still resolves
 *     - Discord HTTP failure → captured, function still resolves
 *     - never throws (resolves with errors[] populated)
 *     - email recipients trimmed and split on comma
 *     - subject + payload include asset symbol / kind
 *  2. recordIntegrityFailure (lib/capinfra/risk/integrity.ts) integration
 *     - calls the pager exactly once per real RED transition
 *     - does NOT call the pager when the asset is already RED
 *     - swallows pager throws (defense-in-depth) so the downgrade path
 *       still returns success
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

const mockEmailSend = vi.fn();
const mockGetResendClient = vi.fn();

vi.mock('../lib/email/resend', () => ({
  getResendClient: (...args: unknown[]) => mockGetResendClient(...args),
}));

const {
  pageOnCallForIntegrityFailure,
  __resetIntegrityPagerWarningForTests,
} = await import('../lib/capinfra/notifications/integrityPager');

const savedEnv = { ...process.env };

function basePayload(overrides: Partial<Parameters<typeof pageOnCallForIntegrityFailure>[0]> = {}) {
  return {
    assetId: 'ast_test_001',
    symbol: 'AXUSD',
    assetType: 'STABLE',
    kind: 'oracle_stale',
    detail: 'oracle has not ticked in 600s',
    rationale: '[2026-04-24T00:00:00.000Z] Oracle staleness exceeded budget: oracle has not ticked in 600s',
    previousClass: 'GREEN' as const,
    actor: 'monitor:oracle-watcher',
    correlationId: 'corr_test_001',
    ...overrides,
  };
}

describe('pageOnCallForIntegrityFailure', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    __resetIntegrityPagerWarningForTests();
    process.env = {
      ...savedEnv,
      INTEGRITY_ALERT_EMAIL: '',
      INTEGRITY_ALERT_DISCORD_WEBHOOK: '',
    };

    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    mockGetResendClient.mockResolvedValue({
      client: { emails: { send: mockEmailSend } },
      fromEmail: 'alerts@axiomprotocol.app',
    });
    mockEmailSend.mockResolvedValue({ id: 'email-id' });
  });

  afterEach(() => {
    process.env = savedEnv;
    vi.unstubAllGlobals();
  });

  it('returns skipped=true and no errors when no channels are configured', async () => {
    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.skipped).toBe(true);
    expect(result.channelsPaged).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends only email when only INTEGRITY_ALERT_EMAIL is configured', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.skipped).toBe(false);
    expect(result.channelsPaged).toEqual(['email']);
    expect(result.errors).toEqual([]);
    expect(mockEmailSend).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('email subject + html include the asset symbol and failure kind', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';

    await pageOnCallForIntegrityFailure(
      basePayload({ symbol: 'AXAU', kind: 'reserve_attestation_failed' }),
    );

    const call = mockEmailSend.mock.calls[0][0] as {
      subject: string;
      html: string;
      to: string[];
      from: string;
    };
    expect(call.subject).toMatch(/PAGE/);
    expect(call.subject).toMatch(/AXAU/);
    expect(call.subject).toMatch(/reserve_attestation_failed/);
    expect(call.html).toMatch(/Asset Auto-Frozen to RED/);
    expect(call.html).toMatch(/AXAU/);
    expect(call.html).toMatch(/reserve_attestation_failed/);
    expect(call.to).toEqual(['oncall@example.com']);
    expect(call.from).toBe('alerts@axiomprotocol.app');
  });

  it('trims whitespace and splits comma-separated email recipients', async () => {
    process.env.INTEGRITY_ALERT_EMAIL =
      '  alice@example.com , bob@example.com  ,';

    await pageOnCallForIntegrityFailure(basePayload());

    const call = mockEmailSend.mock.calls[0][0] as { to: string[] };
    expect(call.to).toEqual(['alice@example.com', 'bob@example.com']);
  });

  it('sends only Discord when only INTEGRITY_ALERT_DISCORD_WEBHOOK is configured', async () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.skipped).toBe(false);
    expect(result.channelsPaged).toEqual(['discord']);
    expect(result.errors).toEqual([]);
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('Discord POST body carries the structured embed payload', async () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    await pageOnCallForIntegrityFailure(
      basePayload({ symbol: 'TBILL', kind: 'redemption_failed' }),
    );

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://discord.com/api/webhooks/123/abc');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
    const payload = JSON.parse(options.body as string);
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toMatch(/RED/);
    const fieldNames = (
      payload.embeds[0].fields as Array<{ name: string; value: string }>
    ).map((f) => f.name);
    expect(fieldNames).toContain('Asset');
    expect(fieldNames).toContain('Failure Kind');
    expect(fieldNames).toContain('Rationale');
    const assetField = (
      payload.embeds[0].fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === 'Asset');
    expect(assetField?.value).toBe('TBILL');
  });

  it('falls back to assetId in Discord field when symbol is null', async () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    await pageOnCallForIntegrityFailure(
      basePayload({ symbol: null, assetId: 'ast_unknown' }),
    );

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string);
    const assetField = (
      payload.embeds[0].fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === 'Asset');
    expect(assetField?.value).toBe('ast_unknown');
  });

  it('fires both channels when both env vars are configured', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.channelsPaged).toEqual(['email', 'discord']);
    expect(result.errors).toEqual([]);
    expect(mockEmailSend).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('captures email failure without throwing and still pages Discord', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    mockEmailSend.mockRejectedValue(new Error('SMTP timeout'));
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.channelsPaged).toEqual(['discord']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/email/);
    expect(result.errors[0]).toMatch(/SMTP timeout/);
  });

  it('captures Discord HTTP error without throwing and still pages email', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    } as unknown as Response);

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.channelsPaged).toEqual(['email']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/discord/);
    expect(result.errors[0]).toMatch(/429/);
  });

  it('captures Discord network failure without throwing', async () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockRejectedValue(new Error('network unreachable'));

    const result = await pageOnCallForIntegrityFailure(basePayload());

    expect(result.channelsPaged).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/discord/);
    expect(result.errors[0]).toMatch(/network unreachable/);
  });

  it('never throws even if Resend client construction fails', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';
    mockGetResendClient.mockRejectedValue(new Error('Resend not connected'));

    await expect(
      pageOnCallForIntegrityFailure(basePayload()),
    ).resolves.toBeDefined();
  });
});

// ── Integration: recordIntegrityFailure → pager wiring ────────────────

describe('recordIntegrityFailure → pager dispatch wiring', () => {
  const mockPager = vi.fn();
  const mockEmitNotification = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockPager.mockReset();
    mockEmitNotification.mockReset();
    mockPager.mockResolvedValue({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });
    mockEmitNotification.mockResolvedValue('ntf_test');
  });

  async function loadIntegrityWithMocks(opts: {
    alreadyRed?: boolean;
    pagerImpl?: () => Promise<unknown> | unknown;
  } = {}) {
    const alreadyRed = opts.alreadyRed ?? false;

    if (opts.pagerImpl) {
      mockPager.mockImplementation(opts.pagerImpl as never);
    }

    // Mock the DB transaction so we never touch a real database.
    vi.doMock('../server/db', () => ({
      db: {
        transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  limit: async () => [
                    alreadyRed
                      ? {
                          id: 'ast_red',
                          symbol: 'AXUSD',
                          assetType: 'STABLE',
                          collateralClass: 'RED',
                        }
                      : {
                          id: 'ast_green',
                          symbol: 'AXUSD',
                          assetType: 'STABLE',
                          collateralClass: 'GREEN',
                        },
                  ],
                }),
              }),
            }),
            update: () => ({
              set: () => ({ where: async () => undefined }),
            }),
            insert: () => ({ values: async () => undefined }),
          };
          return fn(tx);
        },
      },
    }));

    vi.doMock('../lib/capinfra/audit', () => ({
      emitAuditEventStrict: vi.fn(async () => undefined),
    }));

    vi.doMock('../lib/capinfra/notifications', () => ({
      emitNotification: (...args: unknown[]) => mockEmitNotification(...args),
    }));

    vi.doMock('../lib/capinfra/notifications/integrityPager', () => ({
      pageOnCallForIntegrityFailure: (...args: unknown[]) => mockPager(...args),
      __resetIntegrityPagerWarningForTests: () => undefined,
    }));

    const mod = await import('../lib/capinfra/risk/integrity');
    mod.__resetIntegrityNotificationDedupForTests();
    return mod;
  }

  afterEach(() => {
    vi.doUnmock('../server/db');
    vi.doUnmock('../lib/capinfra/audit');
    vi.doUnmock('../lib/capinfra/notifications');
    vi.doUnmock('../lib/capinfra/notifications/integrityPager');
  });

  it('invokes the pager exactly once on a real GREEN→RED transition', async () => {
    const { recordIntegrityFailure } = await loadIntegrityWithMocks();

    const out = await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'stale 600s',
      actor: 'monitor:test',
      correlationId: 'corr_001',
    });

    expect(out.alreadyRed).toBe(false);
    expect(mockPager).toHaveBeenCalledTimes(1);
    const payload = mockPager.mock.calls[0][0];
    expect(payload).toMatchObject({
      assetId: 'ast_green',
      symbol: 'AXUSD',
      kind: 'oracle_stale',
      detail: 'stale 600s',
      previousClass: 'GREEN',
      actor: 'monitor:test',
      correlationId: 'corr_001',
    });
    expect(payload.rationale).toMatch(/Oracle staleness exceeded budget/);
  });

  it('does NOT page when the asset is already RED', async () => {
    const { recordIntegrityFailure } = await loadIntegrityWithMocks({
      alreadyRed: true,
    });

    const out = await recordIntegrityFailure({
      assetId: 'ast_red',
      kind: 'oracle_stale',
      detail: 'still stale',
      actor: 'monitor:test',
    });

    expect(out.alreadyRed).toBe(true);
    expect(mockPager).not.toHaveBeenCalled();
    expect(mockEmitNotification).not.toHaveBeenCalled();
  });

  it('returns a clean result even if the pager throws unexpectedly', async () => {
    const { recordIntegrityFailure } = await loadIntegrityWithMocks({
      pagerImpl: async () => {
        throw new Error('pager exploded');
      },
    });

    const out = await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'stale 600s',
      actor: 'monitor:test',
    });

    expect(out.newClass).toBe('RED');
    expect(out.alreadyRed).toBe(false);
    expect(mockPager).toHaveBeenCalledTimes(1);
  });

  it('dedup window suppresses repeat pager calls for the same (asset, kind)', async () => {
    const { recordIntegrityFailure, __resetIntegrityNotificationDedupForTests } =
      await loadIntegrityWithMocks();
    __resetIntegrityNotificationDedupForTests();

    // First call: fresh dedup state, pager is invoked.
    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'first',
      actor: 'monitor:test',
    });
    expect(mockPager).toHaveBeenCalledTimes(1);

    // Second call: the producer's transaction returns alreadyRed=false in
    // our mock (no real DB state mutation), but the in-process dedup map
    // for `emitNotification` was marked by the first call. Verify the
    // notification AND the pager are both gated by the same edge-trigger.
    // In our mock environment the asset row is still GREEN so the dedup
    // applies via the (asset, kind) window only — both notification and
    // pager must therefore be skipped.
    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'second',
      actor: 'monitor:test',
    });
    expect(mockPager).toHaveBeenCalledTimes(1);
    expect(mockEmitNotification).toHaveBeenCalledTimes(1);
  });
});
