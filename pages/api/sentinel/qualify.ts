import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `UPDATE sentinel_signals
       SET qualified = true, qualified_at = NOW()
       WHERE qualified = false AND final_score >= 0.5
       RETURNING id`
    );

    return res.status(200).json({
      success: true,
      qualified: result.rowCount,
    });
  } catch (error: any) {
    console.error('[sentinel/qualify] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
