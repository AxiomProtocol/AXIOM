import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { blockDuringObservation } from '@/middleware/observationGuard';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, product, amount } = req.body;

  if (!wallet || !product || !amount) {
    return res.status(400).json({ error: 'Missing required fields: wallet, product, amount' });
  }

  if (amount < 100) {
    return res.status(400).json({ error: 'Minimum investment is $100' });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS investment_commitments (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(255) NOT NULL,
        product VARCHAR(100) NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `INSERT INTO investment_commitments (wallet, product, amount, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING id, wallet, product, amount, status, created_at`,
      [wallet.toLowerCase(), product, amount]
    );

    return res.status(201).json({
      success: true,
      commitment: result.rows[0],
      message: 'Investment commitment recorded successfully'
    });
  } catch (error) {
    console.error('Investment commitment error:', error);
    return res.status(500).json({ error: 'Failed to record investment commitment' });
  }
}

export default blockDuringObservation(handler);
