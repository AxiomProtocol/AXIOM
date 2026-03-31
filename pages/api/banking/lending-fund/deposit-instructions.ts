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

// GET /api/banking/lending-fund/deposit-instructions?wallet=0x...
// Returns LP capital call deposit instructions for the Lending Fund product
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const wallet = typeof req.query.wallet === 'string'
    ? req.query.wallet.toLowerCase()
    : null;

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required (?wallet=0x...)' });
  }

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only view your own deposit instructions' });
  }

  try {
    const rows = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    const SHARED_ROUTING = '071006486';
    const SHARED_BANK = 'First Internet Bank';
    const SHARED_ACCOUNT_NAME = 'Axiom Protocol LLC — Nexus Account';

    if (rows.length === 0) {
      return res.status(200).json({
        registered: false,
        depositInstructions: {
          bankName: SHARED_BANK,
          accountName: SHARED_ACCOUNT_NAME,
          routingNumber: SHARED_ROUTING,
          accountNumber: null,
          memo: null,
          note: 'Register your Axiom Nexus account to receive your dedicated deposit routing number.',
          hasVirtualAccount: false,
        },
      });
    }

    const p = rows[0];
    const hasVirtualAccount = !!(p.virtualRoutingNumber && p.virtualAccountNumber);

    return res.status(200).json({
      registered: true,
      participantRef: p.participantRef,
      depositInstructions: {
        bankName: SHARED_BANK,
        accountName: SHARED_ACCOUNT_NAME,
        routingNumber: hasVirtualAccount ? p.virtualRoutingNumber : SHARED_ROUTING,
        accountNumber: hasVirtualAccount ? p.virtualAccountNumber : null,
        memo: hasVirtualAccount ? null : p.participantRef,
        note: hasVirtualAccount
          ? `Your dedicated Lending Fund deposit account: ${p.virtualAccountNumber} (routing ${p.virtualRoutingNumber}). No memo required — this number routes exclusively to you.`
          : `Use routing ${SHARED_ROUTING} and always include your reference code "${p.participantRef}" in the ACH memo or wire description field.`,
        hasVirtualAccount,
        product: 'lending-fund',
        environment: process.env.INCREASE_ENVIRONMENT ?? 'sandbox',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
