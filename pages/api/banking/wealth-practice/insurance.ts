import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
} from '../../../../shared/increaseParticipantSchema';
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

// GET  /api/banking/wealth-practice/insurance?wallet=0x... — list holds for a participant
// POST /api/banking/wealth-practice/insurance — create a new insurance hold
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

      const holds = await db
        .select()
        .from(increaseInsuranceHolds)
        .where(eq(increaseInsuranceHolds.participantId, rows[0].id));

      return res.status(200).json({ success: true, holds });
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
        return res.status(404).json({ error: 'Participant not found — register your Axiom Nexus account first' });
      }

      const participant = rows[0];

      // Prevent duplicates for same group
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
        return res.status(409).json({
          error: 'An active insurance hold already exists for this group',
          hold: existing[0],
        });
      }

      // Insurance hold = 1 week of monthly contribution (monthly ÷ 4)
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
        requiredAmountCents,
        depositInstructions: {
          routingNumber: participant.virtualRoutingNumber ?? '071006486',
          accountNumber: participant.virtualAccountNumber ?? null,
          bankName: 'First Internet Bank',
          memo: participant.virtualAccountNumber
            ? `HOLD-${participant.participantRef}`
            : `HOLD-${participant.participantRef}`,
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
