/**
 * POST /api/capinfra/operator/notifications/[id]/read
 *
 * Cookie-authenticated mark-read endpoint used by the operator
 * dashboard's "Asset integrity alerts" panel. The dashboard runs
 * inside the operator UI session (httpOnly `cap_operator_key`
 * cookie) so it cannot reach the role-gated
 * /api/capinfra/notifications/[id]/read endpoint without exposing
 * the admin key on the client. This wrapper does the same write
 * (markRead) but gates on the operator cookie instead.
 *
 * The underlying notifications service is unchanged; this is purely
 * a different auth surface.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../../../../../lib/capinfra/operatorAuth';
import { markRead } from '../../../../../../lib/capinfra/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const id = String(req.query.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'MISSING_ID' });

  try {
    const updated = await markRead(id);
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.status(200).json({
      notification: {
        id: updated.id,
        readAt: updated.readAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[operator.notifications.read] markRead failed', id, err);
    return res.status(500).json({ error: 'INTERNAL' });
  }
}
