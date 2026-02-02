import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { sendOperatorAdvancedEmail } from '../../../../lib/email/operatorEmails';
import { isAdminWallet } from '../../../../lib/admin/config';
import { checkRateLimit } from '../../../../lib/admin/rateLimit';
import { logAdminAction } from '../../../../lib/admin/auditLog';

const PHASE_ORDER = ['APPLIED', 'VERIFIED', 'PROVISIONED', 'DRY_RUN_PASSED', 'CERTIFIED', 'ACTIVE'];

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

  const { operatorIds } = req.body;

  if (!operatorIds || !Array.isArray(operatorIds) || operatorIds.length === 0) {
    return res.status(400).json({ message: 'operatorIds array is required' });
  }

  if (operatorIds.length > 20) {
    return res.status(400).json({ message: 'Maximum 20 operators per batch' });
  }

  const results: { operatorId: string; success: boolean; newPhase?: string; error?: string; emailSent?: boolean }[] = [];

  for (const operatorId of operatorIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkResult = await client.query(
        'SELECT status, email, display_name FROM node_operators WHERE operator_id = $1',
        [operatorId]
      );

      if (checkResult.rows.length === 0) {
        results.push({ operatorId, success: false, error: 'Not found' });
        await client.query('ROLLBACK');
        continue;
      }

      const { status: currentPhase, email, display_name } = checkResult.rows[0];
      const currentIndex = PHASE_ORDER.indexOf(currentPhase);

      if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
        results.push({ operatorId, success: false, error: 'Cannot advance further' });
        await client.query('ROLLBACK');
        continue;
      }

      const newPhase = PHASE_ORDER[currentIndex + 1];
      const activatedAt = newPhase === 'ACTIVE' ? ', activated_at = NOW()' : '';

      await client.query(
        `UPDATE node_operators 
         SET status = $1, onboarding_phase = $1, updated_at = NOW() ${activatedAt}
         WHERE operator_id = $2`,
        [newPhase, operatorId]
      );

      await client.query('COMMIT');

      await logAdminAction({
        adminWallet: adminWallet.toLowerCase(),
        action: 'OPERATOR_ADVANCED',
        targetOperatorId: operatorId,
        details: { fromPhase: currentPhase, toPhase: newPhase, bulk: true }
      });

      let emailSent = false;
      try {
        await sendOperatorAdvancedEmail(email, display_name, operatorId, newPhase);
        emailSent = true;
      } catch (err) {
        console.error(`Failed to send email to ${operatorId}:`, err);
      }

      results.push({ operatorId, success: true, newPhase, emailSent });
    } catch (err) {
      await client.query('ROLLBACK');
      results.push({ operatorId, success: false, error: 'Database error' });
    } finally {
      client.release();
    }
  }

  const successCount = results.filter(r => r.success).length;
  res.status(200).json({ 
    success: true,
    message: `${successCount}/${operatorIds.length} operators advanced`,
    results
  });
}
