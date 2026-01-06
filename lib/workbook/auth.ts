import type { NextApiRequest } from 'next';
import { pool } from '../../server/db';

export async function getUserFromSiweSession(req: NextApiRequest): Promise<number | null> {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/siwe_session=([^;]+)/);
  
  if (!sessionMatch) {
    return null;
  }
  
  const sessionToken = sessionMatch[1];
  
  try {
    const sessionResult = await pool.query(
      `SELECT wallet_address FROM wallet_sessions 
       WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    
    if (sessionResult.rows.length === 0) {
      return null;
    }
    
    const walletAddress = sessionResult.rows[0].wallet_address;
    
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [walletAddress]
    );
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    return userResult.rows[0].id;
  } catch (error) {
    console.error('Error getting user from SIWE session:', error);
    return null;
  }
}
