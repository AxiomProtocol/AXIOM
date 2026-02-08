import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await db.execute(sql`
      SELECT 
        id,
        name,
        purpose,
        total_balance_axusd
      FROM treasuries
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows.map((t: any) => ({
        id: t.id,
        name: t.name,
        purpose: t.purpose,
        totalBalanceAxusd: t.total_balance_axusd
      }))
    });
  } catch (error) {
    console.error('Treasury fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch treasuries' });
  }
}
