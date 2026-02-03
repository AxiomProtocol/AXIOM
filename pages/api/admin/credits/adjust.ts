import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { isAdminWallet } from '../../../../lib/admin/config';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  
  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const client = await pool.connect();
  try {
    const { operatorId, adjustment, reason, adjustmentType = 'CORRECTION' } = req.body;

    if (!operatorId || adjustment === undefined) {
      return res.status(400).json({ error: 'operatorId and adjustment required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for adjustments' });
    }

    const parsedAdjustment = parseFloat(adjustment);
    if (isNaN(parsedAdjustment) || parsedAdjustment === 0) {
      return res.status(400).json({ error: 'Adjustment must be a non-zero number' });
    }

    const operatorResult = await client.query(
      'SELECT operator_id FROM node_operators WHERE operator_id = $1 LIMIT 1',
      [operatorId]
    );

    if (operatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const ledgerResult = await client.query(
      'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
      [operatorId]
    );

    if (ledgerResult.rows.length === 0) {
      return res.status(400).json({ error: 'No credits ledger found for operator' });
    }

    const ledger = ledgerResult.rows[0];
    const currentAvailable = parseFloat(ledger.available_balance || '0');
    const newAvailable = currentAvailable + parsedAdjustment;

    if (newAvailable < 0) {
      return res.status(400).json({ 
        error: 'Adjustment would result in negative balance',
        currentBalance: currentAvailable,
        requestedAdjustment: parsedAdjustment,
      });
    }

    const transactionId = `ADJ-${nanoid(12)}`;
    const isPositive = parsedAdjustment > 0;

    await client.query(
      `INSERT INTO credits_transactions (transaction_id, operator_id, type, amount, currency, source, status, reason, metadata)
       VALUES ($1, $2, 'ADJUSTMENT', $3, 'USD', 'ADMIN_ADJUSTMENT', 'COMPLETED', $4, $5)`,
      [
        transactionId, 
        operatorId, 
        Math.abs(parsedAdjustment).toString(), 
        `[${adjustmentType}] ${reason}`,
        JSON.stringify({
          adjustmentType,
          direction: isPositive ? 'CREDIT' : 'DEBIT',
          previousBalance: currentAvailable,
        })
      ]
    );

    let updateQuery: string;
    let updateParams: any[];

    if (isPositive) {
      const currentTotalEarned = parseFloat(ledger.total_earned || '0');
      updateQuery = `UPDATE credits_ledger 
                     SET available_balance = $1, total_earned = $2, updated_at = NOW()
                     WHERE operator_id = $3`;
      updateParams = [newAvailable.toString(), (currentTotalEarned + parsedAdjustment).toString(), operatorId];
    } else {
      const currentTotalSlashed = parseFloat(ledger.total_slashed || '0');
      updateQuery = `UPDATE credits_ledger 
                     SET available_balance = $1, total_slashed = $2, updated_at = NOW()
                     WHERE operator_id = $3`;
      updateParams = [newAvailable.toString(), (currentTotalSlashed + Math.abs(parsedAdjustment)).toString(), operatorId];
    }

    await client.query(updateQuery, updateParams);

    await client.query(
      `INSERT INTO admin_audit_logs (admin_wallet, action, target_type, target_id, details)
       VALUES ($1, 'CREDITS_ADJUST', 'operator', $2, $3)`,
      [adminWallet.toLowerCase(), operatorId, JSON.stringify({
        transactionId,
        adjustment: parsedAdjustment,
        adjustmentType,
        reason,
        previousBalance: currentAvailable,
        newBalance: newAvailable,
      })]
    );

    return res.status(200).json({
      success: true,
      transactionId,
      operatorId,
      adjustment: parsedAdjustment,
      direction: isPositive ? 'CREDIT' : 'DEBIT',
      previousBalance: currentAvailable,
      newAvailableBalance: newAvailable,
    });
  } catch (error) {
    console.error('Error adjusting credits:', error);
    return res.status(500).json({ error: 'Failed to adjust credits' });
  } finally {
    client.release();
  }
}
