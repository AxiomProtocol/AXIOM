import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;

    await pool.query(
      `INSERT INTO contact_submissions (name, email, subject, message, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [name.trim(), email.toLowerCase().trim(), subject, message.trim(), ipAddress]
    );

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
