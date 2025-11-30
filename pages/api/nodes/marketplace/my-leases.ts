import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: 'Address required' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM depin_leases
        WHERE LOWER(lessee_address) = LOWER($1)
        ORDER BY created_at DESC
      `, [address]);

      const leases = result.rows.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        ownerAddress: row.owner_address,
        monthlyRentAxm: row.monthly_rent_axm,
        totalPaidAxm: row.total_paid_axm,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        nextPaymentDue: row.next_payment_due
      }));

      res.json({ leases });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching my leases:', error);
    res.status(500).json({ message: 'Failed to fetch leases', error: error.message });
  }
}
