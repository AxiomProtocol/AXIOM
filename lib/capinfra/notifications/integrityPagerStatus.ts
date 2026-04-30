/**
 * Capital Infrastructure — Integrity pager configuration probe.
 *
 * The on-call pager (`integrityPager.ts`) silently no-ops when neither
 * `INTEGRITY_ALERT_EMAIL` nor `INTEGRITY_ALERT_DISCORD_WEBHOOK` is
 * set. The only signal today is a single per-process log warning,
 * which is easy to miss in aggregated logs and gives an operator
 * staring at the console no visible indication that the pager is
 * unwired until a real `collateral.integrity_failed` event fires and
 * nobody gets paged (Task #305).
 *
 * This module exposes the same env-var reads the pager uses, but in
 * a probe-friendly shape — booleans only — so:
 *
 *   1. `getServerSideProps` on the operator pages can compute the
 *      banner state without ever surfacing the secret values.
 *   2. The cookie-auth endpoint at
 *      `/api/capinfra/operator/integrity-pager-status` can return a
 *      JSON probe to the browser without leaking recipient lists or
 *      webhook URLs.
 *
 * Sharing the env-var read helpers with the pager (rather than
 * re-reading them ad-hoc in the SSR layer) means the banner can never
 * drift away from what the pager actually sees: if the pager would
 * skip, the banner says "not configured", and vice versa.
 */
export interface IntegrityPagerStatus {
  /** True when `INTEGRITY_ALERT_EMAIL` resolves to ≥1 trimmed recipient. */
  email: boolean;
  /** True when `INTEGRITY_ALERT_DISCORD_WEBHOOK` resolves to a non-empty URL. */
  discord: boolean;
  /** True when at least one channel is configured (matches the pager). */
  anyConfigured: boolean;
  /** True when both channels are configured (the recommended posture). */
  bothConfigured: boolean;
}

/**
 * Parse `INTEGRITY_ALERT_EMAIL` the same way the pager does — comma
 * separated, whitespace trimmed, empties dropped — and return the
 * recipient list. Exported so tests and the pager can share one
 * implementation; callers that only care whether ≥1 recipient is
 * configured should use `getIntegrityPagerStatus()` instead.
 */
export function readIntegrityAlertEmailRecipients(): string[] {
  const raw = process.env.INTEGRITY_ALERT_EMAIL ?? '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Read `INTEGRITY_ALERT_DISCORD_WEBHOOK` and trim — empty after trim
 * counts as unset, matching the pager's own gate.
 */
export function readIntegrityAlertDiscordWebhook(): string {
  return (process.env.INTEGRITY_ALERT_DISCORD_WEBHOOK ?? '').trim();
}

/**
 * Probe the integrity pager configuration. Returns booleans only;
 * never returns the recipient list or webhook URL itself, so the
 * result is safe to surface in any operator-visible context.
 */
export function getIntegrityPagerStatus(): IntegrityPagerStatus {
  const email = readIntegrityAlertEmailRecipients().length > 0;
  const discord = readIntegrityAlertDiscordWebhook().length > 0;
  return {
    email,
    discord,
    anyConfigured: email || discord,
    bothConfigured: email && discord,
  };
}

/**
 * Thrown by the default `onFatal` of `assertIntegrityPagerConfigured`
 * when production boot finds no on-call pager channel configured. The
 * caller (typically the Next.js instrumentation hook) decides how to
 * react — long-running servers may want to refuse to start, while
 * serverless lambdas should catch and log without killing the worker
 * (see `instrumentation.ts`).
 */
export class IntegrityPagerNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityPagerNotConfiguredError';
  }
}

/**
 * Production boot preflight check for the on-call pager.
 *
 * Called once from the Next.js instrumentation hook (`instrumentation.ts`)
 * on server startup. Behaviour:
 *
 *  - If at least one channel (email or Discord) is configured → returns
 *    silently (all good).
 *  - If no channel is configured **and** `NODE_ENV === 'production'` →
 *    writes a fatal message to stderr and either:
 *      - calls `process.exit(1)` when `STRICT_BOOT_PREFLIGHT=1`
 *        (preserves the hard-fail behaviour for explicit pre-deploy
 *        gating in CI healthchecks), OR
 *      - throws `IntegrityPagerNotConfiguredError` (default — lets the
 *        caller decide whether to halt or surface the failure as a
 *        diagnostic). This is the serverless-safe default: on Vercel,
 *        `process.exit` from `instrumentation.register()` corrupts the
 *        entire lambda invocation as opaque `FUNCTION_INVOCATION_FAILED`
 *        with no body.
 *  - If no channel is configured **and** `NODE_ENV !== 'production'` →
 *    emits a console warning so local developers see the gap without
 *    being blocked.
 *
 * The optional dependency-injection parameters (`nodeEnv`, `onFatal`,
 * `onWarn`) exist solely to make unit tests deterministic without
 * spawning child processes or mocking `process.exit` globally.
 */
export function assertIntegrityPagerConfigured({
  nodeEnv = process.env.NODE_ENV,
  strictBootPreflight = process.env.STRICT_BOOT_PREFLIGHT === '1',
  onFatal,
  onWarn = (msg: string): void => {
    console.warn(msg);
  },
}: {
  nodeEnv?: string;
  strictBootPreflight?: boolean;
  onFatal?: (msg: string) => void;
  onWarn?: (msg: string) => void;
} = {}): void {
  const status = getIntegrityPagerStatus();
  if (status.anyConfigured) return;

  const fatalMsg =
    '[capinfra] FATAL: No on-call pager channel is configured. ' +
    'Set INTEGRITY_ALERT_EMAIL and/or INTEGRITY_ALERT_DISCORD_WEBHOOK ' +
    'before deploying to production.';

  const warnMsg =
    '[capinfra] WARNING: No on-call pager channel is configured ' +
    '(INTEGRITY_ALERT_EMAIL / INTEGRITY_ALERT_DISCORD_WEBHOOK unset). ' +
    'This would block a strict-mode production boot.';

  // Default fatal handler — picks process.exit (strict) vs throw (default)
  // unless the caller injected its own (tests do).
  const defaultFatal = (msg: string): void => {
    process.stderr.write(msg + '\n');
    if (strictBootPreflight) {
      process.exit(1);
    } else {
      throw new IntegrityPagerNotConfiguredError(msg);
    }
  };

  if (nodeEnv === 'production') {
    (onFatal ?? defaultFatal)(fatalMsg);
  } else {
    onWarn(warnMsg);
  }
}
