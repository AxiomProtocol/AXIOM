/**
 * GET /api/founder/allocation-destination
 *
 * Admin-key gated. Returns the resolved destination wallet for a given
 * documentId + scope so the operator confirmation modal can display the
 * exact address before clicking Execute.
 *
 * Query params: documentId, scope (driver | treasury)
 * Response: { success, address, source, label, description }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { resolveDestinationWallet } from '@/lib/allocation/walletResolver';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const documentId = String(req.query.documentId ?? '').trim();
  const rawScope   = req.query.scope;
  const scope: 'driver' | 'treasury' = rawScope === 'treasury' ? 'treasury' : 'driver';

  if (!documentId) {
    return res.status(400).json({ success: false, error: 'documentId is required' });
  }

  try {
    const resolved = await resolveDestinationWallet(scope, documentId);
    return res.status(200).json({
      success:     true,
      address:     resolved.address,
      source:      resolved.source,
      label:       resolved.label,
      description: resolved.description,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Wallet resolution failed';
    return res.status(500).json({ success: false, error: msg });
  }
}
