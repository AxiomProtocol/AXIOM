import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required' });
  }

  let wallet: string;
  if (siweWallet === '__dev__') {
    const w = req.query.wallet;
    if (!w || typeof w !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(w)) {
      return res.status(400).json({ error: 'Dev mode: pass ?wallet=0x... to identify the participant' });
    }
    wallet = w.toLowerCase();
  } else {
    wallet = siweWallet;
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

    const p = rows[0];
    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    return res.status(200).json({
      success: true,
      participantRef: p.participantRef,
      fullName: p.fullName,
      status: p.status,
      virtualRoutingNumber: hasVirtualAccount ? p.virtualRoutingNumber : null,
      virtualAccountNumber: hasVirtualAccount ? p.virtualAccountNumber : null,
      hasVirtualAccount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
