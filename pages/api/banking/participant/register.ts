import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
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

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'AXM-';
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, fullName, email, phone } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in to register' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only register your own connected wallet' });
  }

  try {
    const existing = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (existing.length > 0) {
      return res.status(200).json({ success: true, participant: existing[0], isNew: false });
    }

    let participantRef = generateRef();
    let attempts = 0;
    while (attempts < 5) {
      const refCheck = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.participantRef, participantRef))
        .limit(1);
      if (refCheck.length === 0) break;
      participantRef = generateRef();
      attempts++;
    }

    const [participant] = await db
      .insert(increaseParticipants)
      .values({
        walletAddress: wallet,
        participantRef,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        status: 'registered',
      })
      .returning();

    return res.status(201).json({ success: true, participant, isNew: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
