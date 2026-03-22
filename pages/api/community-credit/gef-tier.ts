import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const GEF_TIER_CREDIT_LIMITS: Record<string, number> = {
  Observer: 0,
  Participant: 1500,
  Operator: 5000,
  Steward: 10000,
  Architect: 25000,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ success: false, error: 'walletAddress is required' });
  }

  try {
    let gefTier = 'Observer';
    try {
      const gefResult = await pool.query(
        `SELECT gef_tier_thresholds.tier_name
         FROM gef_user_execution_profiles
         JOIN gef_tier_thresholds ON gef_user_execution_profiles.current_tier_id = gef_tier_thresholds.tier_id
         WHERE LOWER(gef_user_execution_profiles.wallet_address) = LOWER($1)
         LIMIT 1`,
        [walletAddress]
      );
      if (gefResult.rows.length > 0 && gefResult.rows[0].tier_name) {
        gefTier = gefResult.rows[0].tier_name;
      }
    } catch {}

    const hasActiveLine = await pool.query(
      `SELECT 1 FROM income_credit_lines
       WHERE LOWER(wallet_address) = LOWER($1) AND status IN ('active', 'drawn')
       LIMIT 1`,
      [walletAddress]
    ).then(r => r.rows.length > 0).catch(() => false);

    return res.status(200).json({
      success: true,
      walletAddress: walletAddress.toLowerCase(),
      gefTier,
      creditLimit: GEF_TIER_CREDIT_LIMITS[gefTier] ?? 0,
      hasActiveLine,
    });
  } catch (err: any) {
    console.error('[community-credit/gef-tier]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
