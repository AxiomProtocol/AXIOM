import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { billingProvider } from '../../../../lib/workbook/billing';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, wallet_address, email FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const email = user.email || `${user.wallet_address}@axiom.wallet`;

    const host = req.headers.host || 'localhost:5000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const checkoutUrl = await billingProvider.createCheckoutSession(
      userId,
      email,
      `${baseUrl}/workbook?subscription=success`,
      `${baseUrl}/workbook?subscription=canceled`
    );

    return res.status(200).json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
