import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
} from '../../../../../shared/increaseParticipantSchema';
import { eq } from 'drizzle-orm';

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

// GET /api/banking/wealth-practice/insurance/status?wallet=0x...&groupId=...
// Returns insurance hold status including computed requirement (1-week equivalent),
// whether the hold is funded, and ACH deposit instructions.
// Works even before a hold record exists — computes requirement from group data.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const wallet = typeof req.query.wallet === 'string'
    ? req.query.wallet.toLowerCase()
    : null;
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : null;

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
    // Look up group contribution if groupId provided (to compute requirement)
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
            // Insurance hold = 1 week equivalent (monthly ÷ 4)
            requiredHoldCents = Math.ceil(contributionAmountCents / 4);
          }
        }
      } catch {
        // Non-fatal — requirement will be null if group not found
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
        holds: [],
        canJoin: false,
        groupHoldStatus: null,
        groupHold: null,
        requiredHoldCents,
        contributionAmountCents,
        groupDisplayName,
        depositInstructions: null,
      });
    }

    const p = participants[0];

    const holds = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(eq(increaseInsuranceHolds.participantId, p.id));

    const groupHold = groupId
      ? holds.find((h) => h.groupId === groupId) ?? null
      : null;

    const hasFundedHold = holds.some((h) => h.status === 'funded');
    const groupIsFunded = groupHold?.status === 'funded';

    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      holds,
      canJoin: hasFundedHold,
      groupHoldStatus: groupHold?.status ?? null,
      groupHold,
      groupIsFunded,
      requiredHoldCents: groupHold?.requiredAmountCents ?? requiredHoldCents,
      depositedAmountCents: groupHold?.depositedAmountCents ?? 0,
      contributionAmountCents,
      groupDisplayName,
      depositInstructions: {
        bankName: 'First Internet Bank',
        accountName: 'Axiom Protocol LLC — Nexus Account',
        routingNumber: p.virtualRoutingNumber ?? '071006486',
        accountNumber: p.virtualAccountNumber ?? null,
        memo: groupId ? `HOLD-${p.participantRef}-${groupId}` : `HOLD-${p.participantRef}`,
        amountDue: groupHold?.requiredAmountCents ?? requiredHoldCents,
        hasVirtualAccount,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
