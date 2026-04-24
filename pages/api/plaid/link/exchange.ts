/**
 * POST /api/plaid/link/exchange — exchange a Plaid Link public_token
 * for an access_token, persist envelope-encrypted, and fetch Auth
 * (routing+account) plus Balance.
 *
 * Auth: SIWE wallet session. The persisted item's `userRef` is bound
 * to the authenticated wallet address.
 *
 * Body: { publicToken: string; correlationId?: string }.
 *
 * Response 200: {
 *   itemId, plaidItemId, institutionId, institutionName,
 *   accounts: [{ id, plaidAccountId, name, mask, routingMask,
 *                type, subtype, balanceSufficiencyKnown }]
 * }
 *
 * Critical security contracts:
 *  - The cleartext access_token never leaves the server.
 *  - The cleartext routing/account numbers are never returned in the
 *    response (only the last-4 mask is).
 *  - A balance check audit event is recorded with sufficiency-only
 *    payload (no actual balance value), per Data Retention Policy §2.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { exchangePublicToken, PlaidApiError } from '../../../../lib/capinfra/adapters/plaid';

const ZBody = z.object({
  publicToken: z.string().min(8).max(400),
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

  const userRef = session.address.toLowerCase();
  try {
    const result = await exchangePublicToken({
      userRef,
      publicToken: parsed.data.publicToken,
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
    // Heuristic: validation errors thrown from the service map to 400.
    const status =
      typeof message === 'string' && message.toLowerCase().includes('plaid auth returned no')
        ? 422
        : message.toLowerCase().includes('required')
        ? 400
        : 500;
    if (status >= 500) {
      console.error('[api/plaid/link/exchange]', message);
    }
    return res.status(status).json({ error: 'plaid_link_exchange_failed', message });
  }
}
