import { NextApiRequest, NextApiResponse } from 'next';
import { StewardStatus } from '../../../lib/stewardCorps';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    let stewardStatus: StewardStatus = 'none';
    let daysProbation = 0;
    let applicationData = null;

    try {
      const result = await pool.query(
        `SELECT 
          id,
          status,
          probation_start_date,
          created_at,
          CASE 
            WHEN probation_start_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (NOW() - probation_start_date)) / 86400
            ELSE 0
          END as days_probation
        FROM steward_applications 
        WHERE LOWER(wallet_address) = LOWER($1) 
        ORDER BY created_at DESC LIMIT 1`,
        [wallet]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        stewardStatus = row.status as StewardStatus;
        daysProbation = Math.floor(row.days_probation) || 0;
        applicationData = {
          id: row.id,
          createdAt: row.created_at,
          probationStartDate: row.probation_start_date
        };
      }
    } catch (dbErr) {
      console.log('Database query failed, using defaults');
    }

    console.log('steward_status_check', { wallet: wallet.slice(0, 10), status: stewardStatus });

    return res.status(200).json({
      success: true,
      wallet,
      status: stewardStatus,
      daysProbation,
      application: applicationData
    });
  } catch (error: any) {
    console.error('Error checking steward status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check status'
    });
  }
}
