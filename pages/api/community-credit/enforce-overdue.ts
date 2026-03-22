import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { isAdminRequest } from '../../../lib/community-credit-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Admin key required for overdue enforcement' });
  }

  try {
    const overdueResult = await pool.query(
      `SELECT icl.*, ica.wallet_address as app_wallet
       FROM income_credit_lines icl
       JOIN income_credit_applications ica ON icl.application_id = ica.id
       WHERE icl.status = 'drawn'
         AND icl.repayment_due_date IS NOT NULL
         AND icl.repayment_due_date < NOW()
         AND icl.gef_violation_flagged = false`
    );

    const flagged: string[] = [];
    const defaulted: string[] = [];

    for (const line of overdueResult.rows) {
      const daysPastDue = Math.floor(
        (Date.now() - new Date(line.repayment_due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      await pool.query(
        `UPDATE income_credit_lines
         SET gef_violation_flagged = true, updated_at = NOW()
         WHERE id = $1`,
        [line.id]
      );

      await pool.query(
        `UPDATE gef_user_execution_profiles
         SET gef_violation_flagged = true, updated_at = NOW()
         WHERE LOWER(wallet_address) = LOWER($1)`,
        [line.wallet_address]
      ).catch(() => {});

      flagged.push(line.credit_line_id);

      if (daysPastDue >= 60) {
        await pool.query(
          `UPDATE income_credit_lines
           SET status = 'defaulted'::income_credit_line_status, updated_at = NOW()
           WHERE id = $1`,
          [line.id]
        );
        defaulted.push(line.credit_line_id);
      }
    }

    return res.status(200).json({
      success: true,
      processedLines: overdueResult.rows.length,
      flaggedForViolation: flagged,
      markedDefaulted: defaulted,
      message: `Overdue enforcement complete. ${flagged.length} lines flagged for GEF violation. ${defaulted.length} lines moved to defaulted status (60+ days past due).`,
    });
  } catch (err: any) {
    console.error('[community-credit/enforce-overdue]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
