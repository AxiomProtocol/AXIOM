import type { NextApiRequest, NextApiResponse } from 'next';
import { db, pool } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
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

// GET /api/banking/insurance/wallet/[walletAddress]
// Returns insurance-hold escrows for a participant from increase_product_escrows.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  const wallet = walletAddress.toLowerCase();

  const adminOk = isAdmin(req);
  // Non-admin: verify SIWE identity matches URL param (strict IDOR prevention)
  if (!adminOk) {
    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) {
      return res.status(401).json({ error: 'Wallet sign-in required' });
    }
    if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
      return res.status(403).json({ error: 'You may only view your own insurance holds' });
    }
  }

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(200).json({ success: true, registered: false, holds: [] });
    }

    const participant = participants[0];
    const holds = await db
      .select()
      .from(increaseProductEscrows)
      .where(
        and(
          eq(increaseProductEscrows.participantId, participant.id),
          eq(increaseProductEscrows.product, 'wealth-practice'),
          eq(increaseProductEscrows.purpose, 'insurance-hold'),
        )
      );

    return res.status(200).json({
      success: true,
      registered: true,
      participant,
      holds,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
