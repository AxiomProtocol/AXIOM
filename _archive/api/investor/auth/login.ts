import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = hashPassword(password, salt);
  return hash === verifyHash;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, email, password } = req.body;

  if (!slug || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const portal = await pool.query(
      'SELECT id FROM partner_portal_config WHERE portal_slug = $1 AND is_active = true',
      [slug]
    );

    if (portal.rows.length === 0) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    const investor = await pool.query(
      `SELECT id, name, password_hash FROM portal_investors 
       WHERE portal_id = $1 AND LOWER(email) = $2`,
      [portal.rows[0].id, normalizedEmail]
    );

    if (investor.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const inv = investor.rows[0];

    if (!inv.password_hash) {
      return res.status(401).json({ error: 'Account not set up. Check your email for setup link.' });
    }

    if (!verifyPassword(password, inv.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query(
      'UPDATE portal_investors SET last_login = NOW() WHERE id = $1',
      [inv.id]
    );

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'DELETE FROM investor_sessions WHERE investor_id = $1',
      [inv.id]
    );

    await pool.query(
      'INSERT INTO investor_sessions (investor_id, token, expires_at) VALUES ($1, $2, $3)',
      [inv.id, token, expiresAt]
    );

    return res.status(200).json({
      success: true,
      token,
      name: inv.name,
    });
  } catch (error) {
    console.error('Investor login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
