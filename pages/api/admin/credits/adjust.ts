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

    const operator = await db
      .select()
      .from(nodeOperators)
      .where(eq(nodeOperators.operatorId, operatorId))
      .limit(1);

    if (operator.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const ledger = await db
      .select()
      .from(creditsLedger)
      .where(eq(creditsLedger.operatorId, operatorId))
      .limit(1);

    if (ledger.length === 0) {
      return res.status(400).json({ error: 'No credits ledger found for operator' });
    }

    const currentAvailable = parseFloat(ledger[0].availableBalance || '0');
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

    await db.insert(creditsTransactions).values({
      transactionId,
      operatorId,
      type: 'ADJUSTMENT',
      amount: Math.abs(parsedAdjustment).toString(),
      currency: 'USD',
      source: 'ADMIN_ADJUSTMENT',
      status: 'COMPLETED',
      reason: `[${adjustmentType}] ${reason}`,
      metadata: {
        adjustmentType,
        direction: isPositive ? 'CREDIT' : 'DEBIT',
        previousBalance: currentAvailable,
      },
    });

    const updateData: any = {
      availableBalance: newAvailable.toString(),
      updatedAt: new Date(),
    };

    if (isPositive) {
      const currentTotalEarned = parseFloat(ledger[0].totalEarned || '0');
      updateData.totalEarned = (currentTotalEarned + parsedAdjustment).toString();
    } else {
      const currentTotalSlashed = parseFloat(ledger[0].totalSlashed || '0');
      updateData.totalSlashed = (currentTotalSlashed + Math.abs(parsedAdjustment)).toString();
    }

    await db
      .update(creditsLedger)
      .set(updateData)
      .where(eq(creditsLedger.operatorId, operatorId));

    await db.insert(adminAuditLogs).values({
      adminWallet: adminWallet.toLowerCase(),
      action: 'CREDITS_ADJUST',
      targetType: 'operator',
      targetId: operatorId,
      details: {
        transactionId,
        adjustment: parsedAdjustment,
        adjustmentType,
        reason,
        previousBalance: currentAvailable,
        newBalance: newAvailable,
      },
    });

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
  }
}
