import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { isAdminWallet } from '../../../../lib/admin/config';
import { nanoid } from 'nanoid';
import { getNodeEconomyService } from '../../../../lib/contracts/node-economy/service';

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
    const { operatorId, syncAll = false } = req.body;

    if (!operatorId && !syncAll) {
      return res.status(400).json({ error: 'operatorId required, or set syncAll=true' });
    }

    const results: any[] = [];
    let operatorsToSync: any[] = [];

    if (syncAll) {
      const activeOpsResult = await client.query(
        "SELECT * FROM node_operators WHERE status = 'ACTIVE'"
      );
      operatorsToSync = activeOpsResult.rows;
    } else {
      const opResult = await client.query(
        'SELECT * FROM node_operators WHERE operator_id = $1 LIMIT 1',
        [operatorId]
      );
      
      if (opResult.rows.length === 0) {
        return res.status(404).json({ error: 'Operator not found' });
      }
      operatorsToSync = opResult.rows;
    }

    const nodeService = getNodeEconomyService();

    for (const operator of operatorsToSync) {
      try {
        const onChainNodeId = operator.on_chain_node_id;
        
        if (!onChainNodeId) {
          results.push({
            operatorId: operator.operator_id,
            status: 'SKIPPED',
            reason: 'No on-chain node ID registered',
          });
          continue;
        }

        const syncResult = await client.query(
          'SELECT * FROM onchain_rewards_sync WHERE operator_id = $1 LIMIT 1',
          [operator.operator_id]
        );

        const lastSyncedEpoch = syncResult.rows.length > 0 ? syncResult.rows[0].last_synced_epoch : 0;

        const stats = await nodeService.getSystemStats();
        const currentEpoch = stats.rewards.currentEpoch;
        
        if (currentEpoch <= lastSyncedEpoch) {
          results.push({
            operatorId: operator.operator_id,
            status: 'UP_TO_DATE',
            lastSyncedEpoch,
            currentEpoch,
          });
          continue;
        }

        const nodeRewards = await nodeService.getNodeRewards(onChainNodeId);
        const totalClaimableFloat = parseFloat(nodeRewards.pending);

        if (totalClaimableFloat > 0) {
          let ledgerResult = await client.query(
            'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
            [operator.operator_id]
          );

          if (ledgerResult.rows.length === 0) {
            await client.query(
              `INSERT INTO credits_ledger (operator_id, available_balance, pending_balance, total_earned, total_redeemed, total_slashed)
               VALUES ($1, '0', '0', '0', '0', '0')`,
              [operator.operator_id]
            );
            
            ledgerResult = await client.query(
              'SELECT * FROM credits_ledger WHERE operator_id = $1 LIMIT 1',
              [operator.operator_id]
            );
          }

          const ledger = ledgerResult.rows[0];
          const transactionId = `SYNC-${nanoid(12)}`;
          const currentAvailable = parseFloat(ledger.available_balance || '0');
          const currentTotalEarned = parseFloat(ledger.total_earned || '0');

          await client.query(
            `INSERT INTO credits_transactions (transaction_id, operator_id, type, amount, currency, source, status, reason, metadata)
             VALUES ($1, $2, 'ACCRUAL', $3, 'AXIOM', 'ONCHAIN_SYNC', 'COMPLETED', $4, $5)`,
            [
              transactionId,
              operator.operator_id,
              totalClaimableFloat.toString(),
              `On-chain rewards sync from epoch ${lastSyncedEpoch + 1} to ${currentEpoch}`,
              JSON.stringify({
                nodeId: onChainNodeId,
                epochRange: [lastSyncedEpoch + 1, currentEpoch],
              })
            ]
          );

          await client.query(
            `UPDATE credits_ledger 
             SET available_balance = $1, total_earned = $2, last_synced_at = NOW(), updated_at = NOW()
             WHERE operator_id = $3`,
            [(currentAvailable + totalClaimableFloat).toString(), (currentTotalEarned + totalClaimableFloat).toString(), operator.operator_id]
          );
        }

        if (syncResult.rows.length === 0) {
          await client.query(
            `INSERT INTO onchain_rewards_sync (node_id, operator_id, last_synced_epoch, total_claimed_onchain)
             VALUES ($1, $2, $3, $4)`,
            [onChainNodeId.toString(), operator.operator_id, currentEpoch, nodeRewards.pending]
          );
        } else {
          await client.query(
            `UPDATE onchain_rewards_sync 
             SET last_synced_epoch = $1, total_claimed_onchain = $2, last_synced_at = NOW()
             WHERE operator_id = $3`,
            [currentEpoch, nodeRewards.pending, operator.operator_id]
          );
        }

        results.push({
          operatorId: operator.operator_id,
          status: 'SYNCED',
          previousEpoch: lastSyncedEpoch,
          currentEpoch,
          rewardsAdded: totalClaimableFloat,
        });
      } catch (opError: any) {
        console.error(`Error syncing operator ${operator.operator_id}:`, opError);
        results.push({
          operatorId: operator.operator_id,
          status: 'ERROR',
          error: opError.message,
        });
      }
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_wallet, action, target_type, target_id, details)
       VALUES ($1, 'CREDITS_SYNC', 'system', $2, $3)`,
      [adminWallet.toLowerCase(), syncAll ? 'all_operators' : operatorId, JSON.stringify({
        syncAll,
        operatorCount: operatorsToSync.length,
        results: results.map(r => ({ operatorId: r.operatorId, status: r.status })),
      })]
    );

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
  } finally {
    client.release();
  }
}
