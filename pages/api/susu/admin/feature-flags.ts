import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const ADMIN_WALLETS = [
  '0x8d7892cf226b43d48b6e3ce988a1274e6d114c96',
].map(w => w.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.headers['x-wallet-address'] as string || req.body?.walletAddress;
  
  if (req.method === 'PUT') {
    if (!walletAddress || !ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
  }
  
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query(`
      SELECT flag_key, flag_value, description, updated_at
      FROM susu_feature_flags
      ORDER BY flag_key
    `);

    res.status(200).json({
      success: true,
      flags: result.rows.reduce((acc: any, row: any) => {
        acc[row.flag_key] = {
          enabled: row.flag_value,
          description: row.description,
          updatedAt: row.updated_at
        };
        return acc;
      }, {})
    });
  } catch (error: any) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch flags' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { flagKey, enabled, walletAddress } = req.body;

    if (!flagKey || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Missing flagKey or enabled boolean' });
    }

    const result = await pool.query(`
      UPDATE susu_feature_flags
      SET flag_value = $1, updated_by = $2, updated_at = NOW()
      WHERE flag_key = $3
      RETURNING flag_key, flag_value, updated_at
    `, [enabled, walletAddress?.toLowerCase() || null, flagKey]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    res.status(200).json({
      success: true,
      flag: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update flag' });
  }
}
