import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ success: false, error: 'walletAddress query parameter is required' });
  }

  try {
    const lineResult = await pool.query(
      `SELECT icl.*, ica.gef_tier_at_application, ica.stated_monthly_income_usd, ica.application_id as app_reference
       FROM income_credit_lines icl
       JOIN income_credit_applications ica ON icl.application_id = ica.id
       WHERE LOWER(icl.wallet_address) = LOWER($1)
       ORDER BY icl.created_at DESC
       LIMIT 5`,
      [walletAddress]
    );

    const appResult = await pool.query(
      `SELECT * FROM income_credit_applications
       WHERE LOWER(wallet_address) = LOWER($1)
       ORDER BY created_at DESC
       LIMIT 3`,
      [walletAddress]
    );

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

    const GEF_TIER_CREDIT_LIMITS: Record<string, number> = {
      Observer: 0,
      Participant: 1500,
      Operator: 5000,
      Steward: 10000,
      Architect: 25000,
    };

    return res.status(200).json({
      success: true,
      walletAddress: walletAddress.toLowerCase(),
      gefTier,
      creditLimit: GEF_TIER_CREDIT_LIMITS[gefTier] ?? 0,
      creditLines: lineResult.rows,
      applications: appResult.rows,
      hasActiveLine: lineResult.rows.some((l: any) => ['active', 'drawn'].includes(l.status)),
    });
  } catch (err: any) {
    console.error('[community-credit/status]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
