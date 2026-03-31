import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
} from '../../../../../shared/increaseParticipantSchema';
import { eq, and } from 'drizzle-orm';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    }).filter(([k]) => k.length > 0)
  );
}

async function getSiweWallet(req: NextApiRequest): Promise<string | null> {
  if (process.env.NODE_ENV === 'development') return '__dev__';
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['siwe_session'];
  if (!token) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW() LIMIT 1`,
      [token]
    );
    return result.rows[0]?.wallet_address ?? null;
  } catch {
    return null;
  }
}

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/wealth-practice/insurance/fund
//
// PARTICIPANT (SIWE) — create a pending insurance hold for a group and return ACH deposit instructions.
// Body: { walletAddress, groupId, groupDisplayName?, contributionAmountCents }
//
// ADMIN (x-admin-key) — confirm that a hold has been funded after ACH settlement.
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
      return res.status(400).json({ error: 'depositedAmountCents required' });
    }

    try {
      const existing = await db
        .select()
        .from(increaseInsuranceHolds)
        .where(eq(increaseInsuranceHolds.id, holdId))
        .limit(1);

      if (existing.length === 0) return res.status(404).json({ error: 'Hold not found' });

      const hold = existing[0];
      if (hold.status === 'funded') {
        return res.status(200).json({ success: true, hold, alreadyFunded: true });
      }

      const totalDeposited = hold.depositedAmountCents + depositedAmountCents;
      const isFunded = totalDeposited >= hold.requiredAmountCents;

      const [updated] = await db
        .update(increaseInsuranceHolds)
        .set({
          depositedAmountCents: totalDeposited,
          status: isFunded ? 'funded' : 'pending',
          fundedAt: isFunded ? new Date() : undefined,
          notes: increaseTransactionId
            ? `Increase txn: ${increaseTransactionId}`
            : hold.notes ?? undefined,
        })
        .where(eq(increaseInsuranceHolds.id, holdId))
        .returning();

      return res.status(200).json({
        success: true,
        hold: updated,
        funded: isFunded,
        shortfallCents: isFunded ? 0 : hold.requiredAmountCents - totalDeposited,
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── PARTICIPANT: create pending hold + return ACH deposit instructions ───
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
        error: 'Nexus account not found — register your Axiom Nexus account first',
        code: 'NEXUS_NOT_REGISTERED',
      });
    }

    const participant = rows[0];

    // Check for existing non-terminal hold for this group
    const existing = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(
        and(
          eq(increaseInsuranceHolds.participantId, participant.id),
          eq(increaseInsuranceHolds.groupId, groupId),
        )
      )
      .limit(1);

    if (existing.length > 0 && !['released', 'forfeited'].includes(existing[0].status)) {
      // Return existing hold with ACH instructions (idempotent)
      const hold = existing[0];
      return res.status(200).json({
        success: true,
        hold,
        isNew: false,
        requiredAmountCents: hold.requiredAmountCents,
        depositInstructions: buildDepositInstructions(participant, hold.requiredAmountCents, groupId),
      });
    }

    // Insurance hold = 1 week equivalent (monthly contribution ÷ 4)
    const requiredAmountCents = Math.ceil(contributionAmountCents / 4);

    const [hold] = await db
      .insert(increaseInsuranceHolds)
      .values({
        participantId: participant.id,
        groupId,
        groupDisplayName: groupDisplayName || groupId,
        requiredAmountCents,
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
  return {
    bankName: 'First Internet Bank',
    accountName: 'Axiom Protocol LLC — Nexus Account',
    routingNumber: participant.virtualRoutingNumber ?? '071006486',
    accountNumber: participant.virtualAccountNumber ?? null,
    memo: `HOLD-${participant.participantRef}-${groupId}`,
    amountDue: requiredAmountCents,
    amountDueFormatted: `$${(requiredAmountCents / 100).toFixed(2)}`,
    note: hasVirtualAccount
      ? `Send exactly $${(requiredAmountCents / 100).toFixed(2)} to your dedicated Nexus account number ${participant.virtualAccountNumber} (routing ${participant.virtualRoutingNumber}). Your hold is activated once payment settles (1–2 business days).`
      : `Send exactly $${(requiredAmountCents / 100).toFixed(2)} via ACH to routing ${participant.virtualRoutingNumber ?? '071006486'}. Include memo: HOLD-${participant.participantRef}-${groupId}.`,
    hasVirtualAccount,
  };
}
