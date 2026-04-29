/**
 * Tests for the integrity pager configuration probe and production
 * boot preflight check (Task #334).
 *
 * `assertIntegrityPagerConfigured` is tested via its injectable
 * dependency parameters so that neither `process.exit` nor a real
 * env-var mutation is needed in the normal test run.
 */

import { describe, it, expect } from 'vitest';
import {
  getIntegrityPagerStatus,
  assertIntegrityPagerConfigured,
} from './integrityPagerStatus';

// ── helpers ──────────────────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    original[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

// ── getIntegrityPagerStatus ───────────────────────────────────────────────────

describe('getIntegrityPagerStatus', () => {
  it('reports both false when neither env var is set', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.email).toBe(false);
        expect(status.discord).toBe(false);
        expect(status.anyConfigured).toBe(false);
        expect(status.bothConfigured).toBe(false);
      },
    );
  });

  it('reports email true when INTEGRITY_ALERT_EMAIL has a recipient', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: 'ops@example.com', INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.email).toBe(true);
        expect(status.discord).toBe(false);
        expect(status.anyConfigured).toBe(true);
        expect(status.bothConfigured).toBe(false);
      },
    );
  });

  it('reports discord true when INTEGRITY_ALERT_DISCORD_WEBHOOK is set', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1/tok' },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.email).toBe(false);
        expect(status.discord).toBe(true);
        expect(status.anyConfigured).toBe(true);
        expect(status.bothConfigured).toBe(false);
      },
    );
  });

  it('reports bothConfigured true when both channels are set', () => {
    withEnv(
      {
        INTEGRITY_ALERT_EMAIL: 'ops@example.com',
        INTEGRITY_ALERT_DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1/tok',
      },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.email).toBe(true);
        expect(status.discord).toBe(true);
        expect(status.anyConfigured).toBe(true);
        expect(status.bothConfigured).toBe(true);
      },
    );
  });

  it('ignores whitespace-only INTEGRITY_ALERT_EMAIL entries', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: '  , ,  ', INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.email).toBe(false);
        expect(status.anyConfigured).toBe(false);
      },
    );
  });

  it('ignores a blank INTEGRITY_ALERT_DISCORD_WEBHOOK', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: '   ' },
      () => {
        const status = getIntegrityPagerStatus();
        expect(status.discord).toBe(false);
        expect(status.anyConfigured).toBe(false);
      },
    );
  });
});

// ── assertIntegrityPagerConfigured — production ───────────────────────────────

describe('assertIntegrityPagerConfigured — production environment', () => {
  it('calls onFatal when no channel is configured in production', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const fatalCalls: string[] = [];
        const warnCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'production',
          onFatal: (msg) => fatalCalls.push(msg),
          onWarn: (msg) => warnCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(1);
        expect(fatalCalls[0]).toContain('FATAL');
        expect(fatalCalls[0]).toContain('INTEGRITY_ALERT_EMAIL');
        expect(fatalCalls[0]).toContain('INTEGRITY_ALERT_DISCORD_WEBHOOK');
        expect(warnCalls).toHaveLength(0);
      },
    );
  });

  it('does not call onFatal when email channel is configured in production', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: 'ops@example.com', INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const fatalCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'production',
          onFatal: (msg) => fatalCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(0);
      },
    );
  });

  it('does not call onFatal when discord channel is configured in production', () => {
    withEnv(
      {
        INTEGRITY_ALERT_EMAIL: undefined,
        INTEGRITY_ALERT_DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1/tok',
      },
      () => {
        const fatalCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'production',
          onFatal: (msg) => fatalCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(0);
      },
    );
  });
});

// ── assertIntegrityPagerConfigured — non-production ──────────────────────────

describe('assertIntegrityPagerConfigured — non-production environments', () => {
  it('calls onWarn (not onFatal) when no channel is configured in development', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const fatalCalls: string[] = [];
        const warnCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'development',
          onFatal: (msg) => fatalCalls.push(msg),
          onWarn: (msg) => warnCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(0);
        expect(warnCalls).toHaveLength(1);
        expect(warnCalls[0]).toContain('WARNING');
      },
    );
  });

  it('calls onWarn (not onFatal) when no channel is configured in test', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: undefined, INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const fatalCalls: string[] = [];
        const warnCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'test',
          onFatal: (msg) => fatalCalls.push(msg),
          onWarn: (msg) => warnCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(0);
        expect(warnCalls).toHaveLength(1);
      },
    );
  });

  it('returns silently (no warn, no fatal) when a channel is configured in development', () => {
    withEnv(
      { INTEGRITY_ALERT_EMAIL: 'dev@example.com', INTEGRITY_ALERT_DISCORD_WEBHOOK: undefined },
      () => {
        const fatalCalls: string[] = [];
        const warnCalls: string[] = [];

        assertIntegrityPagerConfigured({
          nodeEnv: 'development',
          onFatal: (msg) => fatalCalls.push(msg),
          onWarn: (msg) => warnCalls.push(msg),
        });

        expect(fatalCalls).toHaveLength(0);
        expect(warnCalls).toHaveLength(0);
      },
    );
  });
});
