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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['siwe_session'];
    
    if (sessionToken) {
      const client = await pool.connect();
      try {
        await client.query(
          `DELETE FROM wallet_sessions WHERE session_token = $1`,
          [sessionToken]
        );
      } finally {
        client.release();
      }
    }
    
    res.setHeader('Set-Cookie', 'siwe_session=; Path=/; HttpOnly; Max-Age=0');
    
    res.json({ 
      success: true, 
      message: 'Wallet session ended' 
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
}
