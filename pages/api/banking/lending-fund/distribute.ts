import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseDistributions,
} from '../../../../shared/increaseParticipantSchema';
import { IncreaseService, getAccountId } from '../../../../lib/services/IncreaseService';
import { eq } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/lending-fund/distribute
// Admin-only: initiate ACH distribution to an LP's external bank account
// Body: { walletAddress, amountCents, externalRoutingNumber, externalAccountNumber, description }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin authorization required' });
  }

  const { walletAddress, amountCents, externalRoutingNumber, externalAccountNumber, description } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (typeof amountCents !== 'number' || amountCents < 100) {
    return res.status(400).json({ error: 'amountCents must be a number >= 100' });
  }
  if (!externalRoutingNumber || !externalAccountNumber) {
    return res.status(400).json({ error: 'External routing and account number required' });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    const rows = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const p = rows[0];
    const accountId = getAccountId();

    if (!accountId) {
      return res.status(503).json({ error: 'Banking account not configured' });
    }

    const transfer = await IncreaseService.initiateAchTransfer({
      account_id: accountId,
      account_number: externalAccountNumber,
      routing_number: externalRoutingNumber,
      amount: amountCents,
      statement_descriptor: description || `Axiom Lending Fund Distribution — ${p.participantRef}`,
      company_name: 'Axiom Protocol LLC',
    });

    const [dist] = await db
      .insert(increaseDistributions)
      .values({
        participantId: p.id,
        product: 'lending-fund',
        amountCents,
        status: 'pending',
        increaseTransferId: transfer.id,
        description: description || `Lending Fund distribution`,
      })
      .returning();

    return res.status(200).json({
      success: true,
      distributionId: dist.id,
      transferId: transfer.id,
      transferStatus: transfer.status,
      amountCents,
      participantRef: p.participantRef,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
