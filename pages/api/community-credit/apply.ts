import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth } from '../../../lib/community-credit-auth';
import { randomBytes } from 'crypto';

const GEF_TIER_CREDIT_LIMITS: Record<string, number> = {
  Observer: 0,
  Participant: 1500,
  Operator: 5000,
  Steward: 10000,
  Architect: 25000,
};

const REPAYMENT_DAYS: Record<string, number> = {
  wealth_practice_entry: 30,
  contribution_smoothing: 60,
  earnest_money: 90,
};

const VALID_PURPOSES = ['wealth_practice_entry', 'contribution_smoothing', 'earnest_money'];

async function getGefTier(walletAddress: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT gef_tier_thresholds.tier_name
       FROM gef_user_execution_profiles
       JOIN gef_tier_thresholds ON gef_user_execution_profiles.current_tier_id = gef_tier_thresholds.tier_id
       WHERE LOWER(gef_user_execution_profiles.wallet_address) = LOWER($1)
       LIMIT 1`,
      [walletAddress]
    );
    if (result.rows.length > 0 && result.rows[0].tier_name) {
      return result.rows[0].tier_name;
    }
  } catch {}
  return 'Observer';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, statedMonthlyIncomeUsd, requestedAmountUsd, requestedPurpose } = req.body;

  if (!walletAddress || !requestedAmountUsd || !requestedPurpose) {
    return res.status(400).json({ success: false, error: 'walletAddress, requestedAmountUsd, and requestedPurpose are required' });
  }

  const auth = verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
  }

  if (!VALID_PURPOSES.includes(requestedPurpose)) {
    return res.status(400).json({ success: false, error: 'Invalid purpose. Must be one of: wealth_practice_entry, contribution_smoothing, earnest_money' });
  }

  const requestedAmount = parseFloat(requestedAmountUsd);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'requestedAmountUsd must be a positive number' });
  }

  if (statedMonthlyIncomeUsd !== undefined && statedMonthlyIncomeUsd !== null && statedMonthlyIncomeUsd !== '') {
    const monthlyIncome = parseFloat(statedMonthlyIncomeUsd);
    if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
      return res.status(400).json({ success: false, error: 'statedMonthlyIncomeUsd must be a positive number if provided' });
    }
    if (monthlyIncome < 1000) {
      return res.status(200).json({
        success: false,
        approved: false,
        rejectionReason: 'Stated monthly income below $1,000. Community Entry Credit is designed for W-2 earners with stable employment income.',
      });
    }
    const debtToIncomeEstimate = requestedAmount / monthlyIncome;
    if (debtToIncomeEstimate > 3.0) {
      return res.status(200).json({
        success: false,
        approved: false,
        rejectionReason: `Requested amount ($${requestedAmount.toLocaleString()}) is more than 3x stated monthly income ($${monthlyIncome.toLocaleString()}). Reduce requested amount or provide updated income information.`,
      });
    }
  }

  try {
    const existingLine = await pool.query(
      `SELECT id FROM income_credit_lines
       WHERE LOWER(wallet_address) = LOWER($1) AND status IN ('active', 'drawn')
       LIMIT 1`,
      [auth.verifiedAddress]
    );

    if (existingLine.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'You already have an active credit line. Repay the existing balance before applying again.' });
    }

    const gefTier = await getGefTier(auth.verifiedAddress);
    const creditLimit = GEF_TIER_CREDIT_LIMITS[gefTier] ?? 0;

    if (creditLimit === 0) {
      return res.status(200).json({
        success: false,
        approved: false,
        gefTier,
        creditLimit: 0,
        rejectionReason: 'Observer tier is not eligible for Community Entry Credit. Advance to Participant tier through the Graduated Execution Framework to qualify.',
      });
    }

    if (requestedAmount > creditLimit) {
      return res.status(200).json({
        success: false,
        approved: false,
        gefTier,
        creditLimit,
        rejectionReason: `Your ${gefTier} tier credit limit is $${creditLimit.toLocaleString()}. The requested amount of $${requestedAmount.toLocaleString()} exceeds this limit.`,
      });
    }

    const applicationId = `ica_${randomBytes(16).toString('hex')}`;
    const repaymentDays = REPAYMENT_DAYS[requestedPurpose] || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await pool.query(
      `INSERT INTO income_credit_applications
       (application_id, wallet_address, gef_tier_at_application, stated_monthly_income_usd,
        requested_amount_usd, requested_purpose, approved_credit_limit_usd, status, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6::income_credit_purpose, $7, 'approved'::income_credit_application_status, NOW())`,
      [
        applicationId,
        auth.verifiedAddress,
        gefTier,
        statedMonthlyIncomeUsd || null,
        requestedAmount,
        requestedPurpose,
        creditLimit,
      ]
    );

    const appRow = await pool.query(
      `SELECT id FROM income_credit_applications WHERE application_id = $1`,
      [applicationId]
    );
    const appDbId = appRow.rows[0].id;

    const creditLineId = `icl_${randomBytes(16).toString('hex')}`;

    await pool.query(
      `INSERT INTO income_credit_lines
       (credit_line_id, application_id, wallet_address, credit_limit_usd, drawn_amount_usd,
        available_balance_usd, outstanding_balance_usd, interest_rate_bps,
        purpose, repayment_due_days, expires_at, status)
       VALUES ($1, $2, $3, $4, 0, $4, 0, 500, $5::income_credit_purpose, $6, $7, 'active'::income_credit_line_status)`,
      [
        creditLineId,
        appDbId,
        auth.verifiedAddress,
        requestedAmount,
        requestedPurpose,
        repaymentDays,
        expiresAt.toISOString(),
      ]
    );

    return res.status(200).json({
      success: true,
      approved: true,
      applicationId,
      creditLineId,
      gefTier,
      creditLimit,
      approvedAmount: requestedAmount,
      purpose: requestedPurpose,
      repaymentDueDays: repaymentDays,
      expiresAt: expiresAt.toISOString(),
      message: `Approved. Your $${requestedAmount.toLocaleString()} credit line expires in 90 days if not drawn. Once drawn, repayment is due within ${repaymentDays} days.`,
    });
  } catch (err: any) {
    console.error('[community-credit/apply]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
