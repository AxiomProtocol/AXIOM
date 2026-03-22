import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth } from '../../../lib/community-credit-auth';

const VALID_PURPOSES = ['wealth_practice_entry', 'contribution_smoothing', 'earnest_money'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, creditLineId, confirmedPurpose } = req.body;

  if (!walletAddress || !creditLineId) {
    return res.status(400).json({ success: false, error: 'walletAddress and creditLineId are required' });
  }

  const auth = verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
  }

  if (confirmedPurpose && !VALID_PURPOSES.includes(confirmedPurpose)) {
    return res.status(400).json({ success: false, error: 'Invalid confirmedPurpose value' });
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

    if (line.status !== 'active') {
      return res.status(409).json({ success: false, error: `Credit line is ${line.status}. Only active credit lines can be drawn.` });
    }

    const now = new Date();
    if (new Date(line.expires_at) < now) {
      await pool.query(
        `UPDATE income_credit_lines SET status = 'expired'::income_credit_line_status, updated_at = NOW() WHERE id = $1`,
        [line.id]
      );
      return res.status(409).json({ success: false, error: 'Credit line has expired. Please submit a new application.' });
    }

    if (confirmedPurpose && confirmedPurpose !== line.purpose) {
      return res.status(400).json({
        success: false,
        error: `Purpose mismatch. This credit line was approved for '${line.purpose}' but confirmedPurpose was '${confirmedPurpose}'. Credit lines are single-purpose instruments.`,
      });
    }

    const drawAmount = parseFloat(line.available_balance_usd);
    if (drawAmount <= 0) {
      return res.status(409).json({ success: false, error: 'No available balance to draw.' });
    }

    const repaymentDueDays = line.repayment_due_days || 30;
    const repaymentDueDate = new Date();
    repaymentDueDate.setDate(repaymentDueDate.getDate() + repaymentDueDays);

    const interestRate = (line.interest_rate_bps || 500) / 10000;
    const interestUsd = drawAmount * interestRate * (repaymentDueDays / 365);
    const totalOwed = drawAmount + interestUsd;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE income_credit_lines
         SET status = 'drawn'::income_credit_line_status,
             drawn_amount_usd = $1,
             available_balance_usd = 0,
             outstanding_balance_usd = $2,
             repayment_due_date = $3,
             drawn_at = NOW(),
             updated_at = NOW()
         WHERE id = $4`,
        [drawAmount, totalOwed.toFixed(6), repaymentDueDate.toISOString(), line.id]
      );

      await client.query(
        `INSERT INTO community_credit_treasury_ledger
         (event_type, credit_line_id, wallet_address, amount_usd, direction, tranche, notes)
         VALUES ('disbursement'::treasury_ledger_event_type, $1, $2, $3, 'out', 'senior',
                 $4)`,
        [
          creditLineId,
          auth.verifiedAddress,
          drawAmount.toFixed(6),
          `V1 AXUSD disbursement from senior tranche — purpose: ${line.purpose}, repayment due: ${repaymentDueDate.toISOString()}`,
        ]
      );

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
      drawnAmountUsd: drawAmount,
      interestRateBps: line.interest_rate_bps || 500,
      interestUsd: parseFloat(interestUsd.toFixed(6)),
      totalOwedUsd: parseFloat(totalOwed.toFixed(6)),
      repaymentDueDate: repaymentDueDate.toISOString(),
      purpose: line.purpose,
      treasuryEvent: 'disbursement',
      tranche: 'senior',
      disbursementNote: 'AXUSD disbursement from senior tranche recorded in treasury ledger. On-chain settlement pending protocol treasury authorization.',
      message: `Draw-down of $${drawAmount.toLocaleString()} recorded for purpose '${line.purpose}'. Total repayment of $${totalOwed.toFixed(2)} is due by ${repaymentDueDate.toLocaleDateString()}.`,
    });
  } catch (err: any) {
    console.error('[community-credit/drawdown]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
