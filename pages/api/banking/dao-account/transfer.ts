/**
 * POST /api/banking/dao-account/transfer
 *
 * Account token gated (X-Account-Token header, same auth as dashboard).
 * Initiates an ACH or wire transfer from the DAO's Increase account via Axiom Rail.
 * Uses the account's increaseAccountId stored at provision time.
 *
 * Idempotency key is deterministic — built from stable transfer parameters
 * (no randomness), so identical retries produce the same key and Increase
 * deduplicates them. A client-supplied idempotency key (X-Idempotency-Key header)
 * is accepted as an override for explicit retry control.
 *
 * Body: { type, accountNumber, routingNumber, amountCents, description, beneficiaryName }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';
import { IncreaseService, IncreaseDisabledError } from '../../../../lib/services/IncreaseService';

const TOKEN_SALT = 'axiom-dao-account-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Build a deterministic idempotency key from stable transfer parameters.
 * Stable across retries; scoped to the UTC date to allow the same transfer
 * on different days.
 */
function buildIdempotencyKey(params: {
  applicationId: string;
  type: string;
  routingNumber: string;
  accountNumber: string;
  amountCents: number;
  description: string;
  isoDate: string;
}): string {
  const raw = [
    'dao-transfer',
    params.applicationId,
    params.type,
    params.routingNumber,
    params.accountNumber,
    String(params.amountCents),
    params.description.slice(0, 22),
    params.isoDate,
  ].join(':');
  return createHash('sha256').update(raw).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawToken = req.headers['x-account-token'];
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(401).json({ error: 'Account token required (X-Account-Token header)' });
  }

  const providedHash = hashToken(rawToken.trim());

  try {
    const applications = await db
      .select()
      .from(daoAccountApplications)
      .where(eq(daoAccountApplications.status, 'active'));

    const match = applications.find(a =>
      a.accountTokenHash && constantTimeCompare(a.accountTokenHash, providedHash)
    );

    if (!match) return res.status(403).json({ error: 'Invalid account token' });
    if (!match.increaseAccountId) return res.status(500).json({ error: 'Account not fully provisioned — missing Increase account ID' });

    const { type, accountNumber, routingNumber, amountCents, description, beneficiaryName } = req.body as {
      type?: 'ach' | 'wire';
      accountNumber?: string;
      routingNumber?: string;
      amountCents?: number;
      description?: string;
      beneficiaryName?: string;
    };

    if (!type || !['ach', 'wire'].includes(type)) return res.status(400).json({ error: 'type must be ach or wire' });
    if (!accountNumber?.trim()) return res.status(400).json({ error: 'accountNumber is required' });
    if (!routingNumber || !/^\d{9}$/.test(routingNumber.trim())) return res.status(400).json({ error: 'routingNumber must be 9 digits' });
    if (!amountCents || !Number.isInteger(amountCents) || amountCents <= 0) return res.status(400).json({ error: 'amountCents must be a positive integer' });
    if (amountCents > 10_000_000_00) return res.status(400).json({ error: 'Transfer amount exceeds maximum allowed ($10,000,000)' });
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!beneficiaryName?.trim()) return res.status(400).json({ error: 'beneficiaryName is required' });

    const isoDate = new Date().toISOString().slice(0, 10);

    const clientKey = req.headers['x-idempotency-key'];
    const idempotencyKey = (typeof clientKey === 'string' && clientKey.trim())
      ? clientKey.trim().slice(0, 64)
      : buildIdempotencyKey({
          applicationId: match.id,
          type,
          routingNumber: routingNumber.trim(),
          accountNumber: accountNumber.trim(),
          amountCents,
          description,
          isoDate,
        });

    let result;
    if (type === 'ach') {
      result = await IncreaseService.initiateAchTransfer({
        account_id: match.increaseAccountId,
        account_number: accountNumber.trim(),
        routing_number: routingNumber.trim(),
        amount: amountCents,
        statement_descriptor: description.slice(0, 22),
        company_name: match.entityName.slice(0, 40),
      }, idempotencyKey);
    } else {
      result = await IncreaseService.initiateWireTransfer({
        account_id: match.increaseAccountId,
        account_number: accountNumber.trim(),
        routing_number: routingNumber.trim(),
        amount: amountCents,
        message_to_recipient: description.slice(0, 35),
        beneficiary_name: beneficiaryName.slice(0, 80),
        originator_name: match.entityName.slice(0, 40),
      }, idempotencyKey);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: result.id,
        type,
        amount: amountCents,
        amountFormatted: IncreaseService.formatAmount(amountCents),
        status: result.status,
        createdAt: result.created_at,
      },
    });
  } catch (err: unknown) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    console.error('[DAO Account Transfer] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Transfer failed' });
  }
}
