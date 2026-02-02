import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { sendOperatorAdvancedEmail } from '../../../../lib/email/operatorEmails';

const PHASE_ORDER = ['APPLIED', 'VERIFIED', 'PROVISIONED', 'DRY_RUN_PASSED', 'CERTIFIED', 'ACTIVE'];
const PHASE_TIMESTAMPS: Record<string, string> = {
  'VERIFIED': 'verification_completed_at',
  'PROVISIONED': 'provisioning_completed_at',
  'DRY_RUN_PASSED': 'dry_run_completed_at',
  'CERTIFIED': 'certification_completed_at',
  'ACTIVE': 'activation_completed_at',
};

const ADMIN_WALLETS = [
  '0xa6ed10e752d5facd989ee9ced113b3a064b47493',
].map(w => w.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet.toLowerCase())) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { operatorId, newPhase } = req.body;

  if (!operatorId || !newPhase) {
    return res.status(400).json({ message: 'operatorId and newPhase are required' });
  }

  if (!PHASE_ORDER.includes(newPhase)) {
    return res.status(400).json({ message: 'Invalid phase' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT status, email, display_name FROM node_operators WHERE operator_id = $1',
        [operatorId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Operator not found' });
      }

      const { status: currentPhase, email, display_name } = checkResult.rows[0];
      const currentIndex = PHASE_ORDER.indexOf(currentPhase);
      const newIndex = PHASE_ORDER.indexOf(newPhase);

      if (newIndex <= currentIndex) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot move to same or earlier phase' });
      }

      const activatedAt = newPhase === 'ACTIVE' ? ', activated_at = NOW()' : '';
      await client.query(
        `UPDATE node_operators 
         SET status = $1, onboarding_phase = $1, updated_at = NOW() ${activatedAt}
         WHERE operator_id = $2`,
        [newPhase, operatorId]
      );

      const timestampColumn = PHASE_TIMESTAMPS[newPhase];
      if (timestampColumn) {
        await client.query(
          `UPDATE node_onboarding 
           SET current_phase = $1, ${timestampColumn} = NOW(), updated_at = NOW()
           WHERE operator_id = $2`,
          [newPhase, operatorId]
        );
      }

      await client.query('COMMIT');

      let emailSent = false;
      let emailError = null;
      try {
        await sendOperatorAdvancedEmail(email, display_name, operatorId, newPhase);
        emailSent = true;
      } catch (err: any) {
        console.error('Failed to send advancement email:', err);
        emailError = err.message || 'Email service unavailable';
      }

      res.status(200).json({ 
        success: true, 
        message: `Operator advanced to ${newPhase}`,
        operatorId,
        newPhase,
        emailSent,
        emailError: emailSent ? null : emailError
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error advancing operator:', error);
    res.status(500).json({ message: 'Failed to advance operator' });
  }
}
