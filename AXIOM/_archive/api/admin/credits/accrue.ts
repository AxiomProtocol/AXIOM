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
    const { operatorId, amount, reason, source = 'ADMIN_MANUAL' } = req.body;

    if (!operatorId || !amount) {
      return res.status(400).json({ error: 'operatorId and amount required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const operatorResult = await client.query(
      'SELECT operator_id FROM node_operators WHERE operator_id = $1 LIMIT 1',
      [operatorId]
    );

    if (operatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    let ledgerResult = await client.query(
      'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
      [operatorId]
    );

    if (ledgerResult.rows.length === 0) {
      await client.query(
        `INSERT INTO credits_ledger (operator_id, available_balance, pending_balance, total_earned, total_redeemed, total_slashed)
         VALUES ($1, '0', '0', '0', '0', '0')`,
        [operatorId]
      );
      
      ledgerResult = await client.query(
        'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
        [operatorId]
      );
    }

    const ledger = ledgerResult.rows[0];
    const transactionId = `ACC-${nanoid(12)}`;
    const currentAvailable = parseFloat(ledger.available_balance || '0');
    const currentTotalEarned = parseFloat(ledger.total_earned || '0');
    const newAvailable = currentAvailable + parsedAmount;
    const newTotalEarned = currentTotalEarned + parsedAmount;

    await client.query(
      `INSERT INTO credits_transactions (transaction_id, operator_id, type, amount, currency, source, status, reason)
       VALUES ($1, $2, 'ACCRUAL', $3, 'USD', $4, 'COMPLETED', $5)`,
      [transactionId, operatorId, parsedAmount.toString(), source, reason || 'Admin-initiated credit accrual']
    );

    await client.query(
      `UPDATE credits_ledger 
       SET available_balance = $1, total_earned = $2, updated_at = NOW()
       WHERE operator_id = $3`,
      [newAvailable.toString(), newTotalEarned.toString(), operatorId]
    );

    await client.query(
      `INSERT INTO admin_audit_logs (admin_wallet, action, target_type, target_id, details)
       VALUES ($1, 'CREDITS_ACCRUE', 'operator', $2, $3)`,
      [adminWallet.toLowerCase(), operatorId, JSON.stringify({
        transactionId,
        amount: parsedAmount,
        reason,
        source,
        newBalance: newAvailable,
      })]
    );

    return res.status(200).json({
      success: true,
      transactionId,
      operatorId,
      amount: parsedAmount,
      newAvailableBalance: newAvailable,
      newTotalEarned: newTotalEarned,
    });
  } catch (error) {
    console.error('Error accruing credits:', error);
    return res.status(500).json({ error: 'Failed to accrue credits' });
  } finally {
    client.release();
  }
}
