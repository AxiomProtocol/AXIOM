import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { creditsLedger, creditsTransactions, nodeOperators } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';
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
  try {
    const { wallet } = req.query;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const operator = await db
      .select()
      .from(nodeOperators)
      .where(eq(nodeOperators.walletAddress, wallet.toLowerCase()))
      .limit(1);

    if (operator.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const operatorId = operator[0].operatorId;

    let ledger = await db
      .select()
      .from(creditsLedger)
      .where(eq(creditsLedger.operatorId, operatorId))
      .limit(1);

    if (ledger.length === 0) {
      await db.insert(creditsLedger).values({
        operatorId,
        availableBalance: '0',
        pendingBalance: '0',
        totalEarned: '0',
        totalRedeemed: '0',
        totalSlashed: '0',
      });
      
      ledger = await db
        .select()
        .from(creditsLedger)
        .where(eq(creditsLedger.operatorId, operatorId))
        .limit(1);
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await db
      .select()
      .from(creditsTransactions)
      .where(eq(creditsTransactions.operatorId, operatorId))
      .orderBy(desc(creditsTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      ledger: {
        availableBalance: ledger[0].availableBalance,
        pendingBalance: ledger[0].pendingBalance,
        totalEarned: ledger[0].totalEarned,
        totalRedeemed: ledger[0].totalRedeemed,
        totalSlashed: ledger[0].totalSlashed,
        lastSyncedAt: ledger[0].lastSyncedAt,
      },
      transactions: transactions.map(tx => ({
        id: tx.transactionId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        source: tx.source,
        status: tx.status,
        reason: tx.reason,
        txHash: tx.txHash,
        createdAt: tx.createdAt,
      })),
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return res.status(500).json({ error: 'Failed to fetch credits' });
  }
}

async function claimCredits(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { wallet, amount, currency = 'USD' } = req.body;

    if (!wallet || !amount) {
      return res.status(400).json({ error: 'Wallet and amount required' });
    }

    const operator = await db
      .select()
      .from(nodeOperators)
      .where(eq(nodeOperators.walletAddress, wallet.toLowerCase()))
      .limit(1);

    if (operator.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const operatorId = operator[0].operatorId;

    const ledger = await db
      .select()
      .from(creditsLedger)
      .where(eq(creditsLedger.operatorId, operatorId))
      .limit(1);

    if (ledger.length === 0) {
      return res.status(400).json({ error: 'No credits ledger found' });
    }

    const availableBalance = parseFloat(ledger[0].availableBalance || '0');
    const requestedAmount = parseFloat(amount);

    if (requestedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (requestedAmount > availableBalance) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const transactionId = `CLM-${nanoid(12)}`;

    await db.insert(creditsTransactions).values({
      transactionId,
      operatorId,
      type: 'REDEMPTION',
      amount: requestedAmount.toString(),
      currency,
      source: 'SYSTEM',
      status: 'PENDING',
      reason: 'Operator-initiated claim request',
    });

    const newPending = parseFloat(ledger[0].pendingBalance || '0') + requestedAmount;
    const newAvailable = availableBalance - requestedAmount;

    await db
      .update(creditsLedger)
      .set({
        availableBalance: newAvailable.toString(),
        pendingBalance: newPending.toString(),
        updatedAt: new Date(),
      })
      .where(eq(creditsLedger.operatorId, operatorId));

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
  }
}
