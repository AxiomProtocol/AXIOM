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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, groupId, groupDisplayName, contributionAmountCents } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId required' });
  }
  if (typeof contributionAmountCents !== 'number' || contributionAmountCents < 100) {
    return res.status(400).json({ error: 'contributionAmountCents must be a number >= 100' });
  }

  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only create holds for your own wallet' });
  }

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(404).json({ error: 'Participant not registered. Please register first.' });
    }

    const participant = participants[0];

    const existingHolds = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(
        and(
          eq(increaseInsuranceHolds.participantId, participant.id),
          eq(increaseInsuranceHolds.groupId, groupId),
        ),
      )
      .limit(1);

    if (existingHolds.length > 0) {
      return res.status(200).json({ success: true, hold: existingHolds[0], isNew: false });
    }

    const weeklyEquivalentCents = Math.ceil(contributionAmountCents / 4);

    const [hold] = await db
      .insert(increaseInsuranceHolds)
      .values({
        participantId: participant.id,
        groupId,
        groupDisplayName: groupDisplayName ?? null,
        requiredAmountCents: weeklyEquivalentCents,
        depositedAmountCents: 0,
        status: 'pending',
      })
      .returning();

    return res.status(201).json({
      success: true,
      hold,
      isNew: true,
      instructions: {
        amountRequired: weeklyEquivalentCents,
        amountRequiredFormatted: `$${(weeklyEquivalentCents / 100).toFixed(2)}`,
        memo: participant.participantRef,
        note: `ACH to Axiom Nexus Account. Include your reference code "${participant.participantRef}" in the memo field. Funds are held as insurance and released upon group graduation.`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
