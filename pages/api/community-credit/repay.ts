import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, creditLineId, repaymentAmountUsd } = req.body;

  if (!walletAddress || !creditLineId || !repaymentAmountUsd) {
    return res.status(400).json({ success: false, error: 'walletAddress, creditLineId, and repaymentAmountUsd are required' });
  }

  const repayAmount = parseFloat(repaymentAmountUsd);
  if (isNaN(repayAmount) || repayAmount <= 0) {
    return res.status(400).json({ success: false, error: 'repaymentAmountUsd must be a positive number' });
  }

  try {
    const lineResult = await pool.query(
      `SELECT * FROM income_credit_lines
       WHERE credit_line_id = $1 AND LOWER(wallet_address) = LOWER($2)
       LIMIT 1`,
      [creditLineId, walletAddress]
    );

    if (lineResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Credit line not found for this wallet address' });
    }

    const line = lineResult.rows[0];

    if (line.status !== 'drawn') {
      return res.status(409).json({ success: false, error: `Credit line is ${line.status}. Only drawn credit lines can be repaid.` });
    }

    const outstanding = parseFloat(line.outstanding_balance_usd || '0');
    const drawnAmount = parseFloat(line.drawn_amount_usd || '0');
    const principalRatio = drawnAmount / outstanding;
    const principalRepaid = repayAmount * principalRatio;
    const interestRepaid = repayAmount - principalRepaid;

    const newOutstanding = Math.max(0, outstanding - repayAmount);
    const isFullyRepaid = newOutstanding < 0.01;

    const interestToDistribute = interestRepaid;

    if (isFullyRepaid) {
      await pool.query(
        `UPDATE income_credit_lines
         SET status = 'repaid'::income_credit_line_status,
             outstanding_balance_usd = 0,
             interest_earned_usd = COALESCE(interest_earned_usd, 0) + $1,
             repaid_at = NOW(),
             gef_violation_flagged = false,
             updated_at = NOW()
         WHERE id = $2`,
        [interestToDistribute.toFixed(6), line.id]
      );
    } else {
      await pool.query(
        `UPDATE income_credit_lines
         SET outstanding_balance_usd = $1,
             interest_earned_usd = COALESCE(interest_earned_usd, 0) + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newOutstanding.toFixed(6), interestToDistribute.toFixed(6), line.id]
      );
    }

    const walletAddr = walletAddress.toLowerCase();
    if (isFullyRepaid) {
      await pool.query(
        `UPDATE gef_user_execution_profiles
         SET gef_violation_flagged = false, updated_at = NOW()
         WHERE LOWER(wallet_address) = $1`,
        [walletAddr]
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      creditLineId,
      walletAddress: walletAddr,
      repaymentAmountUsd: repayAmount,
      principalRepaidUsd: parseFloat(principalRepaid.toFixed(6)),
      interestRepaidUsd: parseFloat(interestRepaid.toFixed(6)),
      remainingOutstandingUsd: parseFloat(newOutstanding.toFixed(6)),
      interestDistributedToJuniorPoolUsd: parseFloat(interestToDistribute.toFixed(6)),
      fullyRepaid: isFullyRepaid,
      gefViolationCleared: isFullyRepaid,
      message: isFullyRepaid
        ? `Repayment complete. Credit line closed. $${interestToDistribute.toFixed(2)} in interest distributed to the community junior pool. GEF violation flag cleared.`
        : `Partial repayment of $${repayAmount.toLocaleString()} recorded. Remaining balance: $${newOutstanding.toFixed(2)}.`,
    });
  } catch (err: any) {
    console.error('[community-credit/repay]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
