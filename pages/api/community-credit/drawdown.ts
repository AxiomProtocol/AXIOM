import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { walletAddress, creditLineId, purpose } = req.body;

  if (!walletAddress || !creditLineId) {
    return res.status(400).json({ success: false, error: 'walletAddress and creditLineId are required' });
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

    const drawAmount = parseFloat(line.available_balance_usd);
    const repaymentDueDays = line.repayment_due_days || 30;
    const repaymentDueDate = new Date();
    repaymentDueDate.setDate(repaymentDueDate.getDate() + repaymentDueDays);

    const interestRate = (line.interest_rate_bps || 500) / 10000;
    const interestUsd = drawAmount * interestRate * (repaymentDueDays / 365);
    const totalOwed = drawAmount + interestUsd;

    await pool.query(
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

    return res.status(200).json({
      success: true,
      creditLineId,
      walletAddress: walletAddress.toLowerCase(),
      drawnAmountUsd: drawAmount,
      interestUsd: parseFloat(interestUsd.toFixed(6)),
      totalOwedUsd: parseFloat(totalOwed.toFixed(6)),
      repaymentDueDate: repaymentDueDate.toISOString(),
      purpose: line.purpose,
      message: `Draw-down of $${drawAmount.toLocaleString()} recorded. Total repayment of $${totalOwed.toFixed(2)} is due by ${repaymentDueDate.toLocaleDateString()}. Disbursement is processed by the protocol treasury (AXUSD).`,
    });
  } catch (err: any) {
    console.error('[community-credit/drawdown]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
