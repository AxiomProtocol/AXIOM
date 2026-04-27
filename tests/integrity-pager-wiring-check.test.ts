/**
 * Tests for the scheduled integrity pager wiring check (Task #306).
 *
 * Covers:
 *  1. runIntegrityPagerWiringCheck()
 *     - Healthy: both channels configured, both reached → ok=true,
 *       owner email NOT sent, run persisted with ok=true.
 *     - Healthy: only email configured, only email reached → ok=true.
 *     - Failure: a channel reported in pagerErrors → ok=false, owner
 *       notified, persisted with ok=false.
 *     - Failure: a channel was expected but missing from channelsPaged
 *       → ok=false, missingChannels populated, owner notified.
 *     - Failure: pager skipped (no channels configured) → ok=false,
 *       skippedReason='no_channels_configured', owner notified with
 *       the dedicated subject.
 *     - Owner email NOT configured + failure → ownerNotified=false,
 *       ownerEmailConfigured=false, persisted but no email send.
 *     - Owner email send throws → ownerNotified=false,
 *       ownerNotifyError populated, run still persisted.
 *     - Persist throws → result still returned to caller, persistError
 *       populated.
 *  2. getLastIntegrityPagerWiringCheckRun()
 *     - Empty table → null.
 *     - DB throws → null (best-effort).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPagerSend = vi.fn();
const mockEmailSend = vi.fn();
const mockGetResendClient = vi.fn();
const mockPoolQuery = vi.fn();

vi.mock('../lib/capinfra/notifications/integrityPager', () => ({
  pageOnCallForIntegrityFailure: (...args: unknown[]) =>
    mockPagerSend(...args),
}));

vi.mock('../lib/email/resend', () => ({
  getResendClient: (...args: unknown[]) => mockGetResendClient(...args),
}));

vi.mock('../server/db', () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

const {
  runIntegrityPagerWiringCheck,
  getLastIntegrityPagerWiringCheckRun,
  readIntegrityPagerWiringOwnerEmails,
  getExpectedPagerChannels,
  __resetWiringCheckWarningsForTests,
  SYNTHETIC_WIRING_CHECK_ASSET_ID,
  SYNTHETIC_WIRING_CHECK_KIND,
  DEFAULT_WIRING_CHECK_ACTOR,
} = await import(
  '../lib/capinfra/notifications/integrityPagerWiringCheck'
);

const savedEnv = { ...process.env };

beforeEach(() => {
  vi.resetAllMocks();
  __resetWiringCheckWarningsForTests();
  process.env = {
    ...savedEnv,
    INTEGRITY_ALERT_EMAIL: '',
    INTEGRITY_ALERT_DISCORD_WEBHOOK: '',
    INTEGRITY_PAGER_WIRING_OWNER_EMAIL: '',
  };
  mockGetResendClient.mockResolvedValue({
    client: { emails: { send: mockEmailSend } },
    fromEmail: 'alerts@axiomprotocol.app',
  });
  mockEmailSend.mockResolvedValue({ id: 'email-id' });
  mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe('runIntegrityPagerWiringCheck — healthy paths', () => {
  it('returns ok=true and does NOT email the runbook owner when both channels reach', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/1/abc';
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      'sre-lead@axiomprotocol.app';

    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email', 'discord'],
      errors: [],
      skipped: false,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(true);
    expect(result.expectedChannels).toEqual(['email', 'discord']);
    expect(result.channelsPaged).toEqual(['email', 'discord']);
    expect(result.missingChannels).toEqual([]);
    expect(result.pagerErrors).toEqual([]);
    expect(result.skippedReason).toBeNull();
    expect(result.ownerNotified).toBe(false);
    expect(result.ownerNotifyError).toBeNull();
    expect(result.ownerEmailConfigured).toBe(true);
    expect(result.persistError).toBeNull();
    expect(mockEmailSend).not.toHaveBeenCalled();

    // Persisted exactly one row with ok=true.
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockPoolQuery.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe(true); // ok
    expect(params[2]).toEqual(['email', 'discord']); // expected_channels
    expect(params[3]).toEqual(['email', 'discord']); // channels_paged
    expect(params[10]).toBe('scheduler'); // triggered_by
  });

  it('passes a synthetic testPage payload to the pager', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });

    await runIntegrityPagerWiringCheck();

    expect(mockPagerSend).toHaveBeenCalledTimes(1);
    const payload = mockPagerSend.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.testPage).toBe(true);
    expect(payload.assetId).toBe(SYNTHETIC_WIRING_CHECK_ASSET_ID);
    expect(payload.kind).toBe(SYNTHETIC_WIRING_CHECK_KIND);
    expect(payload.previousClass).toBe('GREEN');
    expect(payload.actor).toBe(DEFAULT_WIRING_CHECK_ACTOR);
  });

  it('treats email-only configured + email reached as healthy', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(true);
    expect(result.expectedChannels).toEqual(['email']);
    expect(result.missingChannels).toEqual([]);
    expect(mockEmailSend).not.toHaveBeenCalled();
  });
});

describe('runIntegrityPagerWiringCheck — unhealthy paths', () => {
  it('sets ok=false and notifies the owner when a channel reports an error', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/1/abc';
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      'sre-lead@axiomprotocol.app';

    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: ['discord: HTTP 404'],
      skipped: false,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(false);
    expect(result.pagerErrors).toEqual(['discord: HTTP 404']);
    expect(result.missingChannels).toEqual(['discord']);
    expect(result.ownerNotified).toBe(true);
    expect(result.ownerNotifyError).toBeNull();
    expect(mockEmailSend).toHaveBeenCalledTimes(1);
    const sendArgs = mockEmailSend.mock.calls[0][0] as Record<string, unknown>;
    expect(sendArgs.to).toEqual(['sre-lead@axiomprotocol.app']);
    expect(String(sendArgs.subject)).toMatch(/FAILED/);

    // Persisted exactly one row with ok=false.
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockPoolQuery.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe(false);
    expect(params[6]).toBe(true); // owner_notified
  });

  it('sets ok=false and lists missing channels when a configured channel never reaches', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/1/abc';
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      'sre-lead@axiomprotocol.app';

    // Pager only managed to reach email even though both env vars were set.
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(false);
    expect(result.missingChannels).toEqual(['discord']);
    expect(result.ownerNotified).toBe(true);
  });

  it('treats no-channels-configured as a failure and uses a dedicated subject', async () => {
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      'sre-lead@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: [],
      errors: [],
      skipped: true,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(false);
    expect(result.skippedReason).toBe('no_channels_configured');
    expect(result.expectedChannels).toEqual([]);
    expect(result.ownerNotified).toBe(true);
    const sendArgs = mockEmailSend.mock.calls[0][0] as Record<string, unknown>;
    expect(String(sendArgs.subject)).toMatch(/no channels configured/);
  });

  it('does NOT email the owner when owner is not configured, but still persists the failure', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: [],
      errors: ['email: send failed'],
      skipped: false,
    });

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(false);
    expect(result.ownerEmailConfigured).toBe(false);
    expect(result.ownerNotified).toBe(false);
    expect(result.ownerNotifyError).toBeNull();
    expect(mockEmailSend).not.toHaveBeenCalled();
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('captures owner email errors without throwing, and still persists', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      'sre-lead@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: [],
      errors: ['email: send failed'],
      skipped: false,
    });
    mockEmailSend.mockRejectedValueOnce(new Error('Resend disconnected'));

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(false);
    expect(result.ownerNotified).toBe(false);
    expect(result.ownerNotifyError).toMatch(/Resend disconnected/);
    expect(result.persistError).toBeNull();
  });

  it('returns the result even when persistence fails', async () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    mockPagerSend.mockResolvedValueOnce({
      channelsPaged: ['email'],
      errors: [],
      skipped: false,
    });
    mockPoolQuery.mockRejectedValueOnce(new Error('connection lost'));

    const result = await runIntegrityPagerWiringCheck();

    expect(result.ok).toBe(true);
    expect(result.persistError).toMatch(/connection lost/);
  });
});

describe('readIntegrityPagerWiringOwnerEmails', () => {
  it('parses comma-separated lists with whitespace tolerance', () => {
    process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL =
      ' a@x.com , , b@x.com ';
    expect(readIntegrityPagerWiringOwnerEmails()).toEqual([
      'a@x.com',
      'b@x.com',
    ]);
  });

  it('returns an empty array when unset', () => {
    delete process.env.INTEGRITY_PAGER_WIRING_OWNER_EMAIL;
    expect(readIntegrityPagerWiringOwnerEmails()).toEqual([]);
  });
});

describe('getExpectedPagerChannels', () => {
  it('matches the pager status helper exactly', () => {
    process.env.INTEGRITY_ALERT_EMAIL = ' x@y.com ';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK = ' https://h ';
    expect(getExpectedPagerChannels()).toEqual(['email', 'discord']);
  });
});

describe('getLastIntegrityPagerWiringCheckRun', () => {
  it('returns null when the table is empty', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await getLastIntegrityPagerWiringCheckRun()).toBeNull();
  });

  it('maps a row to a record', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          ran_at: new Date('2026-04-25T00:00:00.000Z'),
          ok: true,
          expected_channels: ['email', 'discord'],
          channels_paged: ['email', 'discord'],
          pager_errors: [],
          missing_channels: [],
          owner_notified: false,
          owner_notify_error: null,
          owner_email_configured: true,
          skipped_reason: null,
          triggered_by: 'scheduler',
        },
      ],
    });
    const rec = await getLastIntegrityPagerWiringCheckRun();
    expect(rec).not.toBeNull();
    expect(rec?.ranAt).toBe('2026-04-25T00:00:00.000Z');
    expect(rec?.ok).toBe(true);
    expect(rec?.expectedChannels).toEqual(['email', 'discord']);
    expect(rec?.triggeredBy).toBe('scheduler');
  });

  it('returns null when the DB read fails', async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error('boom'));
    expect(await getLastIntegrityPagerWiringCheckRun()).toBeNull();
  });
});
