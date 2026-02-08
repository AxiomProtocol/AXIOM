import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.execute(sql`
      SELECT id, password_reset_expires 
      FROM partner_auth 
      WHERE email = ${normalizedEmail} 
        AND password_reset_token = ${token}
    `);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const auth = result.rows[0];
    const expires = new Date(auth.password_reset_expires as string);
    
    if (expires < new Date()) {
      return res.status(400).json({ error: 'Token has expired. Please request a new password reset.' });
    }

    const passwordHash = hashPassword(password);
    const sessionToken = generateSessionToken();

    await db.execute(sql`
      UPDATE partner_auth 
      SET 
        password_hash = ${passwordHash},
        password_reset_token = NULL,
        password_reset_expires = NULL,
        email_verified = TRUE,
        updated_at = NOW(),
        last_login = NOW()
      WHERE id = ${auth.id}
    `);

    return res.status(200).json({ 
      success: true, 
      message: 'Password set successfully',
      sessionToken,
    });
  } catch (error) {
    console.error('Set password error:', error);
    return res.status(500).json({ error: 'Failed to set password' });
  }
}
