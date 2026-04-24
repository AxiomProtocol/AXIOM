/**
 * POST /api/plaid/link/token — issue a Plaid Link token for the
 * SIWE-authenticated user, scoped to Auth + Balance products.
 *
 * Auth: SIWE wallet session (siweAuth.getSIWESession). The token's
 * `client_user_id` is bound to the lower-cased wallet address so an
 * item linked under one wallet cannot be exchanged against another.
 *
 * Body: { clientName?: string; webhook?: string; redirectUri?: string;
 *         correlationId?: string }  — all optional.
 *
 * Response 200: { linkToken, expiration, requestId }.
 *
 * Errors: 401 SIWE_AUTH_REQUIRED, 500 with PlaidApiError details.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { createLinkToken, PlaidApiError } from '../../../../lib/capinfra/adapters/plaid';

const ZBody = z.object({
  clientName: z.string().min(1).max(120).optional(),
  webhook: z.string().url().max(400).optional(),
  redirectUri: z.string().url().max(400).optional(),
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
    const result = await createLinkToken({
      userRef,
      clientName: parsed.data.clientName,
      webhook: parsed.data.webhook,
      redirectUri: parsed.data.redirectUri,
      correlationId: parsed.data.correlationId,
    });
    return res.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof PlaidApiError) {
      // Surface Plaid errors with their public error_code so the
      // client can handle e.g. INVALID_PRODUCT or INSTITUTION_NOT_AVAILABLE
      // without us logging the secret.
      return res.status(502).json({
        error: 'plaid_api_error',
        errorCode: err.errorCode,
        errorType: err.errorType,
        message: err.message,
        plaidRequestId: err.requestId,
      });
    }
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[api/plaid/link/token]', message);
    return res.status(500).json({ error: 'plaid_link_token_failed', message });
  }
}
