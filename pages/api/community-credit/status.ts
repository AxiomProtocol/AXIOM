import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth } from '../../../lib/community-credit-auth';

interface CreditLineRow {
  id: number;
  credit_line_id: string;
  status: string;
  credit_limit_usd: string;
  drawn_amount_usd: string;
  available_balance_usd: string;
  outstanding_balance_usd: string;
  purpose: string;
  repayment_due_days: number;
  repayment_due_date: string | null;
  drawn_at: string | null;
  repaid_at: string | null;
  expires_at: string;
  gef_violation_flagged: boolean;
  interest_earned_usd: string | null;
  created_at: string;
  gef_tier_at_application: string;
  app_reference: string;
}

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
    return res.status(400).json({ success: false, error: 'walletAddress query parameter is required' });
  }

  const auth = await verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
  }

  try {
    const lineResult = await pool.query<CreditLineRow>(
      `SELECT icl.id, icl.credit_line_id, icl.status, icl.credit_limit_usd,
              icl.drawn_amount_usd, icl.available_balance_usd, icl.outstanding_balance_usd,
              icl.purpose, icl.repayment_due_days, icl.repayment_due_date,
              icl.drawn_at, icl.repaid_at, icl.expires_at, icl.gef_violation_flagged,
              icl.interest_earned_usd, icl.created_at,
              ica.gef_tier_at_application, ica.application_id as app_reference
       FROM income_credit_lines icl
       JOIN income_credit_applications ica ON icl.application_id = ica.id
       WHERE LOWER(icl.wallet_address) = LOWER($1)
       ORDER BY icl.created_at DESC
       LIMIT 5`,
      [auth.verifiedAddress]
    );

    const appResult = await pool.query(
      `SELECT application_id, status, gef_tier_at_application, requested_purpose,
              requested_amount_usd, approved_credit_limit_usd, rejection_reason,
              created_at, reviewed_at
       FROM income_credit_applications
       WHERE LOWER(wallet_address) = LOWER($1)
       ORDER BY created_at DESC
       LIMIT 3`,
      [auth.verifiedAddress]
    );

    let gefTier = 'Observer';
    try {
      const gefResult = await pool.query<{ name: string }>(
        `SELECT gef_tier_thresholds.name
         FROM gef_user_execution_profiles
         JOIN gef_tier_thresholds ON gef_user_execution_profiles.current_tier_id = gef_tier_thresholds.tier_id
         WHERE LOWER(gef_user_execution_profiles.wallet_address) = LOWER($1)
         LIMIT 1`,
        [auth.verifiedAddress]
      );
      if (gefResult.rows.length > 0 && gefResult.rows[0].name) {
        gefTier = gefResult.rows[0].name;
      }
    } catch (_err) {
      // Wallet not found in GEF profiles — default to Observer
    }

    return res.status(200).json({
      success: true,
      walletAddress: auth.verifiedAddress,
      gefTier,
      creditLimit: GEF_TIER_CREDIT_LIMITS[gefTier] ?? 0,
      creditLines: lineResult.rows,
      applications: appResult.rows,
      hasActiveLine: lineResult.rows.some((l) => ['active', 'drawn'].includes(l.status)),
    });
  } catch (_err) {
    console.error('[community-credit/status]', _err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
