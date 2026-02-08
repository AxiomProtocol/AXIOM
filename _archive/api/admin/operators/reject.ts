import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { sendOperatorRejectedEmail } from '../../../../lib/email/operatorEmails';
import { isAdminWallet } from '../../../../lib/admin/config';
import { checkRateLimit } from '../../../../lib/admin/rateLimit';
import { logAdminAction } from '../../../../lib/admin/auditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  if (!isAdminWallet(adminWallet)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const rateLimit = checkRateLimit(adminWallet.toLowerCase());
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      message: 'Rate limit exceeded', 
      retryAfter: Math.ceil(rateLimit.resetIn / 1000) 
    });
  }

  const { operatorId, reason } = req.body;

  if (!operatorId) {
    return res.status(400).json({ message: 'operatorId is required' });
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

      const { status, email, display_name } = checkResult.rows[0];

      if (status === 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot reject an active operator' });
      }

      await client.query(
        `UPDATE node_operators 
         SET status = 'REJECTED', onboarding_phase = 'REJECTED', updated_at = NOW()
         WHERE operator_id = $1`,
        [operatorId]
      );

      await client.query(
        `UPDATE node_onboarding 
         SET current_phase = 'REJECTED', updated_at = NOW()
         WHERE operator_id = $1`,
        [operatorId]
      );

      await client.query('COMMIT');

      await logAdminAction({
        adminWallet: adminWallet.toLowerCase(),
        action: 'OPERATOR_REJECTED',
        targetOperatorId: operatorId,
        details: { previousStatus: status, reason: reason || null }
      });

      let emailSent = false;
      let emailError = null;
      try {
        await sendOperatorRejectedEmail(email, display_name, operatorId, reason);
        emailSent = true;
      } catch (err: any) {
        console.error('Failed to send rejection email:', err);
        emailError = err.message || 'Email service unavailable';
      }

      res.status(200).json({ 
        success: true, 
        message: 'Operator application rejected',
        operatorId,
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
    console.error('Error rejecting operator:', error);
    res.status(500).json({ message: 'Failed to reject operator' });
  }
}
