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
      error: 'Setup endpoint disabled in production. Set ADMIN_SETUP_SECRET to enable.' 
    });
  }

  try {
    const { email, password, setupSecret } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email.toLowerCase() !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'This email is not authorized for admin setup.' });
    }

    if (SETUP_SECRET && setupSecret !== SETUP_SECRET) {
      return res.status(403).json({ error: 'Invalid setup secret' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await pool.query(
      'SELECT id, password FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser.rows.length > 0) {
      await pool.query(
        'UPDATE users SET password = $1, role = $2, account_status = $3, updated_at = NOW() WHERE email = $4',
        [hashedPassword, 'super_admin', 'active', email.toLowerCase()]
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Admin password updated successfully. You can now login.' 
      });
    } else {
      await pool.query(
        `INSERT INTO users (email, password, role, account_status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [email.toLowerCase(), hashedPassword, 'super_admin', 'active']
      );

      return res.status(201).json({ 
        success: true, 
        message: 'Admin account created successfully. You can now login.' 
      });
    }

  } catch (error) {
    console.error('Admin setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
