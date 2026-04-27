/**
 * POST /api/scheduler/integrity-pager-wiring-check
 *
 * Scheduled health-check endpoint that fires the synthetic on-call
 * pager test on a fixed cadence and notifies the runbook owner via a
 * separately-configured channel when the integrity pager is broken
 * (Task #306).
 *
 * Auth model is identical to the other scheduler endpoints
 * (`prune-overdue-alert`, `prune-oracle-fallback`, `run-cycle`,
 * `resolve-stuck-property-payments`): the caller must present the
 * `x-scan-key` header matching `MIRDT_SCAN_KEY`. In development the
 * header check is bypassed when `MIRDT_SCAN_KEY` is unset so a local
 * cron emulator (or `curl`) can exercise the path without needing a
 * secret.
 *
 * Configuration
 *   `INTEGRITY_PAGER_WIRING_OWNER_EMAIL` — comma-separated owner
 *   recipients for the runbook-owner alert. Intentionally separate
 *   from `INTEGRITY_ALERT_EMAIL` / `INTEGRITY_ALERT_DISCORD_WEBHOOK`
 *   so the alert about the broken pager is never delivered through
 *   the broken pager.
 *
 * Recommended cadence: weekly (one Resend email per week per owner is
 * cheap, and weekly is fast enough that drift between rotations is
 * caught before it bites). Wire from any external scheduler (Google
 * Cloud Scheduler, EasyCron, GitHub Actions cron, …).
 *
 * Response
 *   200 { success: true, ...WiringCheckResult }
 *   401 { success: false, error: 'Unauthorized' }
 *   405 { success: false, error: 'Method not allowed' }
 *   500 { success: false, error: '...' }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_WIRING_CHECK_ACTOR,
  runIntegrityPagerWiringCheck,
} from '../../../lib/capinfra/notifications/integrityPagerWiringCheck';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await runIntegrityPagerWiringCheck({
      actor: DEFAULT_WIRING_CHECK_ACTOR,
      triggeredBy: 'scheduler',
    });
    return res.status(200).json({
      success: true,
      ranAt: result.ranAt,
      ok: result.ok,
      expectedChannels: result.expectedChannels,
      channelsPaged: result.channelsPaged,
      pagerErrors: result.pagerErrors,
      missingChannels: result.missingChannels,
      ownerNotified: result.ownerNotified,
      ownerNotifyError: result.ownerNotifyError,
      ownerEmailConfigured: result.ownerEmailConfigured,
      skippedReason: result.skippedReason,
      persistError: result.persistError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      '[integrity-pager-wiring-check] unexpected error:',
      err,
    );
    return res.status(500).json({ success: false, error: message });
  }
}
