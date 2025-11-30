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
        SELECT * FROM utility_invoices
        WHERE LOWER(account_address) = LOWER($1)
        ORDER BY created_at DESC
        LIMIT 50
      `, [address]);

      const invoices = result.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        utilityType: row.utility_type,
        providerName: row.provider_name,
        billingPeriodStart: row.billing_period_start,
        billingPeriodEnd: row.billing_period_end,
        usageAmount: row.usage_amount,
        usageUnit: row.usage_unit,
        amountUsd: row.amount_usd,
        amountAxm: row.amount_axm,
        discountApplied: row.discount_applied,
        status: row.status,
        dueDate: row.due_date,
        paidAt: row.paid_at
      }));

      res.json({ invoices });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
}
