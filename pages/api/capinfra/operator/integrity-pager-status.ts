/**
 * GET /api/capinfra/operator/integrity-pager-status
 *
 * Cookie-authenticated probe used by the operator console banner
 * (Task #305) to surface whether the on-call integrity pager is
 * actually wired. Returns booleans only — recipient lists and webhook
 * URLs themselves are never serialised, so the response is safe to
 * fetch from the browser.
 *
 * Auth: same `cap_operator_key` cookie that gates the rest of the
 * operator console. Anonymous callers get 401 so the configuration
 * shape (which channels exist as env vars at all) cannot be probed
 * from the public internet.
 *
 * Response (200):
 *   {
 *     email: boolean,           // INTEGRITY_ALERT_EMAIL has ≥1 recipient
 *     discord: boolean,         // INTEGRITY_ALERT_DISCORD_WEBHOOK is non-empty
 *     anyConfigured: boolean,   // pager would NOT skip
 *     bothConfigured: boolean,  // recommended posture (redundant channels)
 *   }
 *
 * The shape mirrors `IntegrityPagerStatus` so the SSR path on
 * `/operator` and `/operator/integrity` (which also reads the same
 * helper directly) and any future client-side refresh both agree on
 * one envelope.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../lib/capinfra/operatorAuth';
import { getIntegrityPagerStatus } from '../../../../lib/capinfra/notifications/integrityPagerStatus';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  // Always recompute on demand — env vars can rotate between
  // requests in some deploy models, and the probe is cheap.
  const status = getIntegrityPagerStatus();

  // Suppress caching so a freshly-rotated env var is reflected on
  // the next dashboard reload, not the next CDN expiry.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json(status);
}
