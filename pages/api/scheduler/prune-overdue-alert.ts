/**
 * POST /api/scheduler/prune-overdue-alert
 *
 * Scheduled health-check endpoint that sends operator alerts when the
 * oracle-fallback pruning job has not run within the expected window.
 *
 * This endpoint is designed to be called by an external scheduler
 * (e.g., Google Cloud Scheduler) on a regular cadence — every 12–24 h is
 * recommended. Auth requires the `x-scan-key` header matching MIRDT_SCAN_KEY.
 *
 * Alert channels (configure via environment variables / secrets):
 *   PRUNE_ALERT_EMAIL            — comma-separated email recipients (via Resend)
 *   PRUNE_ALERT_DISCORD_WEBHOOK  — Discord webhook URL
 *
 * Response shape:
 *   200 { success: true, overdue: boolean, status, notificationsSent, errors, skipped }
 *   401 { success: false, error: "Unauthorized" }
 *   405 { success: false, error: "Method not allowed" }
 *   500 { success: false, error: "..." }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  checkAndSendPruneOverdueAlert,
  pruneAlertLogRetention,
} from '../../../lib/admin/prune-alert';

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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await checkAndSendPruneOverdueAlert();

    // Opportunistically prune old prune_alert_log rows so the table stays
    // small over time. Failures here are non-fatal and reported in the
    // response under `cleanup` for observability.
    const cleanup = await pruneAlertLogRetention();

    return res.status(200).json({
      success: true,
      overdue: result.alertStatus.isOverdue,
      status: result.alertStatus.status,
      lastPrunedAt: result.alertStatus.lastPrunedAt,
      hoursSincePrune: result.alertStatus.hoursSincePrune,
      thresholdHours: result.alertStatus.thresholdHours,
      notificationsSent: result.notificationsSent,
      errors: result.errors,
      skipped: result.skipped,
      cleanup: {
        deletedCount: cleanup.deletedCount,
        retentionDays: cleanup.retentionDays,
        error: cleanup.error,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[prune-overdue-alert] Unexpected error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
