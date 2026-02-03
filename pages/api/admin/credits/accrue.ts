import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { creditsLedger, creditsTransactions, nodeOperators, adminAuditLogs } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
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

  try {
    const { operatorId, amount, reason, source = 'ADMIN_MANUAL' } = req.body;

    if (!operatorId || !amount) {
      return res.status(400).json({ error: 'operatorId and amount required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const operator = await db
      .select()
      .from(nodeOperators)
      .where(eq(nodeOperators.operatorId, operatorId))
      .limit(1);

    if (operator.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

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

    const transactionId = `ACC-${nanoid(12)}`;
    const currentAvailable = parseFloat(ledger[0].availableBalance || '0');
    const currentTotalEarned = parseFloat(ledger[0].totalEarned || '0');
    const newAvailable = currentAvailable + parsedAmount;
    const newTotalEarned = currentTotalEarned + parsedAmount;

    await db.insert(creditsTransactions).values({
      transactionId,
      operatorId,
      type: 'ACCRUAL',
      amount: parsedAmount.toString(),
      currency: 'USD',
      source,
      status: 'COMPLETED',
      reason: reason || 'Admin-initiated credit accrual',
    });

    await db
      .update(creditsLedger)
      .set({
        availableBalance: newAvailable.toString(),
        totalEarned: newTotalEarned.toString(),
        updatedAt: new Date(),
      })
      .where(eq(creditsLedger.operatorId, operatorId));

    await db.insert(adminAuditLogs).values({
      adminWallet: adminWallet.toLowerCase(),
      action: 'CREDITS_ACCRUE',
      targetType: 'operator',
      targetId: operatorId,
      details: {
        transactionId,
        amount: parsedAmount,
        reason,
        source,
        newBalance: newAvailable,
      },
    });

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
  }
}
