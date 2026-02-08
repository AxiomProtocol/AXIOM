import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return getCredits(req, res);
  } else if (req.method === 'POST') {
    return claimCredits(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getCredits(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { wallet } = req.query;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const operatorResult = await client.query(
      'SELECT operator_id FROM node_operators WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1',
      [wallet]
    );

    if (operatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const operatorId = operatorResult.rows[0].operator_id;

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
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const txResult = await client.query(
      `SELECT * FROM credits_transactions 
       WHERE operator_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [operatorId, limit, offset]
    );

    return res.status(200).json({
      success: true,
      ledger: {
        availableBalance: ledger.available_balance,
        pendingBalance: ledger.pending_balance,
        totalEarned: ledger.total_earned,
        totalRedeemed: ledger.total_redeemed,
        totalSlashed: ledger.total_slashed,
        lastSyncedAt: ledger.last_synced_at,
      },
      transactions: txResult.rows.map(tx => ({
        id: tx.transaction_id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        source: tx.source,
        status: tx.status,
        reason: tx.reason,
        txHash: tx.tx_hash,
        createdAt: tx.created_at,
      })),
      pagination: {
        limit,
        offset,
        hasMore: txResult.rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return res.status(500).json({ error: 'Failed to fetch credits' });
  } finally {
    client.release();
  }
}

async function claimCredits(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const { wallet, amount, currency = 'USD' } = req.body;

    if (!wallet || !amount) {
      return res.status(400).json({ error: 'Wallet and amount required' });
    }

    const operatorResult = await client.query(
      'SELECT operator_id FROM node_operators WHERE LOWER(wallet_address) = LOWER($1) LIMIT 1',
      [wallet]
    );

    if (operatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const operatorId = operatorResult.rows[0].operator_id;

    const ledgerResult = await client.query(
      'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
      [operatorId]
    );

    if (ledgerResult.rows.length === 0) {
      return res.status(400).json({ error: 'No credits ledger found' });
    }

    const ledger = ledgerResult.rows[0];
    const availableBalance = parseFloat(ledger.available_balance || '0');
    const requestedAmount = parseFloat(amount);

    if (requestedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (requestedAmount > availableBalance) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const transactionId = `CLM-${nanoid(12)}`;

    await client.query(
      `INSERT INTO credits_transactions (transaction_id, operator_id, type, amount, currency, source, status, reason)
       VALUES ($1, $2, 'REDEMPTION', $3, $4, 'SYSTEM', 'PENDING', 'Operator-initiated claim request')`,
      [transactionId, operatorId, requestedAmount.toString(), currency]
    );

    const newPending = parseFloat(ledger.pending_balance || '0') + requestedAmount;
    const newAvailable = availableBalance - requestedAmount;

    await client.query(
      `UPDATE credits_ledger 
       SET available_balance = $1, pending_balance = $2, updated_at = NOW()
       WHERE operator_id = $3`,
      [newAvailable.toString(), newPending.toString(), operatorId]
    );

    return res.status(200).json({
      success: true,
      transactionId,
      message: 'Claim request submitted successfully',
      claimedAmount: requestedAmount,
      newAvailableBalance: newAvailable,
    });
  } catch (error) {
    console.error('Error claiming credits:', error);
    return res.status(500).json({ error: 'Failed to process claim' });
  } finally {
    client.release();
  }
}
