import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../../server/db';
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

// GET /api/banking/wealth-practice/insurance/status?groupId=...
//
// Participant path: wallet is derived from SIWE session (no ?wallet= needed).
// Admin path  : requires x-admin-key header + ?wallet=0x... query param.
// Dev mode    : SIWE returns '__dev__'; falls back to optional ?wallet= query param for testing.
//
// Returns insurance hold status from increase_product_escrows (purpose='insurance-hold').
// Always computes requiredHoldCents (= contributionAmountCents ÷ 4) from the group record
// even when no escrow row exists yet.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : null;

  const adminOk = isAdmin(req);
  let wallet: string | null = null;

  if (adminOk) {
    // Admin path: must supply ?wallet=0x... explicitly
    const qw = typeof req.query.wallet === 'string' ? req.query.wallet.toLowerCase() : null;
    if (!qw || !/^0x[a-fA-F0-9]{40}$/i.test(qw)) {
      return res.status(400).json({ error: 'Admin path requires ?wallet=0x... query param' });
    }
    wallet = qw;
  } else {
    // Participant path: derive wallet from SIWE session
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
    if (siweWallet === '__dev__') {
      // Dev mode fallback — accept ?wallet= for testing, or use a dev placeholder
      const qw = typeof req.query.wallet === 'string' ? req.query.wallet.toLowerCase() : null;
      wallet = (qw && /^0x[a-fA-F0-9]{40}$/i.test(qw)) ? qw : '0x0000000000000000000000000000000000000001';
    } else {
      wallet = siweWallet.toLowerCase();
    }
  }

  try {
    // Look up group contribution amount to compute required hold even before a hold exists
    let contributionAmountCents: number | null = null;
    let requiredHoldCents: number | null = null;
    let groupDisplayName: string | null = null;

    if (groupId) {
      try {
        const groupResult = await pool.query(
          `SELECT contribution_amount, name FROM susu_purpose_groups WHERE id = $1 LIMIT 1`,
          [Number(groupId)]
        );
        if (groupResult.rows.length > 0) {
          const g = groupResult.rows[0];
          groupDisplayName = g.name || null;
          if (g.contribution_amount) {
            contributionAmountCents = Math.round(parseFloat(g.contribution_amount) * 100);
            requiredHoldCents = Math.ceil(contributionAmountCents / 4);
          }
        }
      } catch {
        // Non-fatal — requirement will be null if group lookup fails
      }
    }

    // Look up participant
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(200).json({
        registered: false,
        escrows: [],
        canJoin: false,
        groupHold: null,
        groupHoldStatus: null,
        groupIsFunded: false,
        requiredHoldCents,
        depositedAmountCents: 0,
        contributionAmountCents,
        groupDisplayName,
        depositInstructions: null,
      });
    }

    const p = participants[0];

    // Fetch all insurance-hold escrows for this participant
    const escrows = await db
      .select()
      .from(increaseProductEscrows)
      .where(
        and(
          eq(increaseProductEscrows.participantId, p.id),
          eq(increaseProductEscrows.product, 'wealth-practice'),
          eq(increaseProductEscrows.purpose, 'insurance-hold'),
        )
      );

    const groupHold = groupId
      ? escrows.find((e) => e.groupId === groupId) ?? null
      : null;

    const hasFundedHold = escrows.some((e) => e.status === 'funded');
    const groupIsFunded = groupHold?.status === 'funded';

    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      escrows,
      canJoin: hasFundedHold,
      groupHold,
      groupHoldStatus: groupHold?.status ?? null,
      groupIsFunded,
      requiredHoldCents: groupHold?.amountCents ?? requiredHoldCents,
      depositedAmountCents: groupHold?.depositedAmountCents ?? 0,
      contributionAmountCents,
      groupDisplayName,
      depositInstructions: {
        bankName: 'First Internet Bank',
        accountName: 'Axiom Protocol LLC — Nexus Account',
        routingNumber: p.virtualRoutingNumber ?? '071006486',
        accountNumber: p.virtualAccountNumber ?? null,
        memo: groupId ? `HOLD-${p.participantRef}-${groupId}` : `HOLD-${p.participantRef}`,
        amountDue: groupHold?.amountCents ?? requiredHoldCents,
        hasVirtualAccount,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
