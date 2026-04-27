// @vitest-environment jsdom
/**
 * Tests for `IntegrityPagerWiringCheckStatus` (Task #306) — the row
 * surfaced under the pager status banner on `/operator/integrity` that
 * tells an operator how the most recent scheduled wiring check went.
 *
 * Pinned states:
 *   - `lastRun=null` → amber "never run" banner with remediation copy
 *     pointing at the scheduler endpoint.
 *   - `lastRun.ok=true` → green banner with the channels reached and
 *     a "last run Xm ago" age stamp.
 *   - `lastRun.ok=false` (channels missing) → red role=alert banner
 *     listing the missing channels and whether the runbook owner was
 *     notified.
 *   - `lastRun.ok=false` (skipped, no channels configured) →
 *     red banner with the "no channels configured" copy.
 *   - `lastRun.ok=false` + owner email NOT configured → red banner
 *     warns the owner alias is missing.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { IntegrityPagerWiringCheckStatus } from '../components/operator/IntegrityPagerWiringCheckStatus';
import type { WiringCheckRunRecord } from '../lib/capinfra/notifications/integrityPagerWiringCheck';

afterEach(() => cleanup());

const NOW = Date.parse('2026-04-26T12:00:00.000Z');

function record(over: Partial<WiringCheckRunRecord> = {}): WiringCheckRunRecord {
  return {
    ranAt: '2026-04-26T11:55:00.000Z',
    ok: true,
    expectedChannels: ['email', 'discord'],
    channelsPaged: ['email', 'discord'],
    pagerErrors: [],
    missingChannels: [],
    ownerNotified: false,
    ownerNotifyError: null,
    ownerEmailConfigured: true,
    skippedReason: null,
    triggeredBy: 'scheduler',
    ...over,
  };
}

describe('IntegrityPagerWiringCheckStatus', () => {
  it('renders an amber "never run" banner when lastRun is null', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={null}
        generatedAtMs={NOW}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-wiring-check-status');
    expect(banner.getAttribute('data-wiring-state')).toBe('never-run');
    expect(banner.textContent).toMatch(/never run/i);
    expect(banner.textContent).toMatch(
      /\/api\/scheduler\/integrity-pager-wiring-check/,
    );
  });

  it('renders a green ok banner with the channels reached and an age stamp', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={record({ ok: true })}
        generatedAtMs={NOW}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-wiring-check-status');
    expect(banner.getAttribute('data-wiring-state')).toBe('ok');
    expect(banner.textContent).toMatch(/email \+ discord/);
    expect(
      screen
        .getByTestId('integrity-pager-wiring-check-status-age')
        .textContent,
    ).toMatch(/last run 5m ago/);
  });

  it('renders a red FAILED banner when channels are missing and confirms the owner was notified', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={record({
          ok: false,
          channelsPaged: ['email'],
          pagerErrors: ['discord: HTTP 404'],
          missingChannels: ['discord'],
          ownerNotified: true,
        })}
        generatedAtMs={NOW}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-wiring-check-status');
    expect(banner.getAttribute('data-wiring-state')).toBe('failed');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toMatch(/Wiring check FAILED/i);
    expect(banner.textContent).toMatch(/missing: discord/);
    expect(banner.textContent).toMatch(/1 channel error/);
    expect(
      screen.getByTestId('integrity-pager-wiring-check-status-owner')
        .textContent,
    ).toMatch(/runbook owner notified/);
  });

  it('uses the dedicated "no channels configured" copy when the run skipped', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={record({
          ok: false,
          expectedChannels: [],
          channelsPaged: [],
          pagerErrors: [],
          missingChannels: [],
          skippedReason: 'no_channels_configured',
          ownerNotified: true,
        })}
        generatedAtMs={NOW}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-wiring-check-status');
    expect(banner.getAttribute('data-wiring-state')).toBe('failed');
    expect(banner.textContent).toMatch(/no channels configured/);
  });

  it('warns when the runbook owner alias is not configured on a failed run', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={record({
          ok: false,
          channelsPaged: [],
          pagerErrors: ['email: send failed'],
          missingChannels: ['email'],
          ownerNotified: false,
          ownerEmailConfigured: false,
        })}
        generatedAtMs={NOW}
      />,
    );
    expect(
      screen.getByTestId('integrity-pager-wiring-check-status-owner')
        .textContent,
    ).toMatch(/INTEGRITY_PAGER_WIRING_OWNER_EMAIL not set/);
  });

  it('surfaces the owner notify error when the runbook email failed to send', () => {
    render(
      <IntegrityPagerWiringCheckStatus
        lastRun={record({
          ok: false,
          channelsPaged: [],
          pagerErrors: ['email: send failed'],
          missingChannels: ['email'],
          ownerNotified: false,
          ownerEmailConfigured: true,
          ownerNotifyError: 'Resend disconnected',
        })}
        generatedAtMs={NOW}
      />,
    );
    expect(
      screen.getByTestId('integrity-pager-wiring-check-status-owner')
        .textContent,
    ).toMatch(/owner notify failed: Resend disconnected/);
  });
});
