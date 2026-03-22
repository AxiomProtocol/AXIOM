import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth } from '../../../lib/community-credit-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, creditLineId, repaymentAmountUsd } = req.body;

  if (!walletAddress || !creditLineId || !repaymentAmountUsd) {
    return res.status(400).json({ success: false, error: 'walletAddress, creditLineId, and repaymentAmountUsd are required' });
  }

  const auth = verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
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
      [creditLineId, auth.verifiedAddress]
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
    const outstandingBefore = outstanding;

    const principalRatio = drawnAmount > 0 ? drawnAmount / outstanding : 1;
    const principalRepaid = repayAmount * principalRatio;
    const interestRepaid = repayAmount - principalRepaid;

    const newOutstanding = Math.max(0, outstanding - repayAmount);
    const isFullyRepaid = newOutstanding < 0.01;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO income_credit_repayment_history
         (credit_line_id, wallet_address, repayment_amount_usd, principal_repaid_usd, interest_repaid_usd,
          outstanding_before_usd, outstanding_after_usd, fully_repaid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          creditLineId,
          auth.verifiedAddress,
          repayAmount.toFixed(6),
          principalRepaid.toFixed(6),
          interestRepaid.toFixed(6),
          outstandingBefore.toFixed(6),
          newOutstanding.toFixed(6),
          isFullyRepaid,
        ]
      );

      if (isFullyRepaid) {
        await client.query(
          `UPDATE income_credit_lines
           SET status = 'repaid'::income_credit_line_status,
               outstanding_balance_usd = 0,
               interest_earned_usd = COALESCE(interest_earned_usd, 0) + $1,
               repaid_at = NOW(),
               gef_violation_flagged = false,
               updated_at = NOW()
           WHERE id = $2`,
          [interestRepaid.toFixed(6), line.id]
        );

        await client.query(
          `UPDATE gef_user_execution_profiles
           SET gef_violation_flagged = false, updated_at = NOW()
           WHERE LOWER(wallet_address) = $1`,
          [auth.verifiedAddress]
        ).catch(() => {});
      } else {
        await client.query(
          `UPDATE income_credit_lines
           SET outstanding_balance_usd = $1,
               interest_earned_usd = COALESCE(interest_earned_usd, 0) + $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newOutstanding.toFixed(6), interestRepaid.toFixed(6), line.id]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      creditLineId,
      walletAddress: auth.verifiedAddress,
      repaymentAmountUsd: repayAmount,
      principalRepaidUsd: parseFloat(principalRepaid.toFixed(6)),
      interestRepaidUsd: parseFloat(interestRepaid.toFixed(6)),
      remainingOutstandingUsd: parseFloat(newOutstanding.toFixed(6)),
      interestDistributedToJuniorPoolUsd: parseFloat(interestRepaid.toFixed(6)),
      fullyRepaid: isFullyRepaid,
      gefViolationCleared: isFullyRepaid,
      message: isFullyRepaid
        ? `Repayment complete. Credit line closed. $${interestRepaid.toFixed(2)} in interest distributed to the community junior pool. GEF violation flag cleared if set.`
        : `Partial repayment of $${repayAmount.toLocaleString()} recorded. Remaining balance: $${newOutstanding.toFixed(2)}.`,
    });
  } catch (err: any) {
    console.error('[community-credit/repay]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
