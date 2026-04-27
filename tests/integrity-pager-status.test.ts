/**
 * Tests for the integrity-pager configuration probe (Task #305).
 *
 * The probe is shared by:
 *   - SSR on /operator and /operator/integrity (renders the banner)
 *   - GET /api/capinfra/operator/integrity-pager-status (browser probe)
 *   - The pager itself (`integrityPager.ts` re-exports the env reads)
 *
 * Pinning these here keeps the banner from drifting away from what
 * the pager actually sees.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const {
  getIntegrityPagerStatus,
  readIntegrityAlertEmailRecipients,
  readIntegrityAlertDiscordWebhook,
} = await import(
  '../lib/capinfra/notifications/integrityPagerStatus'
);

const savedEnv = { ...process.env };

beforeEach(() => {
  delete process.env.INTEGRITY_ALERT_EMAIL;
  delete process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK;
});

afterEach(() => {
  process.env = { ...savedEnv };
});

describe('getIntegrityPagerStatus', () => {
  it('reports neither configured when both env vars are absent', () => {
    const s = getIntegrityPagerStatus();
    expect(s).toEqual({
      email: false,
      discord: false,
      anyConfigured: false,
      bothConfigured: false,
    });
  });

  it('treats whitespace-only env vars as unconfigured', () => {
    process.env.INTEGRITY_ALERT_EMAIL = '   ,  ,   ';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK = '   ';
    expect(getIntegrityPagerStatus()).toEqual({
      email: false,
      discord: false,
      anyConfigured: false,
      bothConfigured: false,
    });
  });

  it('reports email-only configured when only INTEGRITY_ALERT_EMAIL is set', () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    expect(getIntegrityPagerStatus()).toEqual({
      email: true,
      discord: false,
      anyConfigured: true,
      bothConfigured: false,
    });
  });

  it('reports discord-only configured when only the webhook is set', () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/1/abc';
    expect(getIntegrityPagerStatus()).toEqual({
      email: false,
      discord: true,
      anyConfigured: true,
      bothConfigured: false,
    });
  });

  it('reports both configured when both env vars are set', () => {
    process.env.INTEGRITY_ALERT_EMAIL = 'oncall@axiomprotocol.app';
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK =
      'https://discord.com/api/webhooks/1/abc';
    expect(getIntegrityPagerStatus()).toEqual({
      email: true,
      discord: true,
      anyConfigured: true,
      bothConfigured: true,
    });
  });

  it('matches the pager: comma-separated email lists count as configured even with messy whitespace', () => {
    process.env.INTEGRITY_ALERT_EMAIL = ' a@x.com , , b@x.com ';
    expect(readIntegrityAlertEmailRecipients()).toEqual([
      'a@x.com',
      'b@x.com',
    ]);
    expect(getIntegrityPagerStatus().email).toBe(true);
  });

  it('matches the pager: webhook is trimmed before the empty check', () => {
    process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK = '   https://x   ';
    expect(readIntegrityAlertDiscordWebhook()).toBe('https://x');
    expect(getIntegrityPagerStatus().discord).toBe(true);
  });
});
