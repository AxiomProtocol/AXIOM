/**
 * /api/founder/reserve-positions
 *
 * Admin-key gated endpoint. Delegates all balance-fetching logic to
 * lib/reserves/fetchReservePositions so the same logic can be imported
 * directly by the snapshot runner without an internal HTTP self-call.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { fetchReservePositions } from '../../../lib/reserves/fetchReservePositions';

export type { ReserveAssetPosition, ReservePositionsResponse } from '../../../lib/reserves/fetchReservePositions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cronSecret  = process.env.CRON_SECRET ?? '';
  const bearerToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const cronHeader  = (req.headers['x-cron-secret'] as string) ?? '';
  const validCron   = !!(cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret));

  if (!validateAdminKey(req) && !validCron) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }

  try {
    const data = await fetchReservePositions();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reserve-positions] error:', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
