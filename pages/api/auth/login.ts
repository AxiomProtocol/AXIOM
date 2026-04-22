import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { pool } from '../../../server/db';
import { signTokenForKyc } from '../../../server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT id, email, username, password, first_name, last_name, role, account_status
       FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.account_status === 'suspended' || user.account_status === 'deactivated') {
      return res.status(403).json({ success: false, message: 'Account is not active. Please contact support.' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    await pool.query(
      `UPDATE users SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1`,
      [user.id]
    );

    let token: string;
    try {
      token = signTokenForKyc({ userId: user.id, email: user.email, role: user.role || 'user' });
    } catch (err: any) {
      console.error('[Auth Login] Token signing failed:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      }
    });
  } catch (error: any) {
    console.error('[Auth Login] Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
