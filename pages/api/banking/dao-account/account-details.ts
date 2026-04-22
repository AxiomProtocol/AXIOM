/**
 * GET /api/banking/dao-account/account-details
 *
 * Account token gated (X-Account-Token header).
 * Returns the full (unmasked) account number and routing number for receive instructions.
 * This is a deliberately separate endpoint from the dashboard to enforce explicit intent
 * when full account credentials are needed (e.g., setting up inbound ACH/wire).
 *
 * The account token is the authorization gate — the holder is the provisioned DAO entity.
 * No BSA identity fields are returned.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
    if (!match.increaseAccountId) return res.status(404).json({ error: 'Account not yet provisioned — contact support' });

    return res.status(200).json({
      success: true,
      data: {
        entityName: match.entityName,
        accountNumber: match.increaseAccountNumber ?? null,
        routingNumber: match.increaseRoutingNumber ?? null,
        increaseAccountId: match.increaseAccountId,
      },
    });
  } catch (err: unknown) {
    console.error('[DAO Account Details] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to retrieve account details' });
  }
}
