import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
  increaseLpDeposits,
  increaseDistributions,
} from '../../../../shared/increaseParticipantSchema';
import { IncreaseService } from '../../../../lib/services/IncreaseService';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq, and } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  const wallet = walletAddress.toLowerCase();

  const adminOk = isAdmin(req);
  // For non-admin paths, derive identity from SIWE and verify it matches the URL param.
  // In dev mode, trust the URL param. In production, SIWE must match.
  if (!adminOk) {
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) {
      return res.status(401).json({ error: 'Wallet sign-in required' });
    }
    if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
      return res.status(403).json({ error: 'You may only view your own participant record' });
    }
  }

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(404).json({ error: 'Participant not found', registered: false });
    }

    const participant = participants[0];

    const [insuranceHolds, lpDeposits, distributions] = await Promise.all([
      db.select().from(increaseProductEscrows).where(
        and(
          eq(increaseProductEscrows.participantId, participant.id),
          eq(increaseProductEscrows.product, 'wealth-practice'),
          eq(increaseProductEscrows.purpose, 'insurance-hold'),
        )
      ),
      db.select().from(increaseLpDeposits).where(eq(increaseLpDeposits.participantId, participant.id)),
      db.select().from(increaseDistributions).where(eq(increaseDistributions.participantId, participant.id)),
    ]);

    const isSandbox = (process.env.INCREASE_ENVIRONMENT ?? 'sandbox') === 'sandbox';

    const hasVirtualAccount = !!(participant.virtualRoutingNumber && participant.virtualAccountNumber);

    // Fetch account balance — ONLY for fully provisioned per-participant accounts.
    // Requires both increaseAccountId AND increaseEntityId; prevents shared treasury exposure.
    const isParticipantDedicated = !!(participant.increaseAccountId && participant.increaseEntityId);
    let accountBalance: { availableBalanceCents: number; currentBalanceCents: number; currency: string } | null = null;
    if (isParticipantDedicated) {
      try {
        const bal = await IncreaseService.getAccountBalance(participant.increaseAccountId!);
        accountBalance = {
          availableBalanceCents: bal.available_balance,
          currentBalanceCents: bal.current_balance,
          currency: bal.currency,
        };
      } catch {
        // Non-fatal — balance unavailable
      }
    }

    return res.status(200).json({
      success: true,
      registered: true,
      participant,
      accountBalance,
      hasDedicatedAccount: isParticipantDedicated,
      insuranceHolds,
      lpDeposits,
      distributions,
      depositInstructions: {
        routingNumber: hasVirtualAccount ? participant.virtualRoutingNumber : '071006486',
        accountNumber: hasVirtualAccount ? participant.virtualAccountNumber : null,
        bankName: 'First Internet Bank',
        accountName: 'Axiom Protocol LLC — Nexus Account',
        memo: participant.participantRef,
        note: hasVirtualAccount
          ? `Use your dedicated Axiom Nexus account number ${participant.virtualAccountNumber} with routing ${participant.virtualRoutingNumber}. This account number is unique to you — no memo code required when using it.`
          : `Always include your reference code "${participant.participantRef}" in the ACH memo or wire message field.`,
        hasVirtualAccount,
        environment: isSandbox ? 'sandbox' : 'production',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
