import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { users } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { billingProvider } from '../../../../lib/workbook/billing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req as any).session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email required for subscription' });
    }

    const host = req.headers.host || 'localhost:5000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    const checkoutUrl = await billingProvider.createCheckoutSession(
      userId,
      user.email,
      `${baseUrl}/workbook?subscription=success`,
      `${baseUrl}/workbook?subscription=canceled`
    );

    return res.status(200).json({ success: true, checkoutUrl });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
