import type { NextApiResponse } from 'next';
import { Pool } from '../../../../../lib/db';
import { ethers } from 'ethers';
import { withAdminAuth, AuthenticatedRequest } from '../../../../../lib/adminAuth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const DEPIN_SALES_ADDRESS = '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd';
const DEPIN_SUITE_ADDRESS = '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1';

const DEPIN_SALES_ABI = [
  "event NodePurchasedWithETH(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 ethPaid, uint256 purchaseId, uint256 timestamp)",
  "event NodePurchasedWithAXM(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 axmPaid, uint256 discountApplied, uint256 purchaseId, uint256 timestamp)"
];

const DEPIN_SUITE_ABI = [
  "event NodeRegistered(address indexed operator, uint256 indexed nodeId, uint8 nodeType)",
  "event NodeActivated(address indexed operator, uint256 indexed nodeId)",
  "event NodeDeactivated(address indexed operator, uint256 indexed nodeId)",
  "event RewardsDistributed(address indexed operator, uint256 indexed nodeId, uint256 amount)",
  "event Staked(address indexed staker, uint256 amount)",
  "event Unstaked(address indexed staker, uint256 amount)"
];

const NODE_TIERS = [
  { tierId: 1, name: 'Mobile Light', tier: 'Lite', priceETH: 0.02 },
  { tierId: 2, name: 'Desktop Standard', tier: 'Standard', priceETH: 0.05 },
  { tierId: 3, name: 'Desktop Advanced', tier: 'Standard', priceETH: 0.08 },
  { tierId: 4, name: 'Pro Infrastructure', tier: 'Pro', priceETH: 0.15 },
  { tierId: 5, name: 'Enterprise Premium', tier: 'Pro', priceETH: 0.25 },
];

async function syncBlockchainEvents(client: any, fromBlock: number, toBlock: number) {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const salesIface = new ethers.Interface(DEPIN_SALES_ABI);
  const suiteIface = new ethers.Interface(DEPIN_SUITE_ABI);
  
  let eventsProcessed = 0;
  let nodesCreated = 0;

  const ethEventSig = ethers.id("NodePurchasedWithETH(address,uint256,uint8,uint256,uint256,uint256)");
  const axmEventSig = ethers.id("NodePurchasedWithAXM(address,uint256,uint8,uint256,uint256,uint256,uint256)");
  const nodeRegisteredSig = ethers.id("NodeRegistered(address,uint256,uint8)");
  const nodeActivatedSig = ethers.id("NodeActivated(address,uint256)");

  const [ethLogs, axmLogs, registeredLogs, activatedLogs] = await Promise.all([
    provider.getLogs({
      address: DEPIN_SALES_ADDRESS,
      topics: [ethEventSig],
      fromBlock,
      toBlock
    }),
    provider.getLogs({
      address: DEPIN_SALES_ADDRESS,
      topics: [axmEventSig],
      fromBlock,
      toBlock
    }),
    provider.getLogs({
      address: DEPIN_SUITE_ADDRESS,
      topics: [nodeRegisteredSig],
      fromBlock,
      toBlock
    }),
    provider.getLogs({
      address: DEPIN_SUITE_ADDRESS,
      topics: [nodeActivatedSig],
      fromBlock,
      toBlock
    })
  ]);

  for (const log of ethLogs) {
    try {
      const parsed = salesIface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;
      
      const buyer = parsed.args[0];
      const tierId = Number(parsed.args[1]);
      const category = Number(parsed.args[2]);
      const ethPaid = ethers.formatEther(parsed.args[3]);
      const purchaseId = Number(parsed.args[4]);
      const timestamp = Number(parsed.args[5]);
      
      const nodeInfo = NODE_TIERS.find(t => t.tierId === tierId) || NODE_TIERS[0];

      const existsResult = await client.query(
        'SELECT id FROM depin_events WHERE transaction_hash = $1 AND log_index = $2',
        [log.transactionHash, log.index]
      );
      
      if (existsResult.rows.length === 0) {
        await client.query(`
          INSERT INTO depin_events (
            event_type, transaction_hash, block_number, log_index, contract_address,
            node_id, node_type, buyer_address, tier, price_eth, 
            block_timestamp, processed_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
        `, [
          'node_minted',
          log.transactionHash,
          log.blockNumber,
          log.index,
          DEPIN_SALES_ADDRESS,
          purchaseId,
          category,
          buyer.toLowerCase(),
          tierId,
          ethPaid,
          new Date(timestamp * 1000),
          JSON.stringify({ tierName: nodeInfo.name, paymentMethod: 'ETH' })
        ]);
        
        eventsProcessed++;

        const nodeExists = await client.query(
          'SELECT id FROM depin_nodes WHERE node_id = $1',
          [purchaseId]
        );
        
        if (nodeExists.rows.length === 0) {
          await client.query(`
            INSERT INTO depin_nodes (
              node_id, node_type, node_tier, operator_address, status,
              purchase_price_eth, registered_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [purchaseId, category, tierId, buyer.toLowerCase(), 'active', ethPaid, new Date(timestamp * 1000)]);
          nodesCreated++;
        }
      }
    } catch (e) {
      console.error('Error processing ETH purchase log:', e);
    }
  }

  for (const log of axmLogs) {
    try {
      const parsed = salesIface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;
      
      const buyer = parsed.args[0];
      const tierId = Number(parsed.args[1]);
      const category = Number(parsed.args[2]);
      const axmPaid = ethers.formatEther(parsed.args[3]);
      const purchaseId = Number(parsed.args[5]);
      const timestamp = Number(parsed.args[6]);
      
      const nodeInfo = NODE_TIERS.find(t => t.tierId === tierId) || NODE_TIERS[0];

      const existsResult = await client.query(
        'SELECT id FROM depin_events WHERE transaction_hash = $1 AND log_index = $2',
        [log.transactionHash, log.index]
      );
      
      if (existsResult.rows.length === 0) {
        await client.query(`
          INSERT INTO depin_events (
            event_type, transaction_hash, block_number, log_index, contract_address,
            node_id, node_type, buyer_address, tier, price_axm,
            block_timestamp, processed_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
        `, [
          'node_minted',
          log.transactionHash,
          log.blockNumber,
          log.index,
          DEPIN_SALES_ADDRESS,
          purchaseId,
          category,
          buyer.toLowerCase(),
          tierId,
          axmPaid,
          new Date(timestamp * 1000),
          JSON.stringify({ tierName: nodeInfo.name, paymentMethod: 'AXM' })
        ]);
        
        eventsProcessed++;

        const nodeExists = await client.query(
          'SELECT id FROM depin_nodes WHERE node_id = $1',
          [purchaseId]
        );
        
        if (nodeExists.rows.length === 0) {
          await client.query(`
            INSERT INTO depin_nodes (
              node_id, node_type, node_tier, operator_address, status,
              staked_amount_axm, registered_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [purchaseId, category, tierId, buyer.toLowerCase(), 'active', axmPaid, new Date(timestamp * 1000)]);
          nodesCreated++;
        }
      }
    } catch (e) {
      console.error('Error processing AXM purchase log:', e);
    }
  }

  for (const log of registeredLogs) {
    try {
      const parsed = suiteIface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;

      const operator = parsed.args[0];
      const nodeId = Number(parsed.args[1]);
      const nodeType = Number(parsed.args[2]);

      const existsResult = await client.query(
        'SELECT id FROM depin_events WHERE transaction_hash = $1 AND log_index = $2',
        [log.transactionHash, log.index]
      );

      if (existsResult.rows.length === 0) {
        await client.query(`
          INSERT INTO depin_events (
            event_type, transaction_hash, block_number, log_index, contract_address,
            node_id, node_type, operator_address, processed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          'node_registered',
          log.transactionHash,
          log.blockNumber,
          log.index,
          DEPIN_SUITE_ADDRESS,
          nodeId,
          nodeType,
          operator.toLowerCase()
        ]);
        eventsProcessed++;
      }
    } catch (e) {
      console.error('Error processing node registered log:', e);
    }
  }

  for (const log of activatedLogs) {
    try {
      const parsed = suiteIface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;

      const operator = parsed.args[0];
      const nodeId = Number(parsed.args[1]);

      const existsResult = await client.query(
        'SELECT id FROM depin_events WHERE transaction_hash = $1 AND log_index = $2',
        [log.transactionHash, log.index]
      );

      if (existsResult.rows.length === 0) {
        await client.query(`
          INSERT INTO depin_events (
            event_type, transaction_hash, block_number, log_index, contract_address,
            node_id, operator_address, processed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          'node_activated',
          log.transactionHash,
          log.blockNumber,
          log.index,
          DEPIN_SUITE_ADDRESS,
          nodeId,
          operator.toLowerCase()
        ]);
        eventsProcessed++;

        await client.query(
          "UPDATE depin_nodes SET status = 'active', activated_at = NOW(), updated_at = NOW() WHERE node_id = $1",
          [nodeId]
        );
      }
    } catch (e) {
      console.error('Error processing node activated log:', e);
    }
  }

  return { eventsProcessed, nodesCreated };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = await pool.connect();
  
  try {
    const syncCheck = await client.query('SELECT * FROM depin_sync_state LIMIT 1');
    
    if (syncCheck.rows.length > 0 && syncCheck.rows[0].is_listening) {
      const lastUpdate = new Date(syncCheck.rows[0].updated_at);
      const now = new Date();
      const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
      
      if (minutesSinceUpdate < 5) {
        return res.status(409).json({ 
          message: 'Sync already in progress', 
          lastUpdate: syncCheck.rows[0].updated_at,
          lastBlock: syncCheck.rows[0].last_processed_block
        });
      }
    }
    
    if (syncCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO depin_sync_state (contract_address, last_processed_block, is_listening, error_count, updated_at)
        VALUES ($1, 0, true, 0, NOW())
      `, [DEPIN_SALES_ADDRESS]);
    } else {
      await client.query(`
        UPDATE depin_sync_state 
        SET is_listening = true, updated_at = NOW()
        WHERE contract_address = $1
      `, [syncCheck.rows[0].contract_address]);
    }

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const currentBlock = await provider.getBlockNumber();
    
    const syncState = await client.query('SELECT * FROM depin_sync_state LIMIT 1');
    const lastBlock = syncState.rows[0]?.last_processed_block || currentBlock - 100000;
    const fromBlock = Math.max(lastBlock + 1, currentBlock - 500000);
    
    const batchSize = 50000;
    let totalEvents = 0;
    let totalNodes = 0;
    
    for (let start = fromBlock; start <= currentBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, currentBlock);
      
      try {
        const { eventsProcessed, nodesCreated } = await syncBlockchainEvents(client, start, end);
        totalEvents += eventsProcessed;
        totalNodes += nodesCreated;
        
        await client.query(`
          UPDATE depin_sync_state 
          SET last_processed_block = $1, updated_at = NOW()
          WHERE contract_address = $2
        `, [end, DEPIN_SALES_ADDRESS]);
      } catch (err) {
        console.error(`Error syncing blocks ${start}-${end}:`, err);
        await client.query(`
          UPDATE depin_sync_state 
          SET error_count = error_count + 1, last_error = $1, updated_at = NOW()
          WHERE contract_address = $2
        `, [String(err), DEPIN_SALES_ADDRESS]);
      }
    }

    await client.query(`
      UPDATE depin_sync_state 
      SET last_processed_block = $1, is_listening = false, updated_at = NOW()
      WHERE contract_address = $2
    `, [currentBlock, DEPIN_SALES_ADDRESS]);

    res.json({ 
      success: true, 
      message: 'Blockchain sync completed successfully',
      stats: {
        fromBlock,
        toBlock: currentBlock,
        eventsProcessed: totalEvents,
        nodesCreated: totalNodes
      }
    });
  } catch (error: any) {
    console.error('Error syncing blockchain:', error);
    
    try {
      await client.query(`
        UPDATE depin_sync_state 
        SET is_listening = false, error_count = error_count + 1, last_error = $1, updated_at = NOW()
      `, [error.message]);
    } catch (e) {}
    
    res.status(500).json({ message: 'Failed to sync blockchain events', error: error.message });
  } finally {
    client.release();
  }
}

export default withAdminAuth(handler);
