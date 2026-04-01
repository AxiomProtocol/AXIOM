import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '../../../server/db';
import {
  increaseParticipants,
  increaseLpDeposits,
  increaseDistributions,
} from '../../../shared/increaseParticipantSchema';
import { eq } from 'drizzle-orm';

/**
 * Increase webhook handler.
 *
 * Increase sends a POST with header `Increase-Webhook-Signature` containing
 * an HMAC-SHA256 hex digest of the raw request body, keyed by INCREASE_WEBHOOK_SECRET.
 *
 * Key events handled:
 *   transaction.created         → match deposit by virtualAccountNumber, mark confirmed
 *   ach_transfer.settled        → mark distribution settled
 *   ach_transfer.returned       → mark distribution returned
 *   inbound_ach_transfer.created → log inbound ACH (future: auto-match)
 *
 * All other events are logged and acknowledged (200).
 *
 * IMPORTANT: Always return 200 after signature validation — even on handler errors.
 * Returning non-200 causes Increase to retry indefinitely. Errors are logged instead.
 */

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

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.INCREASE_WEBHOOK_SECRET;
  const rawBody = await readRawBody(req);

  if (webhookSecret) {
    const signature = req.headers['increase-webhook-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } else {
    console.warn('[webhook/increase] INCREASE_WEBHOOK_SECRET not set — signature validation skipped');
  }

  let payload: { event: string; associated_object_type: string; associated_object_id: string; [key: string]: unknown };
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = payload?.event ?? '';
  const objectId = payload?.associated_object_id ?? '';

  try {
    await handleIncreaseEvent(eventType, objectId, payload);
  } catch (err) {
    console.error('[webhook/increase] handler error for event', eventType, err);
  }

  return res.status(200).json({ received: true });
}

async function handleIncreaseEvent(
  eventType: string,
  objectId: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    // ─────────────────────────────────────────────────────────────────────────
    // Inbound deposit confirmed: match to lp_deposits row by virtual account number.
    // The transaction object contains the account_number that received the funds.
    // ─────────────────────────────────────────────────────────────────────────
    case 'transaction.created': {
      const transaction = payload?.data as Record<string, unknown> | undefined;
      if (!transaction) break;

      const amountCents = Number(transaction.amount ?? 0);
      const routeType = transaction.route_type as string | undefined;
      const description = (transaction.description as string | undefined) ?? '';
      const transactionId = (transaction.id as string | undefined) ?? objectId;

      if (amountCents <= 0) {
        console.info('[webhook/increase] transaction.created: skipping outbound or zero amount', transactionId);
        break;
      }

      // Attempt to match by account_number on the transaction source
      const accountNumberId = transaction.account_number_id as string | undefined;
      if (!accountNumberId) {
        console.info('[webhook/increase] transaction.created: no account_number_id, skipping deposit match', transactionId);
        break;
      }

      // Look up participant by virtual account number ID
      const participants = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.virtualAccountNumberId, accountNumberId))
        .limit(1);

      if (participants.length === 0) {
        console.info('[webhook/increase] transaction.created: no participant matched for accountNumberId', accountNumberId);
        break;
      }

      const participant = participants[0];

      // Find the oldest pending deposit for this participant
      const pendingDeposits = await db
        .select()
        .from(increaseLpDeposits)
        .where(eq(increaseLpDeposits.participantId, participant.id));

      const pending = pendingDeposits
        .filter((d) => d.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (pending.length === 0) {
        console.info('[webhook/increase] transaction.created: participant has no pending deposits', participant.participantRef, transactionId);
        break;
      }

      const deposit = pending[0];

      await db
        .update(increaseLpDeposits)
        .set({
          status: 'confirmed',
          increaseTransactionId: transactionId,
          receivedAt: new Date(),
          notes: `Increase transaction confirmed: ${transactionId} | amount: ${amountCents}¢ | ${routeType ?? 'unknown route'}`,
        })
        .where(eq(increaseLpDeposits.id, deposit.id));

      console.info('[webhook/increase] transaction.created: deposit confirmed', {
        participantRef: participant.participantRef,
        depositId: deposit.id,
        amountCents,
        transactionId,
        routeType,
        description,
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Outbound ACH settled: mark distribution as settled
    // ─────────────────────────────────────────────────────────────────────────
    case 'ach_transfer.settled': {
      if (!objectId) break;

      const rows = await db
        .select()
        .from(increaseDistributions)
        .where(eq(increaseDistributions.increaseTransferId, objectId))
        .limit(1);

      if (rows.length === 0) {
        console.info('[webhook/increase] ach_transfer.settled: no distribution matched for transfer', objectId);
        break;
      }

      await db
        .update(increaseDistributions)
        .set({
          status: 'settled',
          description: `ACH transfer settled: ${objectId}`,
        })
        .where(eq(increaseDistributions.increaseTransferId, objectId));

      console.info('[webhook/increase] ach_transfer.settled: distribution settled', objectId);
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Outbound ACH returned: mark distribution as returned
    // ─────────────────────────────────────────────────────────────────────────
    case 'ach_transfer.returned': {
      if (!objectId) break;

      const rows = await db
        .select()
        .from(increaseDistributions)
        .where(eq(increaseDistributions.increaseTransferId, objectId))
        .limit(1);

      if (rows.length === 0) {
        console.info('[webhook/increase] ach_transfer.returned: no distribution matched for transfer', objectId);
        break;
      }

      const returnReason = (payload?.data as Record<string, unknown> | undefined)?.return_reason as string | undefined;

      await db
        .update(increaseDistributions)
        .set({
          status: 'returned',
          description: returnReason ? `ACH return: ${returnReason}` : 'ACH transfer returned',
        })
        .where(eq(increaseDistributions.increaseTransferId, objectId));

      console.info('[webhook/increase] ach_transfer.returned: distribution marked returned', { objectId, returnReason });
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inbound ACH received: log for now — future enhancement to auto-match deposits
    // ─────────────────────────────────────────────────────────────────────────
    case 'inbound_ach_transfer.created': {
      const data = payload?.data as Record<string, unknown> | undefined;
      console.info('[webhook/increase] inbound_ach_transfer.created: received', {
        id: objectId,
        amount: data?.amount,
        originatorName: data?.originator_name,
        description: data?.description,
      });
      break;
    }

    default:
      console.info('[webhook/increase] unhandled event type:', eventType, objectId);
  }
}
