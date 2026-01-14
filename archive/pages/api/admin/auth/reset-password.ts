import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { pool } from '../../../../lib/db';

const ALLOWED_ADMIN_EMAIL = 'akiliaggroup@gmail.com';
const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !SETUP_SECRET) {
    return res.status(403).json({ 
      error: 'Password reset disabled in production. Set ADMIN_SETUP_SECRET to enable.' 
    });
  }

  try {
    const { email, newPassword, setupSecret } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (email.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'This email is not authorized for password reset.' });
    }

    if (SETUP_SECRET && setupSecret !== SETUP_SECRET) {
      return res.status(403).json({ error: 'Invalid setup secret. Please provide the correct secret to reset password.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Admin account not found. Please use the setup endpoint to create your account first.' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email.toLowerCase()]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        existingUser.rows[0].id,
        'password_reset',
        JSON.stringify({ method: 'admin_reset_page' }),
        req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      ]
    ).catch(() => {});

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successfully. Redirecting to login...' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
