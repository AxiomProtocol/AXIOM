import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { creditsLedger, creditsTransactions, nodeOperators } from '../../../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { isAdminWallet } from '../../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string;
  
  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'GET') {
    return getCreditsLedgers(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getCreditsLedgers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const operatorId = req.query.operatorId as string;

    let query = db
      .select({
        ledger: creditsLedger,
        operator: {
          operatorId: nodeOperators.operatorId,
          walletAddress: nodeOperators.walletAddress,
          displayName: nodeOperators.displayName,
          status: nodeOperators.status,
        },
      })
      .from(creditsLedger)
      .innerJoin(nodeOperators, eq(creditsLedger.operatorId, nodeOperators.operatorId))
      .orderBy(desc(creditsLedger.updatedAt))
      .limit(limit)
      .offset(offset);

    if (operatorId) {
      query = query.where(eq(creditsLedger.operatorId, operatorId)) as any;
    }

    const ledgers = await query;

    const totals = await db
      .select({
        totalAvailable: sql<string>`COALESCE(SUM(available_balance), 0)`,
        totalPending: sql<string>`COALESCE(SUM(pending_balance), 0)`,
        totalEarned: sql<string>`COALESCE(SUM(total_earned), 0)`,
        totalRedeemed: sql<string>`COALESCE(SUM(total_redeemed), 0)`,
        totalSlashed: sql<string>`COALESCE(SUM(total_slashed), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(creditsLedger);

    return res.status(200).json({
      success: true,
      ledgers: ledgers.map(l => ({
        operatorId: l.operator.operatorId,
        walletAddress: l.operator.walletAddress,
        displayName: l.operator.displayName,
        operatorStatus: l.operator.status,
        availableBalance: l.ledger.availableBalance,
        pendingBalance: l.ledger.pendingBalance,
        totalEarned: l.ledger.totalEarned,
        totalRedeemed: l.ledger.totalRedeemed,
        totalSlashed: l.ledger.totalSlashed,
        lastSyncedAt: l.ledger.lastSyncedAt,
        updatedAt: l.ledger.updatedAt,
      })),
      summary: {
        totalAvailable: totals[0]?.totalAvailable || '0',
        totalPending: totals[0]?.totalPending || '0',
        totalEarned: totals[0]?.totalEarned || '0',
        totalRedeemed: totals[0]?.totalRedeemed || '0',
        totalSlashed: totals[0]?.totalSlashed || '0',
        operatorCount: totals[0]?.count || 0,
      },
      pagination: {
        limit,
        offset,
        hasMore: ledgers.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching credits ledgers:', error);
    return res.status(500).json({ error: 'Failed to fetch credits ledgers' });
  }
}
