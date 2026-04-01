import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
} from '../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq, and } from 'drizzle-orm';

// NOTE: This combined GET/POST handler is legacy.
// Preferred endpoints:
//   GET  → /api/banking/wealth-practice/insurance/status
//   POST → /api/banking/wealth-practice/insurance/fund   (participant)
//          /api/banking/wealth-practice/insurance/release (admin)
// This file remains for backwards compatibility and delegates to increaseProductEscrows.

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// GET  /api/banking/wealth-practice/insurance?wallet=0x... — list insurance-hold escrows
// POST /api/banking/wealth-practice/insurance — create a pending insurance-hold escrow
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const wallet = typeof req.query.wallet === 'string'
      ? req.query.wallet.toLowerCase()
      : null;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required (?wallet=0x...)' });
    }

    const adminOk = isAdmin(req);
    if (!adminOk) {
      const siweWallet = await getSiweWallet(req);
      if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
      if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    try {
      const rows = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.walletAddress, wallet))
        .limit(1);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Participant not found', registered: false });
      }

      const escrows = await db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.participantId, rows[0].id),
            eq(increaseProductEscrows.product, 'wealth-practice'),
            eq(increaseProductEscrows.purpose, 'insurance-hold'),
          )
        );

      return res.status(200).json({ success: true, holds: escrows });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method === 'POST') {
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });

    const { walletAddress, groupId, groupDisplayName, contributionAmountCents } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ error: 'groupId required' });
    }
    if (typeof contributionAmountCents !== 'number' || contributionAmountCents < 100) {
      return res.status(400).json({ error: 'contributionAmountCents must be >= 100' });
    }

    const wallet = walletAddress.toLowerCase();
    if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
      return res.status(403).json({ error: 'You may only create holds for your own wallet' });
    }

    try {
      const rows = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.walletAddress, wallet))
        .limit(1);

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Participant not found — register your Axiom Nexus account first',
          code: 'NEXUS_NOT_REGISTERED',
        });
      }

      const participant = rows[0];

      // Prevent duplicates for same group in product_escrows
      const existing = await db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.participantId, participant.id),
            eq(increaseProductEscrows.product, 'wealth-practice'),
            eq(increaseProductEscrows.purpose, 'insurance-hold'),
            eq(increaseProductEscrows.groupId, groupId),
          )
        )
        .limit(1);

      if (existing.length > 0 && !['released', 'forfeited'].includes(existing[0].status)) {
        return res.status(409).json({
          error: 'An active insurance hold already exists for this group',
          hold: existing[0],
        });
      }

      const requiredAmountCents = Math.ceil(contributionAmountCents / 4);

      const [hold] = await db
        .insert(increaseProductEscrows)
        .values({
          product: 'wealth-practice',
          purpose: 'insurance-hold',
          participantId: participant.id,
          groupId,
          groupDisplayName: groupDisplayName || groupId,
          amountCents: requiredAmountCents,
          depositedAmountCents: 0,
          status: 'pending',
        })
        .returning();

      return res.status(201).json({
        success: true,
        hold,
        requiredAmountCents,
        depositInstructions: {
          routingNumber: participant.virtualRoutingNumber ?? '071006486',
          accountNumber: participant.virtualAccountNumber ?? null,
          bankName: 'First Internet Bank',
          memo: `HOLD-${participant.participantRef}-${groupId}`,
          note: `Insurance hold for group ${groupDisplayName || groupId}. Amount: $${(requiredAmountCents / 100).toFixed(2)}. Once received, your hold is marked funded and you may join the group.`,
          hasVirtualAccount: !!(participant.virtualRoutingNumber && participant.virtualAccountNumber),
        },
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
