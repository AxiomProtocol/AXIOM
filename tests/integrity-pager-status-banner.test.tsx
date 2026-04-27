// @vitest-environment jsdom
/**
 * Tests for `IntegrityPagerStatusBanner` (Task #305) — the at-a-glance
 * indicator that warns operators when the on-call pager is unwired.
 *
 * Pinned states:
 *   - Both channels configured: green "configured" banner
 *   - Exactly one channel configured: amber "X only" banner that
 *     names the missing env var
 *   - Neither configured: loud red "WARNING" banner with role=alert
 *     and remediation copy mentioning both env vars
 *
 * Also pins that the rendered DOM never contains an actual recipient
 * email or webhook URL — only booleans cross the component boundary,
 * so leakage would be a code-level regression worth catching here.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

import { IntegrityPagerStatusBanner } from '../components/operator/IntegrityPagerStatusBanner';

afterEach(() => cleanup());

describe('IntegrityPagerStatusBanner', () => {
  it('renders a loud red WARNING banner with remediation copy when neither channel is configured', () => {
    render(
      <IntegrityPagerStatusBanner
        status={{
          email: false,
          discord: false,
          anyConfigured: false,
          bothConfigured: false,
        }}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-status-banner');
    expect(banner.getAttribute('data-pager-state')).toBe('not-configured');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toMatch(/WARNING: on-call pager not configured/i);
    // Remediation copy must name both env vars so an operator who
    // sees the banner has the exact knobs to fix it.
    expect(within(banner).getByText('INTEGRITY_ALERT_EMAIL')).toBeTruthy();
    expect(
      within(banner).getByText('INTEGRITY_ALERT_DISCORD_WEBHOOK'),
    ).toBeTruthy();
    // And it must point at the documented wiring-check.
    expect(banner.textContent).toMatch(/Send test page/);
  });

  it('renders a green "configured" banner when both channels are set', () => {
    render(
      <IntegrityPagerStatusBanner
        status={{
          email: true,
          discord: true,
          anyConfigured: true,
          bothConfigured: true,
        }}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-status-banner');
    expect(banner.getAttribute('data-pager-state')).toBe('both-configured');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toMatch(/email \+ discord configured/);
  });

  it('renders an amber "email only" banner that names the missing webhook env var', () => {
    render(
      <IntegrityPagerStatusBanner
        status={{
          email: true,
          discord: false,
          anyConfigured: true,
          bothConfigured: false,
        }}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-status-banner');
    expect(banner.getAttribute('data-pager-state')).toBe('partial');
    expect(banner.getAttribute('data-pager-only-channel')).toBe('email');
    expect(banner.textContent).toMatch(/email only/);
    expect(
      within(banner).getByText('INTEGRITY_ALERT_DISCORD_WEBHOOK'),
    ).toBeTruthy();
    // Must NOT also be screaming about the email var — that one is set.
    expect(banner.textContent).not.toMatch(/INTEGRITY_ALERT_EMAIL/);
  });

  it('renders an amber "discord only" banner that names the missing email env var', () => {
    render(
      <IntegrityPagerStatusBanner
        status={{
          email: false,
          discord: true,
          anyConfigured: true,
          bothConfigured: false,
        }}
      />,
    );
    const banner = screen.getByTestId('integrity-pager-status-banner');
    expect(banner.getAttribute('data-pager-state')).toBe('partial');
    expect(banner.getAttribute('data-pager-only-channel')).toBe('discord');
    expect(banner.textContent).toMatch(/discord only/);
    expect(within(banner).getByText('INTEGRITY_ALERT_EMAIL')).toBeTruthy();
    expect(banner.textContent).not.toMatch(
      /INTEGRITY_ALERT_DISCORD_WEBHOOK/,
    );
  });

  it('never surfaces actual recipient values — only booleans cross the prop boundary', () => {
    // Render every state and ensure the rendered text never contains
    // anything that looks like a recipient list or webhook URL. This
    // is a leakage regression guard: the props type only takes
    // booleans, but if a future contributor extends the prop with
    // raw values this test fails fast.
    const states = [
      { email: false, discord: false, anyConfigured: false, bothConfigured: false },
      { email: true, discord: false, anyConfigured: true, bothConfigured: false },
      { email: false, discord: true, anyConfigured: true, bothConfigured: false },
      { email: true, discord: true, anyConfigured: true, bothConfigured: true },
    ] as const;
    for (const s of states) {
      const { unmount } = render(<IntegrityPagerStatusBanner status={s} />);
      const banner = screen.getByTestId('integrity-pager-status-banner');
      expect(banner.textContent).not.toMatch(/@/); // no email addresses
      expect(banner.textContent).not.toMatch(/discord\.com\/api\/webhooks/);
      unmount();
    }
  });
});
