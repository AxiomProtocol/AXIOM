/**
 * Capital Infrastructure — ACH webhook ingress endpoint (3B.2).
 *
 * Public endpoint (signed, NOT admin-key gated). Persists raw body
 * first, delegates verification to the ACH adapter, and records the
 * outcome via the generic ingress pipeline.
 *
 * Response contract (intentional — matches the Stellar webhook design):
 *   202 always — accepted into the spine. Verification result is in body.
 *     status='RECEIVED'    → verified, eligible for processing
 *     status='QUARANTINED' → bad signature OR unsupported inbound event
 *   400 only for EMPTY_BODY or BODY_READ_FAILED (infra-level failures)
 *   405 for non-POST
 *
 * This endpoint NEVER writes to portfolio, reserve, or settlement.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { achAdapter } from '../../../../lib/capinfra/adapters/ach';
import { ingestWebhook } from '../../../../lib/capinfra/webhooks/ingress';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    res.status(400).json({
      error: 'BODY_READ_FAILED',
      message: err instanceof Error ? err.message : 'unknown',
    });
    return;
  }
  if (rawBody.length === 0) {
    res.status(400).json({ error: 'EMPTY_BODY' });
    return;
  }
  try {
    const outcome = await ingestWebhook(achAdapter, {
      adapterKey: achAdapter.kind,
      rawBody,
      headers: req.headers,
    });
    res.status(202).json(outcome);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'INGRESS_FAILED',
      message: err instanceof Error ? err.message : 'unknown',
    });
  }
}
