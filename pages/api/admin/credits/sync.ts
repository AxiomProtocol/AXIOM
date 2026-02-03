import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../lib/db';
import { creditsLedger, creditsTransactions, nodeOperators, onchainRewardsSync, adminAuditLogs } from '../../../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { isAdminWallet } from '../../../../lib/admin/config';
import { nanoid } from 'nanoid';
import { NodeRewardsClient } from '../../../../lib/contracts/node-economy/NodeRewardsClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  
  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { operatorId, syncAll = false } = req.body;

    if (!operatorId && !syncAll) {
      return res.status(400).json({ error: 'operatorId required, or set syncAll=true' });
    }

    const results: any[] = [];
    let operatorsToSync: any[] = [];

    if (syncAll) {
      operatorsToSync = await db
        .select()
        .from(nodeOperators)
        .where(eq(nodeOperators.status, 'ACTIVE'));
    } else {
      const operator = await db
        .select()
        .from(nodeOperators)
        .where(eq(nodeOperators.operatorId, operatorId))
        .limit(1);
      
      if (operator.length === 0) {
        return res.status(404).json({ error: 'Operator not found' });
      }
      operatorsToSync = operator;
    }

    const rewardsClient = new NodeRewardsClient();

    for (const operator of operatorsToSync) {
      try {
        const onChainNodeId = operator.onChainNodeId;
        
        if (!onChainNodeId) {
          results.push({
            operatorId: operator.operatorId,
            status: 'SKIPPED',
            reason: 'No on-chain node ID registered',
          });
          continue;
        }

        const existingSync = await db
          .select()
          .from(onchainRewardsSync)
          .where(eq(onchainRewardsSync.operatorId, operator.operatorId))
          .limit(1);

        const lastSyncedEpoch = existingSync.length > 0 ? existingSync[0].lastSyncedEpoch : 0;

        const currentEpoch = await rewardsClient.getCurrentEpoch();
        const totalClaimable = await rewardsClient.calculateNodeReward(BigInt(onChainNodeId));
        
        if (currentEpoch <= lastSyncedEpoch) {
          results.push({
            operatorId: operator.operatorId,
            status: 'UP_TO_DATE',
            lastSyncedEpoch,
            currentEpoch,
          });
          continue;
        }

        const totalClaimableFloat = parseFloat(totalClaimable.toString()) / 1e18;

        if (totalClaimableFloat > 0) {
          let ledger = await db
            .select()
            .from(creditsLedger)
            .where(eq(creditsLedger.operatorId, operator.operatorId))
            .limit(1);

          if (ledger.length === 0) {
            await db.insert(creditsLedger).values({
              operatorId: operator.operatorId,
              availableBalance: '0',
              pendingBalance: '0',
              totalEarned: '0',
              totalRedeemed: '0',
              totalSlashed: '0',
            });
            
            ledger = await db
              .select()
              .from(creditsLedger)
              .where(eq(creditsLedger.operatorId, operator.operatorId))
              .limit(1);
          }

          const transactionId = `SYNC-${nanoid(12)}`;
          const currentAvailable = parseFloat(ledger[0].availableBalance || '0');
          const currentTotalEarned = parseFloat(ledger[0].totalEarned || '0');

          await db.insert(creditsTransactions).values({
            transactionId,
            operatorId: operator.operatorId,
            type: 'ACCRUAL',
            amount: totalClaimableFloat.toString(),
            currency: 'AXIOM',
            source: 'ONCHAIN_SYNC',
            status: 'COMPLETED',
            reason: `On-chain rewards sync from epoch ${lastSyncedEpoch + 1} to ${currentEpoch}`,
            metadata: {
              nodeId: onChainNodeId,
              epochRange: [lastSyncedEpoch + 1, currentEpoch],
            },
          });

          await db
            .update(creditsLedger)
            .set({
              availableBalance: (currentAvailable + totalClaimableFloat).toString(),
              totalEarned: (currentTotalEarned + totalClaimableFloat).toString(),
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(creditsLedger.operatorId, operator.operatorId));
        }

        if (existingSync.length === 0) {
          await db.insert(onchainRewardsSync).values({
            nodeId: onChainNodeId.toString(),
            operatorId: operator.operatorId,
            lastSyncedEpoch: currentEpoch,
            totalClaimedOnchain: totalClaimable.toString(),
          });
        } else {
          await db
            .update(onchainRewardsSync)
            .set({
              lastSyncedEpoch: currentEpoch,
              totalClaimedOnchain: totalClaimable.toString(),
              lastSyncedAt: new Date(),
            })
            .where(eq(onchainRewardsSync.operatorId, operator.operatorId));
        }

        results.push({
          operatorId: operator.operatorId,
          status: 'SYNCED',
          previousEpoch: lastSyncedEpoch,
          currentEpoch,
          rewardsAdded: totalClaimableFloat,
        });
      } catch (opError: any) {
        console.error(`Error syncing operator ${operator.operatorId}:`, opError);
        results.push({
          operatorId: operator.operatorId,
          status: 'ERROR',
          error: opError.message,
        });
      }
    }

    await db.insert(adminAuditLogs).values({
      adminWallet: adminWallet.toLowerCase(),
      action: 'CREDITS_SYNC',
      targetType: 'system',
      targetId: syncAll ? 'all_operators' : operatorId,
      details: {
        syncAll,
        operatorCount: operatorsToSync.length,
        results: results.map(r => ({ operatorId: r.operatorId, status: r.status })),
      },
    });

    const synced = results.filter(r => r.status === 'SYNCED').length;
    const skipped = results.filter(r => r.status === 'SKIPPED').length;
    const upToDate = results.filter(r => r.status === 'UP_TO_DATE').length;
    const errors = results.filter(r => r.status === 'ERROR').length;

    return res.status(200).json({
      success: true,
      summary: {
        total: operatorsToSync.length,
        synced,
        skipped,
        upToDate,
        errors,
      },
      results,
    });
  } catch (error) {
    console.error('Error syncing credits:', error);
    return res.status(500).json({ error: 'Failed to sync credits' });
  }
}
