import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { walletAddress, checklist } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address required' });
  }

  try {
    const operatorResult = await pool.query(
      'SELECT operator_id, status, role FROM node_operators WHERE wallet_address = $1',
      [walletAddress.toLowerCase()]
    );

    if (operatorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Operator not found' });
    }

    const operator = operatorResult.rows[0];

    if (operator.status !== 'DRY_RUN_PASSED') {
      return res.status(400).json({ message: 'Operator must be in DRY_RUN_PASSED status to submit certification' });
    }

    const requiredChecks = ['charter', 'dryRun', 'keyManagement', 'communication'];
    if (operator.role === 'ATTESTOR') {
      requiredChecks.push('bonding');
    }

    for (const check of requiredChecks) {
      if (!checklist[check]) {
        return res.status(400).json({ message: `Missing required checklist item: ${check}` });
      }
    }

    await pool.query(
      `UPDATE node_operators 
       SET status = 'CERTIFIED', 
           onboarding_phase = 'CERTIFIED',
           updated_at = NOW()
       WHERE wallet_address = $1`,
      [walletAddress.toLowerCase()]
    );

    await pool.query(
      `INSERT INTO node_onboarding (operator_id, phase, completed_at, notes)
       VALUES ($1, 'CERTIFIED', NOW(), $2)
       ON CONFLICT (operator_id, phase) DO UPDATE SET completed_at = NOW(), notes = $2`,
      [operator.operator_id, JSON.stringify(checklist)]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Certification submitted successfully. Your status has been updated to CERTIFIED.',
      newStatus: 'CERTIFIED'
    });
  } catch (error: any) {
    console.error('Certification submission error:', error);
    res.status(500).json({ message: 'Failed to submit certification' });
  }
}
