import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
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

interface DistributionItem {
  walletAddress: string;
  amountCents: number;
  externalRoutingNumber: string;
  externalAccountNumber: string;
  description?: string;
}

// POST /api/banking/lending-fund/distribute
// Admin-only: initiate ACH distributions to one or more LP accounts.
// Body (single): { walletAddress, amountCents, externalRoutingNumber, externalAccountNumber, description }
// Body (batch):  { distributions: [{ walletAddress, amountCents, externalRoutingNumber, externalAccountNumber, description }] }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin authorization required' });
  }

  const accountId = getAccountId();
  if (!accountId) {
    return res.status(503).json({ error: 'Banking account not configured' });
  }

  // Normalize to array — accept both single and batch formats
  let items: DistributionItem[];
  if (req.body.distributions && Array.isArray(req.body.distributions)) {
    items = req.body.distributions;
  } else if (req.body.walletAddress) {
    items = [req.body as DistributionItem];
  } else {
    return res.status(400).json({ error: 'Provide distributions[] array or single distribution fields' });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'At least one distribution required' });
  }
  if (items.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 distributions per batch' });
  }

  const results: Array<{
    walletAddress: string;
    success: boolean;
    distributionId?: number;
    transferId?: string;
    transferStatus?: string;
    amountCents?: number;
    participantRef?: string;
    error?: string;
  }> = [];

  for (const item of items) {
    const { walletAddress, amountCents, externalRoutingNumber, externalAccountNumber, description } = item;

    // Validate each item
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      results.push({ walletAddress: walletAddress ?? '', success: false, error: 'Invalid wallet address' });
      continue;
    }
    if (typeof amountCents !== 'number' || amountCents < 100) {
      results.push({ walletAddress, success: false, error: 'amountCents must be >= 100' });
      continue;
    }
    if (!externalRoutingNumber || !externalAccountNumber) {
      results.push({ walletAddress, success: false, error: 'External routing and account number required' });
      continue;
    }

    const wallet = walletAddress.toLowerCase();

    try {
      const rows = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.walletAddress, wallet))
        .limit(1);

      if (rows.length === 0) {
        results.push({ walletAddress, success: false, error: 'Participant not found' });
        continue;
      }

      const p = rows[0];

      const isoDate = new Date().toISOString().slice(0, 10);
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${accountId}:ach:${externalRoutingNumber}:${externalAccountNumber}:${amountCents}:${isoDate}:${p.participantRef}`)
        .digest('hex');

      const transfer = await IncreaseService.initiateAchTransfer({
        account_id: accountId,
        account_number: externalAccountNumber,
        routing_number: externalRoutingNumber,
        amount: amountCents,
        statement_descriptor: description || `Axiom Lending Fund Distribution — ${p.participantRef}`,
        company_name: 'Axiom Protocol LLC',
      }, idempotencyKey);

      const [dist] = await db
        .insert(increaseDistributions)
        .values({
          participantId: p.id,
          product: 'lending-fund',
          amountCents,
          status: 'pending',
          increaseTransferId: transfer.id,
          description: description || 'Lending Fund distribution',
          sentAt: new Date(),
        })
        .returning();

      results.push({
        walletAddress,
        success: true,
        distributionId: dist.id,
        transferId: transfer.id,
        transferStatus: transfer.status,
        amountCents,
        participantRef: p.participantRef,
      });
    } catch (err: unknown) {
      results.push({
        walletAddress,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return res.status(200).json({
    success: failed === 0,
    summary: { total: items.length, succeeded, failed },
    results,
  });
}
