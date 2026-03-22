import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth } from '../../../lib/community-credit-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, creditLineId, repaymentAmountUsd } = req.body as {
    walletAddress?: string;
    creditLineId?: string;
    repaymentAmountUsd?: string | number;
  };

  if (!walletAddress || !creditLineId || !repaymentAmountUsd) {
    return res.status(400).json({ success: false, error: 'walletAddress, creditLineId, and repaymentAmountUsd are required' });
  }

  const auth = verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
  }

  const repayAmount = parseFloat(String(repaymentAmountUsd));
  if (isNaN(repayAmount) || repayAmount <= 0) {
    return res.status(400).json({ success: false, error: 'repaymentAmountUsd must be a positive number' });
  }

  try {
    const lineResult = await pool.query<{
      id: number;
      status: string;
      outstanding_balance_usd: string;
      drawn_amount_usd: string;
      interest_earned_usd: string | null;
    }>(
      `SELECT id, status, outstanding_balance_usd, drawn_amount_usd, interest_earned_usd
       FROM income_credit_lines
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
    const drawnPrincipal = parseFloat(line.drawn_amount_usd || '0');

    if (repayAmount > outstanding + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Repayment amount ($${repayAmount.toFixed(2)}) exceeds outstanding balance ($${outstanding.toFixed(2)}). Submit the exact outstanding amount or less.`,
        outstandingBalanceUsd: outstanding,
      });
    }

    const effectiveRepay = Math.min(repayAmount, outstanding);
    const outstandingBefore = outstanding;

    // Interest-first repayment model:
    // outstanding_balance_usd = principal + accrued interest at drawdown.
    // interestRemaining = outstanding - drawnPrincipal (always >= 0 since outstanding starts >= drawn).
    // Pay interest first, then principal from remaining payment.
    // After a partial repayment, outstanding decreases; next call recomputes from fresh outstanding.
    const interestRemaining = Math.max(0, outstanding - drawnPrincipal);
    const interestRepaid = Math.min(effectiveRepay, interestRemaining);
    const principalRepaid = effectiveRepay - interestRepaid;

    const newOutstanding = Math.max(0, outstanding - effectiveRepay);
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
          effectiveRepay.toFixed(6),
          principalRepaid.toFixed(6),
          interestRepaid.toFixed(6),
          outstandingBefore.toFixed(6),
          newOutstanding.toFixed(6),
          isFullyRepaid,
        ]
      );

      await client.query(
        `INSERT INTO community_credit_treasury_ledger
         (event_type, credit_line_id, wallet_address, amount_usd, direction, tranche, notes)
         VALUES ('repayment_received'::treasury_ledger_event_type, $1, $2, $3, 'in', 'senior', $4)`,
        [
          creditLineId,
          auth.verifiedAddress,
          principalRepaid.toFixed(6),
          `Principal repayment — outstanding before: $${outstandingBefore.toFixed(2)}, after: $${newOutstanding.toFixed(2)}`,
        ]
      );

      if (interestRepaid > 0.000001) {
        await client.query(
          `INSERT INTO community_credit_treasury_ledger
           (event_type, credit_line_id, wallet_address, amount_usd, direction, tranche, notes)
           VALUES ('interest_distribution'::treasury_ledger_event_type, $1, $2, $3, 'in', 'junior', $4)`,
          [
            creditLineId,
            auth.verifiedAddress,
            interestRepaid.toFixed(6),
            `Interest distributed to junior tranche (Wealth Practice LP pool) — interest-first allocation`,
          ]
        );
      }

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
      repaymentAmountUsd: effectiveRepay,
      principalRepaidUsd: parseFloat(principalRepaid.toFixed(6)),
      interestRepaidUsd: parseFloat(interestRepaid.toFixed(6)),
      remainingOutstandingUsd: parseFloat(newOutstanding.toFixed(6)),
      treasuryEvents: [
        { type: 'repayment_received', tranche: 'senior', amountUsd: parseFloat(principalRepaid.toFixed(6)) },
        ...(interestRepaid > 0.000001 ? [{ type: 'interest_distribution', tranche: 'junior', amountUsd: parseFloat(interestRepaid.toFixed(6)) }] : []),
      ],
      fullyRepaid: isFullyRepaid,
      gefViolationCleared: isFullyRepaid,
      message: isFullyRepaid
        ? `Repayment complete. Credit line closed. $${interestRepaid.toFixed(2)} distributed to community junior LP pool (treasury ledger). GEF violation flag cleared.`
        : `Partial repayment of $${effectiveRepay.toFixed(2)} recorded. Interest: $${interestRepaid.toFixed(2)}, Principal: $${principalRepaid.toFixed(2)}. Remaining: $${newOutstanding.toFixed(2)}.`,
    });
  } catch (_err) {
    console.error('[community-credit/repay]', _err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
