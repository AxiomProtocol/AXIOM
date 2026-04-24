import { ethers } from 'ethers';
import { pool } from '../../../server/db';
import { getArbitrumRpcUrl } from '../../config';
import { NODE_ECONOMY_CONTRACTS, NODE_REGISTRY_ABI, ON_CHAIN_NODE_CLASSES } from './abis';

interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  lastBlock: number;
  errors: string[];
}

export async function syncNodeRegistryEvents(fromBlock: number = 0): Promise<SyncResult> {
  const errors: string[] = [];
  let eventsProcessed = 0;
  let lastBlock = fromBlock;

  try {
    const rpcUrl = getArbitrumRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    lastBlock = currentBlock;

    const filter = nodeRegistry.filters.NodeRegistered();
    const events = await nodeRegistry.queryFilter(filter, fromBlock, currentBlock);

    const client = await pool.connect();
    try {
      for (const event of events) {
        const args = (event as ethers.EventLog).args;
        if (!args) continue;

        const nodeId = Number(args.nodeId);
        const operator = args.operator.toLowerCase();
        const nodeClass = Number(args.nodeClass);
        const nodeClassName = ON_CHAIN_NODE_CLASSES[nodeClass] || 'UNKNOWN';

        await client.query(
          `INSERT INTO node_chain_sync (
            node_id, operator_address, node_class, block_number, tx_hash, synced_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (node_id) DO UPDATE SET
            operator_address = EXCLUDED.operator_address,
            node_class = EXCLUDED.node_class,
            block_number = EXCLUDED.block_number,
            synced_at = NOW()`,
          [nodeId, operator, nodeClassName, event.blockNumber, event.transactionHash]
        );
        eventsProcessed++;
      }
    } finally {
      client.release();
    }

    return { success: true, eventsProcessed, lastBlock, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { success: false, eventsProcessed, lastBlock, errors };
  }
}

export async function linkOnChainToOffChain(operatorWallet: string): Promise<{
  linked: boolean;
  onChainNodeId: number | null;
  message: string;
}> {
  try {
    const rpcUrl = getArbitrumRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, provider);

    const nodeId = await nodeRegistry.operatorToNode(operatorWallet);
    if (nodeId === 0n) {
      return { linked: false, onChainNodeId: null, message: 'No on-chain node found for this wallet' };
    }

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE node_operators SET on_chain_node_id = $1 WHERE wallet_address = $2`,
        [Number(nodeId), operatorWallet.toLowerCase()]
      );
      return { linked: true, onChainNodeId: Number(nodeId), message: 'Successfully linked on-chain node' };
    } finally {
      client.release();
    }
  } catch (error) {
    return { 
      linked: false, 
      onChainNodeId: null, 
      message: error instanceof Error ? error.message : 'Failed to link' 
    };
  }
}

export async function getOnChainNodeStatus(operatorWallet: string): Promise<{
  registered: boolean;
  nodeId: number | null;
  status: string | null;
  stakeAmount: string | null;
}> {
  try {
    const rpcUrl = getArbitrumRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, provider);

    const nodeId = await nodeRegistry.operatorToNode(operatorWallet);
    if (nodeId === 0n) {
      return { registered: false, nodeId: null, status: null, stakeAmount: null };
    }

    const node = await nodeRegistry.getNode(nodeId);
    const statusNames = ['REGISTERED', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'];
    
    return {
      registered: true,
      nodeId: Number(nodeId),
      status: statusNames[Number(node.status)] || 'UNKNOWN',
      stakeAmount: ethers.formatEther(node.stakeAmount)
    };
  } catch {
    return { registered: false, nodeId: null, status: null, stakeAmount: null };
  }
}
