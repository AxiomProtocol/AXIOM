import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const ADMIN_WALLETS = [
  '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96',
].map(w => w.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.headers['x-wallet-address'] as string;
  
  if (req.method === 'GET') {
    try {
      const { rows: thresholds } = await pool.query(`
        SELECT 
          id,
          threshold_key,
          threshold_value,
          description,
          updated_by,
          updated_at
        FROM susu_mode_thresholds
        ORDER BY threshold_key
      `);

      const { rows: multipliers } = await pool.query(`
        SELECT 
          m.id,
          m.purpose_category_id,
          c.name as category_name,
          m.multiplier,
          m.updated_at
        FROM susu_purpose_category_multipliers m
        JOIN susu_purpose_categories c ON m.purpose_category_id = c.id
        ORDER BY c.name
      `);

      res.status(200).json({
        success: true,
        thresholds,
        multipliers
      });
    } catch (error: any) {
      console.error('Error fetching thresholds:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch thresholds' });
    }
  } else if (req.method === 'PUT') {
    if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    try {
      const { thresholdKey, thresholdValue } = req.body;

      if (!thresholdKey || thresholdValue === undefined) {
        return res.status(400).json({ error: 'Missing thresholdKey or thresholdValue' });
      }

      const numValue = parseFloat(thresholdValue);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({ error: 'Invalid threshold value' });
      }

      const { rows } = await pool.query(`
        UPDATE susu_mode_thresholds
        SET threshold_value = $1, updated_by = $2, updated_at = NOW()
        WHERE threshold_key = $3
        RETURNING *
      `, [numValue, walletAddress, thresholdKey]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Threshold not found' });
      }

      res.status(200).json({
        success: true,
        threshold: rows[0]
      });
    } catch (error: any) {
      console.error('Error updating threshold:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update threshold' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
