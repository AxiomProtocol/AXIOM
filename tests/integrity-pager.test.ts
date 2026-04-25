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

  // ── testPage marker (task #257) ─────────────────────────────────────
  //
  // The test-page endpoint passes `testPage: true` so on-call can tell
  // a wiring verification apart from a real auto-freeze. Pin the visible
  // markers here so a regression that strips the marker (and revives the
  // "is this a real freeze?!" 3am page) fails CI.

  it('email subject is prefixed [TEST PAGE] when testPage is true', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';

    await pageOnCallForIntegrityFailure(
      basePayload({ testPage: true, symbol: 'TEST-PAGE', kind: 'test_page' }),
    );

    const call = mockEmailSend.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(call.subject.startsWith('[TEST PAGE]')).toBe(true);
    expect(call.subject).not.toMatch(/\[PAGE\]/);
    expect(call.subject).toMatch(/wiring check/i);
    // The email body must also call the test out so a forwarded copy is
    // unambiguous outside the subject line.
    expect(call.html).toMatch(/TEST PAGE/);
    expect(call.html).toMatch(/no operator action is required/i);
    // The static "asset is already RED" footer must NOT appear on a
    // test page — it would tell on-call to look at policy state for
    // an asset that does not exist.
    expect(call.html).not.toMatch(/already RED in the policy evaluator/);
    expect(call.html).toMatch(/No collateral state was changed/);
  });

  it('Discord embed title + footer mark the message as a TEST PAGE', async () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    await pageOnCallForIntegrityFailure(
      basePayload({ testPage: true, symbol: 'TEST-PAGE', kind: 'test_page' }),
    );

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string);
    expect(payload.embeds[0].title).toMatch(/TEST PAGE/);
    expect(payload.embeds[0].title).not.toMatch(/auto-frozen/i);
    expect(payload.embeds[0].footer.text).toMatch(/no action required/i);
    expect(payload.embeds[0].description).toMatch(/TEST PAGE/);
  });

  it('omits the [TEST PAGE] markers when testPage is undefined (real freeze path)', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@example.com';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/123/abc';
    fetchSpy.mockResolvedValue({ ok: true, status: 204 } as Response);

    await pageOnCallForIntegrityFailure(basePayload());

    const emailCall = mockEmailSend.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(emailCall.subject.startsWith('[PAGE]')).toBe(true);
    expect(emailCall.subject).not.toMatch(/TEST PAGE/);
    expect(emailCall.html).not.toMatch(/TEST PAGE/);
    // The production "asset is already RED" guidance must still
    // appear on real freezes — operators rely on it for runbook
    // disambiguation.
    expect(emailCall.html).toMatch(/already RED in the policy evaluator/);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options.body as string);
    expect(payload.embeds[0].title).not.toMatch(/TEST PAGE/);
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

  // ── Regression coverage for task #236 ──────────────────────────────
  //
  // The (asset, kind) dedup window inside `recordIntegrityFailure` lives
  // in process memory by design: it must NOT silently swallow alerts
  // across restarts (or after a manual GREEN re-listing), and it must
  // continue to dedup distinct callers within a single window. The
  // existing smoke check (capinfra-smoke.ts #77) only proves the first
  // emission, so the three tests below pin the dedup behaviour itself
  // so a regression — e.g. moving the map to a long-lived global with
  // no TTL, or extending the window to dedup across distinct kinds —
  // fails CI here instead of going silent in production.

  it('emits exactly one operator notification row when called twice for the same (asset, kind) inside the dedup window', async () => {
    const { recordIntegrityFailure } = await loadIntegrityWithMocks();

    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'stale tick #1',
      actor: 'monitor:test',
    });
    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'stale tick #2',
      actor: 'monitor:test',
    });

    expect(mockEmitNotification).toHaveBeenCalledTimes(1);
    const notifyArg = mockEmitNotification.mock.calls[0][0] as {
      topic: string;
      bodyJson: { assetId: string; kind: string };
    };
    expect(notifyArg.topic).toBe('collateral.integrity_failed');
    expect(notifyArg.bodyJson.assetId).toBe('ast_green');
    expect(notifyArg.bodyJson.kind).toBe('oracle_stale');
  });

  it('re-emits an operator notification row after the dedup window is reset (simulating process restart / manual restoration)', async () => {
    const { recordIntegrityFailure, __resetIntegrityNotificationDedupForTests } =
      await loadIntegrityWithMocks();

    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'first trip',
      actor: 'monitor:test',
    });
    expect(mockEmitNotification).toHaveBeenCalledTimes(1);

    // Simulate either a process restart or manual GREEN re-listing
    // followed by a new failure: the dedup window must NOT silently
    // swallow the next notification.
    __resetIntegrityNotificationDedupForTests();

    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'second trip after restore',
      actor: 'monitor:test',
    });

    expect(mockEmitNotification).toHaveBeenCalledTimes(2);
    const secondNotifyArg = mockEmitNotification.mock.calls[1][0] as {
      bodyJson: { kind: string; detail: string };
    };
    expect(secondNotifyArg.bodyJson.kind).toBe('oracle_stale');
    expect(secondNotifyArg.bodyJson.detail).toBe('second trip after restore');
  });

  // ── Regression coverage for task #260 ──────────────────────────────
  //
  // `markNotified` runs an opportunistic GC pass that prunes expired
  // entries from `recentNotifications` once the map exceeds 1000 keys.
  // Without coverage, a future change that drops the size threshold
  // (so GC never runs) or the timestamp comparison (so nothing is
  // actually deleted) would let the in-process map grow unboundedly
  // across long-lived servers touching many distinct (asset, kind)
  // pairs — the classic slow memory leak. The two tests below pin
  // the GC path so either regression fails CI here.

  it('prunes expired dedup entries once the map crosses the 1000-key size threshold', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T00:00:00Z'));
    try {
      const {
        recordIntegrityFailure,
        __resetIntegrityNotificationDedupForTests,
        __getIntegrityNotificationDedupSizeForTests,
      } = await loadIntegrityWithMocks();
      __resetIntegrityNotificationDedupForTests();

      // Fill the dedup map with 1001 distinct (asset, kind) pairs at T0.
      // The mocked DB returns the same fixture row regardless of the
      // queried assetId, but `markNotified` keys off the *input*
      // assetId, so each call adds a new entry to `recentNotifications`.
      for (let i = 0; i < 1001; i++) {
        await recordIntegrityFailure({
          assetId: `ast_fill_${i}`,
          kind: 'oracle_stale',
          detail: `fill ${i}`,
          actor: 'monitor:test',
        });
      }
      expect(__getIntegrityNotificationDedupSizeForTests()).toBe(1001);

      // Advance well past the 5-minute dedup window so every existing
      // entry's timestamp is now strictly older than NOTIFY_DEDUP_WINDOW_MS.
      vi.advanceTimersByTime(6 * 60 * 1000);

      // One more notification trips the `size > 1000` GC path inside
      // `markNotified`, which must evict every expired entry.
      await recordIntegrityFailure({
        assetId: 'ast_trigger',
        kind: 'oracle_stale',
        detail: 'post-gc',
        actor: 'monitor:test',
      });

      // All 1001 stale fillers should have been pruned; only the new
      // `ast_trigger` entry remains. If the timestamp comparison is
      // dropped (or `delete()` is no-op'd), every entry would still be
      // present and the map would be at 1002.
      expect(__getIntegrityNotificationDedupSizeForTests()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT prune dedup entries while the map stays below the size threshold', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T00:00:00Z'));
    try {
      const {
        recordIntegrityFailure,
        __resetIntegrityNotificationDedupForTests,
        __getIntegrityNotificationDedupSizeForTests,
      } = await loadIntegrityWithMocks();
      __resetIntegrityNotificationDedupForTests();

      // Add a small handful of entries (well below the 1000-key gate).
      for (let i = 0; i < 5; i++) {
        await recordIntegrityFailure({
          assetId: `ast_small_${i}`,
          kind: 'oracle_stale',
          detail: `small ${i}`,
          actor: 'monitor:test',
        });
      }
      expect(__getIntegrityNotificationDedupSizeForTests()).toBe(5);

      // Age them past the dedup window so they would be eligible for
      // pruning *if* GC ran...
      vi.advanceTimersByTime(6 * 60 * 1000);

      // ...but a fresh notification under the size threshold must NOT
      // trigger a GC pass — the threshold exists precisely to amortise
      // the O(n) sweep across many writes.
      await recordIntegrityFailure({
        assetId: 'ast_small_trigger',
        kind: 'oracle_stale',
        detail: 'post-window',
        actor: 'monitor:test',
      });

      // All 5 stale entries plus the new one are still in the map: GC
      // is gated on `size > 1000` and we are well below that.
      expect(__getIntegrityNotificationDedupSizeForTests()).toBe(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits a separate operator notification row for each distinct kind on the same asset', async () => {
    const { recordIntegrityFailure } = await loadIntegrityWithMocks();

    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'oracle_stale',
      detail: 'oracle stale',
      actor: 'monitor:test',
    });
    await recordIntegrityFailure({
      assetId: 'ast_green',
      kind: 'reserve_attestation_failed',
      detail: 'reserves negative',
      actor: 'monitor:test',
    });

    expect(mockEmitNotification).toHaveBeenCalledTimes(2);
    const kinds = mockEmitNotification.mock.calls.map(
      (c) => (c[0] as { bodyJson: { kind: string } }).bodyJson.kind,
    );
    expect(kinds).toEqual([
      'oracle_stale',
      'reserve_attestation_failed',
    ]);
  });
});
