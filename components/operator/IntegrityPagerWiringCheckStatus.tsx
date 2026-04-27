/**
 * IntegrityPagerWiringCheckStatus — surfaces the outcome of the most
 * recent scheduled `/api/scheduler/integrity-pager-wiring-check` run
 * directly under the pager status banner on `/operator/integrity`
 * (Task #306).
 *
 * The pager status banner above this component (Task #305) only
 * answers "are the env vars set?". This row answers the harder and
 * more important question: "did the pager actually fire successfully
 * the last time the cron tried it?" — which catches expired Discord
 * webhooks and lapsed Resend domain verifications that the env-var
 * probe can't see.
 *
 * Three visual states:
 *   - never run    → amber  ("Wiring check has never run — schedule it
 *                             at /api/scheduler/integrity-pager-wiring-check")
 *   - last run ok  → green  ("Wiring check ok — channels: email + discord")
 *   - last run bad → red    ("Wiring check FAILED — missing: discord
 *                             (owner notified)")
 *
 * The component is read-only; the operator action when red is to fix
 * the channel and re-run the wiring check via the "Send test page"
 * button on the same page (or wait for the next cron). All values
 * displayed are non-secret (channel names, timestamps, error counts).
 */

import type { WiringCheckRunRecord } from '../../lib/capinfra/notifications/integrityPagerWiringCheck';

export interface IntegrityPagerWiringCheckStatusProps {
  /**
   * Most recent wiring-check run, or `null` when the audit table is
   * empty / unavailable.
   */
  lastRun: WiringCheckRunRecord | null;
  /**
   * `Date.now()` at SSR time. Forwarded so the rendered "<n>m ago"
   * label is deterministic with the rest of the page (and so unit
   * tests can pin the clock).
   */
  generatedAtMs: number;
}

function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function IntegrityPagerWiringCheckStatus({
  lastRun,
  generatedAtMs,
}: IntegrityPagerWiringCheckStatusProps) {
  if (lastRun === null) {
    return (
      <div
        role="status"
        className="border border-amber-600 bg-amber-50 p-3 mb-6"
        data-testid="integrity-pager-wiring-check-status"
        data-wiring-state="never-run"
      >
        <div className="text-sm font-mono text-amber-900">
          <span className="font-bold uppercase tracking-wide">
            Wiring check:
          </span>{' '}
          never run — schedule a recurring{' '}
          <code>POST /api/scheduler/integrity-pager-wiring-check</code> so
          silent rotation breakage is caught before a real auto-freeze.
        </div>
      </div>
    );
  }

  const ranAtMs = Date.parse(lastRun.ranAt);
  const ageLabel = Number.isFinite(ranAtMs)
    ? formatAge(generatedAtMs - ranAtMs)
    : '—';
  const reached =
    lastRun.channelsPaged.length > 0
      ? lastRun.channelsPaged.join(' + ')
      : 'none';
  const missing = lastRun.missingChannels.join(' + ');
  const errorsCount = lastRun.pagerErrors.length;

  if (lastRun.ok) {
    return (
      <div
        role="status"
        className="border border-green-700 bg-green-50 p-3 mb-6"
        data-testid="integrity-pager-wiring-check-status"
        data-wiring-state="ok"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-sm font-mono text-green-900">
            <span className="font-bold uppercase tracking-wide">
              Wiring check:
            </span>{' '}
            ok — channels reached: {reached}
          </div>
          <div
            className="text-[11px] uppercase tracking-wider text-green-800"
            data-testid="integrity-pager-wiring-check-status-age"
          >
            last run {ageLabel}
          </div>
        </div>
      </div>
    );
  }

  // Failed run: red banner, surface what went wrong + whether the
  // owner was notified so the operator knows the pager-of-the-pager
  // also fired (or didn't).
  const reasonParts: string[] = [];
  if (lastRun.skippedReason === 'no_channels_configured') {
    reasonParts.push('no channels configured');
  } else {
    if (missing.length > 0) reasonParts.push(`missing: ${missing}`);
    if (errorsCount > 0) {
      reasonParts.push(
        `${errorsCount} channel error${errorsCount === 1 ? '' : 's'}`,
      );
    }
  }
  const reasonLabel = reasonParts.length > 0 ? reasonParts.join(', ') : 'see logs';

  let ownerLabel: string;
  if (lastRun.ownerNotified) {
    ownerLabel = 'runbook owner notified';
  } else if (!lastRun.ownerEmailConfigured) {
    ownerLabel =
      'runbook owner NOT notified (INTEGRITY_PAGER_WIRING_OWNER_EMAIL not set)';
  } else if (lastRun.ownerNotifyError) {
    ownerLabel = `owner notify failed: ${lastRun.ownerNotifyError}`;
  } else {
    ownerLabel = 'owner notify status unknown';
  }

  return (
    <div
      role="alert"
      className="border-2 border-red-600 bg-red-50 p-4 mb-6"
      data-testid="integrity-pager-wiring-check-status"
      data-wiring-state="failed"
    >
      <div className="text-red-700 font-serif text-base uppercase tracking-wide">
        Wiring check FAILED
      </div>
      <p className="text-sm font-mono mt-2 text-red-900">
        Last run {ageLabel} — {reasonLabel}.{' '}
        <span data-testid="integrity-pager-wiring-check-status-owner">
          {ownerLabel}.
        </span>
      </p>
      <p className="text-xs font-mono mt-2 text-red-900">
        Fix the channel(s) above and re-run the wiring check via the
        &ldquo;Send test page&rdquo; button below (or wait for the next
        scheduled run).
      </p>
    </div>
  );
}
