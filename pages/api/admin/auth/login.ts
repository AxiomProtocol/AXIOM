import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from '../../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getJWTSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: SESSION_SECRET or JWT_SECRET environment variable must be set');
  }
  return secret;
}

const ALLOWED_ADMIN_EMAIL = 'akiliaggroup@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Access denied. This email is not authorized for admin access.' });
    }

    const result = await pool.query(
      'SELECT id, email, password, role FROM users WHERE email = $1 AND role IN ($2, $3)',
      [email.toLowerCase(), 'admin', 'super_admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Admin account not found. Please contact support to set up your admin account.',
        needsSetup: true
      });
    }

    const user = result.rows[0];

    if (!user.password) {
      return res.status(401).json({ 
        error: 'Password not set. Please set your admin password.',
        needsSetup: true
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        isAdmin: true
      },
      getJWTSecret(),
      { expiresIn: '24h' }
    );

    await pool.query(
      'UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
      [user.id]
    );

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieFlags = isProduction 
      ? `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`
      : `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`;
    res.setHeader('Set-Cookie', cookieFlags);

    return res.status(200).json({ 
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
