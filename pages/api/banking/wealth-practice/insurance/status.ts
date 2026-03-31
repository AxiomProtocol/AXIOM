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
// Returns insurance hold status for a participant and optional group
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
      });
    }

    const p = participants[0];

    let holdsQuery = db
      .select()
      .from(increaseInsuranceHolds)
      .where(eq(increaseInsuranceHolds.participantId, p.id));

    const holds = await holdsQuery;

    const groupHold = groupId
      ? holds.find((h) => h.groupId === groupId)
      : null;

    const hasFundedHold = holds.some((h) => h.status === 'funded');

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      holds,
      canJoin: hasFundedHold,
      groupHoldStatus: groupHold?.status ?? null,
      groupHold: groupHold ?? null,
      depositInstructions: {
        routingNumber: p.virtualRoutingNumber ?? '071006486',
        accountNumber: p.virtualAccountNumber ?? null,
        bankName: 'First Internet Bank',
        memo: p.virtualAccountNumber ? undefined : p.participantRef,
        hasVirtualAccount: !!(p.virtualRoutingNumber && p.virtualAccountNumber),
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
