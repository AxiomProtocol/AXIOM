import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...val] = cookie.trim().split('=');
      return [key, val.join('=')];
    })
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['siwe_session'];
    
    if (!sessionToken) {
      return res.json({
        authenticated: false,
        address: null
      });
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
        res.setHeader('Set-Cookie', 'siwe_session=; Path=/; HttpOnly; Max-Age=0');
        return res.json({
          authenticated: false,
          address: null
        });
      }
      
      const session = result.rows[0];
      res.json({
        authenticated: true,
        address: session.wallet_address,
        chainId: session.chain_id,
        authenticatedAt: session.authenticated_at
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
}
