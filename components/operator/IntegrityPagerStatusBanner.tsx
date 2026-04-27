/**
 * IntegrityPagerStatusBanner — at-a-glance indicator that tells an
 * operator opening the console whether the on-call integrity pager
 * (`INTEGRITY_ALERT_EMAIL` / `INTEGRITY_ALERT_DISCORD_WEBHOOK`) is
 * actually wired (Task #305).
 *
 * Three visual states:
 *   - Both configured  → green ("Pager: email + discord configured")
 *   - One configured   → amber ("Pager: <channel> only — add the
 *                                other channel for redundancy")
 *   - None configured  → loud red ("WARNING: on-call pager not
 *                                   configured — auto-freeze events
 *                                   will only show in this dashboard")
 *
 * The component takes booleans only — actual recipient lists or
 * webhook URLs never reach the client. The values are computed
 * server-side via `getIntegrityPagerStatus()` (which shares the same
 * env-var read helpers the pager uses) and forwarded into the SSR
 * props. A cookie-auth endpoint
 * (`/api/capinfra/operator/integrity-pager-status`) returns the same
 * shape for any future client-side refresh path.
 */

import type { IntegrityPagerStatus } from '../../lib/capinfra/notifications/integrityPagerStatus';

export interface IntegrityPagerStatusBannerProps {
  status: IntegrityPagerStatus;
}

export function IntegrityPagerStatusBanner({
  status,
}: IntegrityPagerStatusBannerProps) {
  if (!status.anyConfigured) {
    // Loud red banner — easy to miss is the failure mode this whole
    // task exists to fix, so the styling is intentionally aggressive.
    return (
      <div
        role="alert"
        className="border-2 border-red-600 bg-red-50 dark:bg-red-950/30 p-4 mb-6"
        data-testid="integrity-pager-status-banner"
        data-pager-state="not-configured"
      >
        <div className="text-red-700 dark:text-red-400 font-serif text-lg uppercase tracking-wide">
          WARNING: on-call pager not configured
        </div>
        <p className="text-sm font-mono mt-2 text-red-900 dark:text-red-300">
          Auto-freeze events will only show in this dashboard. Set{' '}
          <code>INTEGRITY_ALERT_EMAIL</code> and/or{' '}
          <code>INTEGRITY_ALERT_DISCORD_WEBHOOK</code> in the production
          environment so a real human is woken when an asset auto-freezes
          to RED. After setting either env var, run the wiring check
          via the &ldquo;Send test page&rdquo; button on{' '}
          <code>/operator/integrity</code>.
        </p>
      </div>
    );
  }

  if (status.bothConfigured) {
    return (
      <div
        role="status"
        className="border border-green-700 bg-green-50 dark:bg-green-950/30 p-3 mb-6"
        data-testid="integrity-pager-status-banner"
        data-pager-state="both-configured"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-sm font-mono text-green-900 dark:text-green-300">
            <span className="font-bold uppercase tracking-wide">
              Pager:
            </span>{' '}
            email + discord configured
          </div>
          <div className="text-[11px] uppercase tracking-wider text-green-800 dark:text-green-400">
            on-call wired
          </div>
        </div>
      </div>
    );
  }

  // Exactly one channel configured — amber, not red. The pager will
  // wake on-call but loses redundancy if that single channel is
  // degraded; surface this so operators add the other channel.
  const onlyChannel = status.email ? 'email' : 'discord';
  const missingChannel = status.email ? 'discord' : 'email';
  const missingEnvVar = status.email
    ? 'INTEGRITY_ALERT_DISCORD_WEBHOOK'
    : 'INTEGRITY_ALERT_EMAIL';
  return (
    <div
      role="status"
      className="border border-amber-600 bg-amber-50 p-3 mb-6"
      data-testid="integrity-pager-status-banner"
      data-pager-state="partial"
      data-pager-only-channel={onlyChannel}
    >
      <div className="text-sm font-mono text-amber-900">
        <span className="font-bold uppercase tracking-wide">Pager:</span>{' '}
        {onlyChannel} only — set <code>{missingEnvVar}</code> to add{' '}
        {missingChannel} for redundancy if the {onlyChannel} channel is
        degraded.
      </div>
    </div>
  );
}
