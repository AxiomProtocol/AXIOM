import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === testHash;
}

function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.execute(sql`
      SELECT id, password_hash, email_verified
      FROM partner_auth 
      WHERE email = ${normalizedEmail}
    `);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const auth = result.rows[0];

    if (!auth.password_hash) {
      return res.status(401).json({ 
        error: 'Please set up your password using the link in your email',
        needsPasswordSetup: true 
      });
    }

    if (!verifyPassword(password, auth.password_hash as string)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await db.execute(sql`
      UPDATE partner_auth SET last_login = NOW() WHERE id = ${auth.id}
    `);

    const dealResult = await db.execute(sql`
      SELECT name FROM partner_deal_submissions 
      WHERE LOWER(email) = ${normalizedEmail} 
      ORDER BY created_at DESC LIMIT 1
    `);

    const sessionToken = generateSessionToken();

    return res.status(200).json({
      success: true,
      sessionToken,
      name: dealResult.rows[0]?.name || '',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
