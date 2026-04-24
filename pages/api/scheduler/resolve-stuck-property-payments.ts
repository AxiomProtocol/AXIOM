/**
 * POST /api/scheduler/resolve-stuck-property-payments
 *
 * Task #248 — periodic sweep that auto-confirms property-report payments
 * the buyer never finished POSTing to /api/property/confirm-payment.
 *
 * For every pending property_reports row older than
 * `STUCK_PAYMENT_MIN_AGE_MINUTES` (default 15) with a recorded buyerWallet,
 * the resolver scans on-chain AXUSD Transfer logs to the property-report
 * payment recipient. If the transfer is found we replay the same write path
 * confirm-payment.ts uses (mark paid + generate). Pending rows older than
 * `STUCK_PAYMENT_MAX_AGE_HOURS` (default 72) with no matching transfer are
 * marked `expired`.
 *
 * Authorization: x-scan-key header must match `MIRDT_SCAN_KEY`. Same gate
 * the other scheduler endpoints in this directory use, so the same Cloud
 * Scheduler / pg_cron credentials apply.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveStuckPayments } from '../../../lib/property/stuckPaymentResolver';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const summary = await resolveStuckPayments();
    console.log(
      `[resolve-stuck-property-payments] scanned=${summary.scanned} resolved=${summary.resolved.length} ` +
        `expired=${summary.expired.length} errors=${summary.errors.length}`,
    );
    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[resolve-stuck-property-payments] failed', message);
    return res.status(500).json({ success: false, error: message });
  }
}
