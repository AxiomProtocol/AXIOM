/**
 * POST /api/plaid/item/remove — Plaid `/item/remove` revocation.
 *
 * Implements the §7 Plaid `/item/remove` revocation path documented at
 * /disclosure/data-retention-policy:
 *   1. Calls Plaid /item/remove (terminates Plaid's authority).
 *   2. Wipes access_token + routing/account ciphertext from the active
 *      store (tombstone row preserves removed_at for audit replay).
 *   3. Emits a `plaid.item.removed` audit event with masked payload
 *      (institution name + plaidItemId + last4 only).
 *
 * Idempotent: a second call against an already-removed item returns
 * 200 with `alreadyRemoved=true` so a flaky network does not present
 * the user with a confusing error after their disconnect succeeded.
 *
 * Auth: SIWE wallet session. The handler enforces that the
 * authenticated wallet equals the item's userRef so one user cannot
 * disconnect another user's bank link.
 *
 * Body: { itemId: string; correlationId?: string }.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { removeItem, PlaidApiError } from '../../../../lib/capinfra/adapters/plaid';

const ZBody = z.object({
  itemId: z.string().min(3).max(40),
  correlationId: z.string().max(80).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({
      error: 'Wallet authentication required.',
      code: 'SIWE_AUTH_REQUIRED',
    });
  }

  const parsed = ZBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_body',
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const actor = session.address.toLowerCase();
  try {
    const result = await removeItem({
      itemId: parsed.data.itemId,
      actor,
      requireOwnership: true,
      correlationId: parsed.data.correlationId,
    });
    return res.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof PlaidApiError) {
      return res.status(502).json({
        error: 'plaid_api_error',
        errorCode: err.errorCode,
        errorType: err.errorType,
        message: err.message,
        plaidRequestId: err.requestId,
      });
    }
    const message = err instanceof Error ? err.message : 'unknown error';
    const lower = message.toLowerCase();
    let status = 500;
    if (lower.includes('not found')) status = 404;
    else if (lower.includes('different user')) status = 403;
    if (status >= 500) {
      console.error('[api/plaid/item/remove]', message);
    }
    return res.status(status).json({ error: 'plaid_item_remove_failed', message });
  }
}
