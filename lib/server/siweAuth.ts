import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../server/db';

export interface SiweSession {
  walletAddress: string;
  chainId: number;
  sessionToken: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};

  for (const chunk of cookieHeader.split(';')) {
    const [rawKey, ...rest] = chunk.trim().split('=');
    if (!rawKey) continue;
    out[rawKey] = rest.join('=');
  }

  return out;
}

export async function requireSiweSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SiweSession | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.siwe_session;

  if (!sessionToken) {
    res.status(401).json({
      error: 'Wallet authentication required.',
      code: 'SIWE_AUTH_REQUIRED',
    });
    return null;
  }

  const result = await pool.query(
    `SELECT wallet_address, chain_id
     FROM wallet_sessions
     WHERE session_token = $1 AND expires_at > NOW()`,
    [sessionToken]
  );

  if (!result.rows.length) {
    res.setHeader('Set-Cookie', 'siwe_session=; Path=/; HttpOnly; Max-Age=0');
    res.status(401).json({
      error: 'Wallet authentication required.',
      code: 'SIWE_AUTH_REQUIRED',
    });
    return null;
  }

  const row = result.rows[0];
  return {
    walletAddress: String(row.wallet_address).toLowerCase(),
    chainId: Number(row.chain_id),
    sessionToken,
  };
}
