import type { NextApiRequest } from 'next';
import { pool } from '../../server/db';

export interface WalletSession {
  authenticated: boolean;
  address: string | null;
  chainId?: number;
  authenticatedAt?: string;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...val] = cookie.trim().split('=');
      return [key, val.join('=')];
    })
  );
}

export async function getWalletSession(req: NextApiRequest): Promise<WalletSession> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['siwe_session'];
    
    if (!sessionToken) {
      return { authenticated: false, address: null };
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT wallet_address, chain_id, authenticated_at 
         FROM wallet_sessions 
         WHERE session_token = $1 AND expires_at > NOW()`,
        [sessionToken]
      );
      
      if (result.rows.length === 0) {
        return { authenticated: false, address: null };
      }
      
      const session = result.rows[0];
      return {
        authenticated: true,
        address: session.wallet_address,
        chainId: session.chain_id,
        authenticatedAt: session.authenticated_at
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Session check error:', error);
    return { authenticated: false, address: null };
  }
}

export function requireAuth(session: WalletSession): boolean {
  return session.authenticated && !!session.address;
}
