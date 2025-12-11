import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import jwt from 'jsonwebtoken';

function getJWTSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured');
  return secret;
}

function verifyAdminToken(req: NextApiRequest): boolean {
  const token = req.cookies.admin_token;
  if (!token) return false;
  
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;
    return decoded.isAdmin === true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          email,
          referral_code,
          referred_by,
          referral_count,
          referral_reward,
          base_reward,
          verified,
          ip_address,
          created_at,
          updated_at
        FROM early_access_signups
        ORDER BY created_at DESC
      `);

      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching early access members:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
