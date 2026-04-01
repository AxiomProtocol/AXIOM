import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '../../../server/db';
import {
  increaseParticipants,
  increaseLpDeposits,
  increaseDistributions,
  increaseProductEscrows,
} from '../../../shared/increaseParticipantSchema';
import { IncreaseService } from '../../../lib/services/IncreaseService';
import { eq, and } from 'drizzle-orm';

/**
 * Increase webhook handler.
 *
 * Increase sends POST events with header `Increase-Webhook-Signature` containing
 * HMAC-SHA256(rawBody, INCREASE_WEBHOOK_SECRET) as a hex string.
 *
 * Security: FAIL-CLOSED — when INCREASE_WEBHOOK_SECRET is set, any request with
 * a missing or invalid signature is rejected 401. In development (NODE_ENV=development)
 * the secret check is skipped with a warning.
 *
 * Event payload format (Increase v2 webhook):
 *   { id, type: "event", category: "transaction.created", associated_object_id, associated_object_type, created_at }
 *
 * Events handled:
 *   transaction.created          → fetch transaction, reconcile LP deposit or insurance escrow
 *   ach_transfer.settled         → mark distribution settled
 *   ach_transfer.returned        → mark distribution returned
 *   wire_transfer.misdirected    → structured alert log (critical)
 *   inbound_ach_transfer.created → log inbound ACH for manual review
 *
 * Always returns 200 after signature validation — errors are logged, not retried.
 * Returning non-200 causes Increase to retry for 7 days.
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

  const rawBody = await readRawBody(req);
  const webhookSecret = process.env.INCREASE_WEBHOOK_SECRET;
  const isDev = process.env.NODE_ENV === 'development';

  if (webhookSecret) {
    const signature = req.headers['increase-webhook-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(401).json({ error: 'Missing Increase-Webhook-Signature header' });
    }
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } else if (!isDev) {
    // Fail-closed in production when secret is not configured
    console.error('[webhook/increase] INCREASE_WEBHOOK_SECRET not set — rejecting unsigned request in non-dev environment');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  } else {
    console.warn('[webhook/increase] INCREASE_WEBHOOK_SECRET not set — signature validation skipped (dev mode only)');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Increase v2 webhook uses `category` for event type and `associated_object_id` for the object
  const eventType = (payload?.category ?? '') as string;
  const objectId = (payload?.associated_object_id ?? '') as string;

  try {
    await handleIncreaseEvent(eventType, objectId, payload);
  } catch (err) {
    console.error('[webhook/increase] handler error for event', eventType, objectId, err);
  }

  return res.status(200).json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrow memo format: HOLD-{participantRef}-{groupId}
// This matches what /api/banking/wealth-practice/insurance/status sets as memo
// ─────────────────────────────────────────────────────────────────────────────
const HOLD_MEMO_RE = /\bHOLD-([A-Z0-9-]+)-([A-Za-z0-9_-]+)\b/;

async function handleIncreaseEvent(
  eventType: string,
  objectId: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    // ─────────────────────────────────────────────────────────────────────────
    // transaction.created
    // Fetch full transaction from API, then:
    //   1. Match participant by virtualAccountNumberId (route_id when route_type='account_number')
    //   2. Parse memo for escrow hold pattern → update increaseProductEscrows
    //   3. Otherwise → confirm oldest pending LP deposit in increaseLpDeposits
    // ─────────────────────────────────────────────────────────────────────────
    case 'transaction.created': {
      if (!objectId) {
        console.warn('[webhook/increase] transaction.created: missing associated_object_id');
        break;
      }

      // Fetch the full transaction object from Increase
      let transaction: Awaited<ReturnType<typeof IncreaseService.getTransaction>>;
      try {
        transaction = await IncreaseService.getTransaction(objectId);
      } catch (err) {
        console.error('[webhook/increase] transaction.created: failed to fetch transaction', objectId, err);
        break;
      }

      const amountCents = Number(transaction.amount ?? 0);
      if (amountCents <= 0) {
        // Outbound or zero-amount — not a deposit
        console.info('[webhook/increase] transaction.created: skipping non-inbound transaction', objectId, amountCents);
        break;
      }

      const routeType = transaction.route_type ?? '';
      const routeId = transaction.route_id ?? '';
      const description = transaction.description ?? '';

      // Step 1: resolve participant by virtual account number (route_id = account_number_id)
      let participant: (typeof increaseParticipants.$inferSelect) | null = null;

      if (routeType === 'account_number' && routeId) {
        const rows = await db
          .select()
          .from(increaseParticipants)
          .where(eq(increaseParticipants.virtualAccountNumberId, routeId))
          .limit(1);
        participant = rows[0] ?? null;
      }

      // Step 2: if no virtual account match, try memo-based lookup
      // LP deposit memo = participantRef (e.g. "AXM-ABCD1234")
      // Escrow memo     = "HOLD-{ref}-{groupId}"
      if (!participant && description) {
        // Try HOLD memo first
        const holdMatch = HOLD_MEMO_RE.exec(description);
        const refCandidate = holdMatch ? holdMatch[1] : description.trim().toUpperCase();

        if (refCandidate && /^AXM-[A-Z0-9]{8}$/.test(refCandidate)) {
          const rows = await db
            .select()
            .from(increaseParticipants)
            .where(eq(increaseParticipants.participantRef, refCandidate))
            .limit(1);
          participant = rows[0] ?? null;
        }
      }

      if (!participant) {
        console.info('[webhook/increase] transaction.created: no participant matched', {
          objectId,
          routeType,
          routeId,
          description,
        });
        break;
      }

      // Step 3: determine reconciliation target — escrow hold vs LP deposit
      const holdMatch = HOLD_MEMO_RE.exec(description);

      if (holdMatch) {
        // ── Escrow hold reconciliation ───────────────────────────────────────
        const groupId = holdMatch[2];

        const escrows = await db
          .select()
          .from(increaseProductEscrows)
          .where(
            and(
              eq(increaseProductEscrows.participantId, participant.id),
              eq(increaseProductEscrows.purpose, 'insurance-hold'),
              eq(increaseProductEscrows.groupId, groupId)
            )
          )
          .limit(1);

        if (escrows.length === 0) {
          console.warn('[webhook/increase] transaction.created: no escrow found for HOLD memo', {
            participantRef: participant.participantRef,
            groupId,
            transactionId: objectId,
          });
          break;
        }

        const escrow = escrows[0];
        const newDeposited = escrow.depositedAmountCents + amountCents;
        const isFunded = newDeposited >= escrow.amountCents;

        await db
          .update(increaseProductEscrows)
          .set({
            depositedAmountCents: newDeposited,
            status: isFunded ? 'funded' : 'partial',
            increaseTransactionId: objectId,
            fundedAt: isFunded ? new Date() : undefined,
            notes: [
              escrow.notes,
              `Deposit received ${amountCents}¢ via Increase txn ${objectId}${isFunded ? ' — FULLY FUNDED' : ` (need ${escrow.amountCents - newDeposited}¢ more)`}`,
            ].filter(Boolean).join(' | ') || null,
          })
          .where(eq(increaseProductEscrows.id, escrow.id));

        console.info('[webhook/increase] transaction.created: escrow reconciled', {
          participantRef: participant.participantRef,
          escrowId: escrow.id,
          groupId,
          amountCents,
          newDeposited,
          isFunded,
          transactionId: objectId,
        });
      } else {
        // ── LP deposit reconciliation ────────────────────────────────────────
        const allDeposits = await db
          .select()
          .from(increaseLpDeposits)
          .where(eq(increaseLpDeposits.participantId, participant.id));

        const pending = allDeposits
          .filter((d) => d.status === 'pending')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (pending.length === 0) {
          console.warn('[webhook/increase] transaction.created: participant has no pending LP deposits', {
            participantRef: participant.participantRef,
            transactionId: objectId,
            amountCents,
          });
          break;
        }

        const deposit = pending[0];

        await db
          .update(increaseLpDeposits)
          .set({
            status: 'confirmed',
            increaseTransactionId: objectId,
            receivedAt: new Date(),
            notes: `Increase transaction confirmed: ${objectId} | amount: ${amountCents}¢ | route: ${routeType || 'unknown'}`,
          })
          .where(eq(increaseLpDeposits.id, deposit.id));

        console.info('[webhook/increase] transaction.created: LP deposit confirmed', {
          participantRef: participant.participantRef,
          depositId: deposit.id,
          amountCents,
          transactionId: objectId,
          routeType,
        });
      }
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

      // Return reason may be embedded in the event payload (Increase sometimes includes it)
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
    // Wire misdirected — CRITICAL ALERT
    // A wire sent from Axiom's account was not received by the intended beneficiary.
    // This requires immediate human review.
    // ─────────────────────────────────────────────────────────────────────────
    case 'wire_transfer.misdirected': {
      const alertPayload = {
        level: 'CRITICAL',
        event: 'wire_transfer.misdirected',
        transferId: objectId,
        timestamp: new Date().toISOString(),
        message: `[AXIOM BANKING ALERT] Wire transfer ${objectId} has been flagged as misdirected by Increase. Immediate review required — funds may not have reached the intended beneficiary.`,
        webhookPayload: payload,
      };

      // Log structured critical alert — visible in server monitoring
      console.error('[webhook/increase] CRITICAL wire_transfer.misdirected', JSON.stringify(alertPayload));

      // Also mark the distribution if we have a match
      if (objectId) {
        try {
          const rows = await db
            .select()
            .from(increaseDistributions)
            .where(eq(increaseDistributions.increaseTransferId, objectId))
            .limit(1);

          if (rows.length > 0) {
            await db
              .update(increaseDistributions)
              .set({
                status: 'misdirected',
                description: `CRITICAL: Wire misdirected — immediate review required. Transfer ID: ${objectId}`,
              })
              .where(eq(increaseDistributions.increaseTransferId, objectId));
          }
        } catch (err) {
          console.error('[webhook/increase] wire_transfer.misdirected: failed to update distribution', objectId, err);
        }
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inbound ACH received: log for manual review
    // Future: auto-match by memo when deposit intent exists
    // ─────────────────────────────────────────────────────────────────────────
    case 'inbound_ach_transfer.created': {
      console.info('[webhook/increase] inbound_ach_transfer.created: received inbound ACH', {
        id: objectId,
        rawPayload: JSON.stringify(payload).slice(0, 500),
      });
      break;
    }

    default:
      console.info('[webhook/increase] unhandled event type:', eventType, objectId);
  }
}
