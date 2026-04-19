/**
 * Capital Infrastructure — Stellar webhook ingress endpoint (3B.1a).
 *
 * Public endpoint (signed, NOT admin-key gated). Persists raw body
 * first, delegates verification to the Stellar adapter, and records
 * the outcome via the generic ingress pipeline. Returns 202 on accept
 * (verified or quarantined); 400 only on malformed envelope (missing
 * body); 405 on non-POST.
 *
 * This endpoint NEVER writes to portfolio, reserve, or settlement.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { stellarAdapter } from '../../../../lib/capinfra/adapters/stellar';
import { ingestWebhook } from '../../../../lib/capinfra/webhooks/ingress';

// Disable Next's automatic JSON body parser so we get raw bytes for
// signature verification. The ingress pipeline does its own JSON parse.
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
    res.status(400).json({ error: 'BODY_READ_FAILED', message: err instanceof Error ? err.message : 'unknown' });
    return;
  }
  if (rawBody.length === 0) {
    res.status(400).json({ error: 'EMPTY_BODY' });
    return;
  }
  try {
    const outcome = await ingestWebhook(stellarAdapter, {
      adapterKey: stellarAdapter.kind,
      rawBody,
      headers: req.headers,
    });
    // Always 202 — accepted into the spine; verification result is in body.
    res.status(202).json(outcome);
  } catch (err: unknown) {
    // Unexpected failure (DB outage, etc) — surface a 500 but do not
    // pretend success. The raw payload is lost in this path; this is
    // acceptable because a hard DB failure means the spine is down.
    res.status(500).json({
      error: 'INGRESS_FAILED',
      message: err instanceof Error ? err.message : 'unknown',
    });
  }
}
