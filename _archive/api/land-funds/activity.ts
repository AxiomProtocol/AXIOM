import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(
      `SELECT 
        id,
        amount_cents,
        display_name,
        city,
        state,
        parcel_id,
        created_at
       FROM land_fund_investment_activity
       WHERE is_public = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const activities = result.rows.map(row => ({
      id: row.id,
      amount: row.amount_cents / 100,
      displayName: row.display_name || 'Someone',
      city: row.city,
      state: row.state,
      parcelId: row.parcel_id,
      timeAgo: getTimeAgo(row.created_at)
    }));

    res.status(200).json({ activities });

  } catch (error: any) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
