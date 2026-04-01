import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
} from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq, and } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/wealth-practice/insurance/fund
//
// PARTICIPANT (SIWE) — Create a pending insurance hold (product escrow) for a Wealth Practice
// group and return ACH deposit instructions. Insurance holds are stored in
// increase_product_escrows with product='wealth-practice' and purpose='insurance-hold'.
// Body: { walletAddress, groupId, groupDisplayName?, contributionAmountCents }
//
// ADMIN (x-admin-key + adminConfirm: true) — Confirm ACH receipt and mark hold as funded.
// Body: { holdId, depositedAmountCents, increaseTransactionId?, adminConfirm: true }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { adminConfirm } = req.body;

  // ── ADMIN: confirm deposit received ──────────────────────────────────────
  if (adminConfirm) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin authorization required' });

    const { holdId, depositedAmountCents, increaseTransactionId } = req.body;
    if (!holdId || typeof holdId !== 'number') {
      return res.status(400).json({ error: 'holdId (number) required' });
    }
    if (typeof depositedAmountCents !== 'number' || depositedAmountCents < 0) {
      return res.status(400).json({ error: 'depositedAmountCents (number >= 0) required' });
    }

    try {
      const existing = await db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.id, holdId),
            eq(increaseProductEscrows.purpose, 'insurance-hold')
          )
        )
        .limit(1);

      if (existing.length === 0) return res.status(404).json({ error: 'Insurance hold not found' });

      const hold = existing[0];
      if (hold.status === 'funded') {
        return res.status(200).json({ success: true, hold, alreadyFunded: true });
      }

      const totalDeposited = hold.depositedAmountCents + depositedAmountCents;
      const isFunded = totalDeposited >= hold.amountCents;

      const [updated] = await db
        .update(increaseProductEscrows)
        .set({
          depositedAmountCents: totalDeposited,
          status: isFunded ? 'funded' : 'pending',
          fundedAt: isFunded ? new Date() : undefined,
          increaseTransactionId: increaseTransactionId ?? hold.increaseTransactionId,
        })
        .where(eq(increaseProductEscrows.id, holdId))
        .returning();

      return res.status(200).json({
        success: true,
        hold: updated,
        funded: isFunded,
        shortfallCents: isFunded ? 0 : hold.amountCents - totalDeposited,
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── PARTICIPANT: create pending hold + return ACH deposit instructions ───
  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });

  const { walletAddress, groupId, groupDisplayName, contributionAmountCents } = req.body;

  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId (string) required' });
  }
  if (typeof contributionAmountCents !== 'number' || contributionAmountCents < 100) {
    return res.status(400).json({ error: 'contributionAmountCents must be a number >= 100' });
  }

  // Derive wallet from SIWE session — in dev mode fall back to body param
  const wallet = siweWallet === '__dev__'
    ? (walletAddress as string | undefined)?.toLowerCase()
    : siweWallet;

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
    return res.status(400).json({ error: 'Wallet address could not be determined from session' });
  }

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(404).json({
        error: 'Nexus account not found — register your Axiom Nexus account first',
        code: 'NEXUS_NOT_REGISTERED',
      });
    }

    const participant = participants[0];

    // Check for existing non-terminal hold for this group in product_escrows
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
      const hold = existing[0];
      return res.status(200).json({
        success: true,
        hold,
        isNew: false,
        requiredAmountCents: hold.amountCents,
        depositInstructions: buildDepositInstructions(participant, hold.amountCents, groupId),
      });
    }

    // Insurance hold = 1-week equivalent (monthly contribution ÷ 4)
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
      isNew: true,
      requiredAmountCents,
      depositInstructions: buildDepositInstructions(participant, requiredAmountCents, groupId),
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

function buildDepositInstructions(
  participant: { virtualRoutingNumber: string | null; virtualAccountNumber: string | null; participantRef: string },
  requiredAmountCents: number,
  groupId: string,
) {
  const hasVirtualAccount = !!(participant.virtualRoutingNumber && participant.virtualAccountNumber);
  const amountFormatted = `$${(requiredAmountCents / 100).toFixed(2)}`;
  return {
    bankName: 'First Internet Bank',
    accountName: 'Axiom Protocol LLC — Nexus Account',
    routingNumber: participant.virtualRoutingNumber ?? '071006486',
    accountNumber: participant.virtualAccountNumber ?? null,
    memo: `HOLD-${participant.participantRef}-${groupId}`,
    amountDue: requiredAmountCents,
    amountDueFormatted: amountFormatted,
    note: hasVirtualAccount
      ? `Send exactly ${amountFormatted} to account ${participant.virtualAccountNumber} (routing ${participant.virtualRoutingNumber}). Your hold activates once payment settles (1–2 business days).`
      : `Send exactly ${amountFormatted} via ACH to routing 071006486. Include memo: HOLD-${participant.participantRef}-${groupId}.`,
    hasVirtualAccount,
  };
}
