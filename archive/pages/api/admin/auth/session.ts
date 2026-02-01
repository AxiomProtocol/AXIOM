import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { pool } from '../../../../lib/db';

function getJWTSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: SESSION_SECRET or JWT_SECRET environment variable must be set');
  }
  return secret;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.admin_token;

    if (!token) {
      return res.status(401).json({ authenticated: false, error: 'No session found' });
    }

    const decoded = jwt.verify(token, getJWTSecret()) as any;

    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name FROM users WHERE id = $1 AND role IN ($2, $3)',
      [decoded.id, 'admin', 'super_admin']
    );

    if (result.rows.length === 0) {
      res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0');
      return res.status(401).json({ authenticated: false, error: 'Admin account not found' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });

  } catch (error) {
    if ((error as any).name === 'TokenExpiredError') {
      res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0');
      return res.status(401).json({ authenticated: false, error: 'Session expired' });
    }
    
    console.error('Session verification error:', error);
    return res.status(401).json({ authenticated: false, error: 'Invalid session' });
  }
}
