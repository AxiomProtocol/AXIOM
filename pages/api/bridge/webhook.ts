/**
 * POST /api/bridge/webhook
 *
 * Receives and processes Bridge.xyz webhook events.
 * Signature verified via HMAC-SHA256 (BRIDGE_WEBHOOK_SECRET).
 *
 * Supported event types:
 *   transfer.payment_submitted   → status: ach_pending
 *   transfer.payment_processed   → status: ach_settled
 *   transfer.payment_completed   → status: completed
 *   transfer.payment_failed      → status: failed
 *   customer.kyc_approved        → kyc_status: approved
 *   customer.kyc_rejected        → kyc_status: rejected
 *   customer.kyc_under_review    → kyc_status: under_review
 *
 * Raw body is preserved for HMAC verification (bodyParser disabled).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyBridgeWebhook } from '../../../lib/bridge/bridgeWebhookVerifier';
import { pool } from '../../../server/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Transfer state → local status map ────────────────────────────────────────

const TRANSFER_STATE_MAP: Record<string, string> = {
  payment_submitted:  'ach_pending',
  payment_processed:  'ach_settled',
  funds_received:     'ach_settled',
  funds_converting:   'crypto_pending',
  payment_completed:  'completed',
  completed:          'completed',
  payment_failed:     'failed',
  failed:             'failed',
  refunded:           'canceled',
};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleTransferEvent(event: any): Promise<void> {
  const transfer = event.data ?? event.object ?? event;
  const bridgeTransferId = transfer.id as string | undefined;
  if (!bridgeTransferId) return;

  const state = (transfer.state ?? '') as string;
  const newStatus = TRANSFER_STATE_MAP[state];
  if (!newStatus) return;

  await pool.query(
    `UPDATE bridge_transfers
     SET bridge_state = $1,
         status = $2,
         ach_settled_at  = CASE WHEN $2 IN ('ach_settled','completed') AND ach_settled_at IS NULL
                                THEN NOW() ELSE ach_settled_at END,
         completed_at    = CASE WHEN $2 = 'completed' AND completed_at IS NULL
                                THEN NOW() ELSE completed_at END,
         failed_at       = CASE WHEN $2 = 'failed' AND failed_at IS NULL
                                THEN NOW() ELSE failed_at END,
         error_message   = CASE WHEN $2 = 'failed' THEN $3 ELSE error_message END,
         raw_response    = $4,
         updated_at      = NOW()
     WHERE bridge_transfer_id = $5`,
    [
      state,
      newStatus,
      transfer.failure_reason ?? null,
      JSON.stringify(transfer),
      bridgeTransferId,
    ]
  );
}

async function handleKycEvent(event: any): Promise<void> {
  const customer = event.data ?? event.object ?? event;
  const bridgeCustomerId = customer.id as string | undefined;
  if (!bridgeCustomerId) return;

  const kycStatus = customer.kyc_status as string | undefined;
  if (!kycStatus) return;

  await pool.query(
    `UPDATE bridge_customers
     SET kyc_status = $1, raw_response = $2, updated_at = NOW()
     WHERE bridge_customer_id = $3`,
    [kycStatus, JSON.stringify(customer), bridgeCustomerId]
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['bridge-signature'];

  if (!verifyBridgeWebhook(rawBody, signature)) {
    console.warn('[BridgeWebhook] Signature verification failed');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const eventType = (event.type ?? event.event_type ?? '') as string;
  console.log(`[BridgeWebhook] Received: ${eventType}`);

  try {
    if (eventType.startsWith('transfer.')) {
      await handleTransferEvent(event);
    } else if (eventType.startsWith('customer.kyc')) {
      await handleKycEvent(event);
    } else {
      console.log(`[BridgeWebhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error('[BridgeWebhook] Processing error:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }

  return res.status(200).json({ received: true });
}
