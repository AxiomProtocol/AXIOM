import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const investor = await pool.query(
      `SELECT id FROM portal_investors 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );

    if (investor.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired setup link' });
    }

    const passwordHash = hashPassword(password);

    await pool.query(
      `UPDATE portal_investors 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, investor.rows[0].id]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Investor setup error:', error);
    return res.status(500).json({ error: 'Setup failed' });
  }
}
