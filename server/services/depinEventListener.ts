import { ethers } from 'ethers';
import { db } from '../db';
import { depinEvents, depinNodes, depinRevenueDistributions, depinSyncState } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { DEFI_UTILITY_CONTRACTS, NETWORK_CONFIG } from '../../shared/contracts';

const DEPIN_CONTRACT_ADDRESS = DEFI_UTILITY_CONTRACTS.DEPIN_NODES;
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const ALCHEMY_WSS = process.env.ALCHEMY_ARBITRUM_WSS || 'wss://arb-mainnet.g.alchemy.com/v2/demo';

const DEPIN_ABI = [
  "event NodeMinted(uint256 indexed tokenId, address indexed owner, uint256 nodeType, uint256 tier, uint256 price)",
  "event NodeRegistered(uint256 indexed nodeId, uint8 indexed nodeType, address indexed operator, uint256 stakedAmount)",
  "event NodeStatusChanged(uint256 indexed nodeId, uint8 oldStatus, uint8 newStatus)",
  "event NodeSlashed(uint256 indexed nodeId, address indexed operator, uint256 amount, string reason)",
  "event NodeLeaseCreated(uint256 indexed leaseId, uint256 indexed nodeId, address indexed lessee, uint256 monthlyFee, uint256 duration)",
  "event LeaseFeePayment(uint256 indexed leaseId, address indexed payer, uint256 amount, uint256 timestamp)",
  "event RevenueDistributed(uint256 indexed leaseId, uint256 indexed nodeId, uint256 totalRevenue, uint256 lesseeShare, uint256 operatorShare)",
  "event PerformanceRecorded(uint256 indexed nodeId, uint256 uptimeSeconds, uint256 downtimeSeconds, bool healthCheckPassed)",
  "event WithdrawalProcessed(address indexed recipient, uint256 amount)",
  "event NodeActivated(uint256 indexed nodeId)"
];

interface EventListenerState {
  isRunning: boolean;
  provider: ethers.Provider | null;
  contract: ethers.Contract | null;
  lastProcessedBlock: number;
  errorCount: number;
}

const state: EventListenerState = {
  isRunning: false,
  provider: null,
  contract: null,
  lastProcessedBlock: 0,
  errorCount: 0
};

export async function initializeSyncState(): Promise<void> {
  try {
    const existing = await db.select().from(depinSyncState)
      .where(eq(depinSyncState.contractAddress, DEPIN_CONTRACT_ADDRESS.toLowerCase()));
    
    if (existing.length === 0) {
      await db.insert(depinSyncState).values({
        contractAddress: DEPIN_CONTRACT_ADDRESS.toLowerCase(),
        lastProcessedBlock: 0,
        isListening: false,
        errorCount: 0
      });
      console.log('[DePIN Listener] Initialized sync state for contract:', DEPIN_CONTRACT_ADDRESS);
    } else {
      state.lastProcessedBlock = existing[0].lastProcessedBlock;
      console.log('[DePIN Listener] Loaded sync state, last block:', state.lastProcessedBlock);
    }
  } catch (error) {
    console.error('[DePIN Listener] Error initializing sync state:', error);
  }
}

async function updateSyncState(blockNumber: number, isListening: boolean = true): Promise<void> {
  try {
    await db.update(depinSyncState)
      .set({
        lastProcessedBlock: blockNumber,
        lastProcessedTimestamp: new Date(),
        isListening,
        updatedAt: new Date()
      })
      .where(eq(depinSyncState.contractAddress, DEPIN_CONTRACT_ADDRESS.toLowerCase()));
    
    state.lastProcessedBlock = blockNumber;
  } catch (error) {
    console.error('[DePIN Listener] Error updating sync state:', error);
  }
}

async function recordError(errorMessage: string): Promise<void> {
  try {
    state.errorCount++;
    await db.update(depinSyncState)
      .set({
        errorCount: state.errorCount,
        lastError: errorMessage,
        updatedAt: new Date()
      })
      .where(eq(depinSyncState.contractAddress, DEPIN_CONTRACT_ADDRESS.toLowerCase()));
  } catch (error) {
    console.error('[DePIN Listener] Error recording error:', error);
  }
}

async function processNodeMintedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { tokenId, owner, nodeType, tier, price } = parsedLog.args;
  
  console.log(`[DePIN] NodeMinted: ID=${tokenId}, Owner=${owner}, Type=${nodeType}, Tier=${tier}`);
  
  const priceEth = ethers.formatEther(price);
  
  await db.insert(depinEvents).values({
    eventType: 'node_minted',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(tokenId),
    nodeType: Number(nodeType),
    buyerAddress: owner.toLowerCase(),
    tier: Number(tier),
    priceEth: priceEth,
    rawEventData: {
      tokenId: tokenId.toString(),
      owner,
      nodeType: nodeType.toString(),
      tier: tier.toString(),
      price: price.toString()
    }
  });

  await db.insert(depinNodes).values({
    nodeId: Number(tokenId),
    nodeType: Number(nodeType),
    nodeTier: Number(tier),
    operatorAddress: owner.toLowerCase(),
    status: 'active',
    purchasePriceEth: priceEth,
    registeredAt: new Date(),
    activatedAt: new Date()
  }).onConflictDoUpdate({
    target: depinNodes.nodeId,
    set: {
      status: 'active',
      updatedAt: new Date()
    }
  });
}

async function processNodeRegisteredEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { nodeId, nodeType, operator, stakedAmount } = parsedLog.args;
  
  console.log(`[DePIN] NodeRegistered: ID=${nodeId}, Operator=${operator}, Type=${nodeType}`);
  
  const stakedAxm = ethers.formatEther(stakedAmount);
  
  await db.insert(depinEvents).values({
    eventType: 'node_registered',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    nodeType: Number(nodeType),
    operatorAddress: operator.toLowerCase(),
    priceAxm: stakedAxm,
    rawEventData: {
      nodeId: nodeId.toString(),
      nodeType: nodeType.toString(),
      operator,
      stakedAmount: stakedAmount.toString()
    }
  });

  await db.insert(depinNodes).values({
    nodeId: Number(nodeId),
    nodeType: Number(nodeType),
    operatorAddress: operator.toLowerCase(),
    status: 'pending',
    stakedAmountAxm: stakedAxm,
    registeredAt: new Date()
  }).onConflictDoUpdate({
    target: depinNodes.nodeId,
    set: {
      stakedAmountAxm: stakedAxm,
      updatedAt: new Date()
    }
  });
}

async function processRevenueDistributedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { leaseId, nodeId, totalRevenue, lesseeShare, operatorShare } = parsedLog.args;
  
  console.log(`[DePIN] RevenueDistributed: Lease=${leaseId}, Node=${nodeId}, Total=${ethers.formatEther(totalRevenue)} AXM`);
  
  const treasuryShare = totalRevenue - lesseeShare - operatorShare;
  
  await db.insert(depinEvents).values({
    eventType: 'revenue_distributed',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    priceAxm: ethers.formatEther(totalRevenue),
    rawEventData: {
      leaseId: leaseId.toString(),
      nodeId: nodeId.toString(),
      totalRevenue: totalRevenue.toString(),
      lesseeShare: lesseeShare.toString(),
      operatorShare: operatorShare.toString(),
      treasuryShare: treasuryShare.toString()
    }
  });

  await db.insert(depinRevenueDistributions).values({
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    leaseId: Number(leaseId),
    nodeId: Number(nodeId),
    totalRevenue: ethers.formatEther(totalRevenue),
    lesseeShare: ethers.formatEther(lesseeShare),
    operatorShare: ethers.formatEther(operatorShare),
    treasuryShare: ethers.formatEther(treasuryShare),
    distributedAt: new Date()
  });

  await db.update(depinNodes)
    .set({
      totalRevenueGenerated: ethers.formatEther(totalRevenue),
      updatedAt: new Date()
    })
    .where(eq(depinNodes.nodeId, Number(nodeId)));
}

async function processNodeStatusChangedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { nodeId, oldStatus, newStatus } = parsedLog.args;
  
  const statusMap: { [key: number]: string } = {
    0: 'pending',
    1: 'active',
    2: 'suspended',
    3: 'retired'
  };
  
  console.log(`[DePIN] NodeStatusChanged: ID=${nodeId}, ${statusMap[oldStatus]} -> ${statusMap[newStatus]}`);
  
  await db.insert(depinEvents).values({
    eventType: 'node_status_changed',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    rawEventData: {
      nodeId: nodeId.toString(),
      oldStatus: oldStatus.toString(),
      newStatus: newStatus.toString()
    }
  });

  await db.update(depinNodes)
    .set({
      status: statusMap[Number(newStatus)] || 'unknown',
      activatedAt: Number(newStatus) === 1 ? new Date() : undefined,
      updatedAt: new Date()
    })
    .where(eq(depinNodes.nodeId, Number(nodeId)));
}

async function processNodeSlashedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { nodeId, operator, amount, reason } = parsedLog.args;
  
  console.log(`[DePIN] NodeSlashed: ID=${nodeId}, Amount=${ethers.formatEther(amount)} AXM, Reason=${reason}`);
  
  await db.insert(depinEvents).values({
    eventType: 'node_slashed',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    operatorAddress: operator.toLowerCase(),
    priceAxm: ethers.formatEther(amount),
    metadata: { reason },
    rawEventData: {
      nodeId: nodeId.toString(),
      operator,
      amount: amount.toString(),
      reason
    }
  });
}

async function processLeaseCreatedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { leaseId, nodeId, lessee, monthlyFee, duration } = parsedLog.args;
  
  console.log(`[DePIN] LeaseCreated: Lease=${leaseId}, Node=${nodeId}, Lessee=${lessee}`);
  
  await db.insert(depinEvents).values({
    eventType: 'lease_created',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    buyerAddress: lessee.toLowerCase(),
    priceAxm: ethers.formatEther(monthlyFee),
    metadata: { leaseId: leaseId.toString(), duration: duration.toString() },
    rawEventData: {
      leaseId: leaseId.toString(),
      nodeId: nodeId.toString(),
      lessee,
      monthlyFee: monthlyFee.toString(),
      duration: duration.toString()
    }
  });
}

async function processPerformanceRecordedEvent(log: ethers.Log, parsedLog: ethers.LogDescription): Promise<void> {
  const { nodeId, uptimeSeconds, downtimeSeconds, healthCheckPassed } = parsedLog.args;
  
  console.log(`[DePIN] PerformanceRecorded: ID=${nodeId}, Uptime=${uptimeSeconds}s, Health=${healthCheckPassed}`);
  
  await db.insert(depinEvents).values({
    eventType: 'performance_recorded',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.index,
    contractAddress: log.address.toLowerCase(),
    nodeId: Number(nodeId),
    metadata: {
      uptimeSeconds: uptimeSeconds.toString(),
      downtimeSeconds: downtimeSeconds.toString(),
      healthCheckPassed
    },
    rawEventData: {
      nodeId: nodeId.toString(),
      uptimeSeconds: uptimeSeconds.toString(),
      downtimeSeconds: downtimeSeconds.toString(),
      healthCheckPassed
    }
  });

  await db.update(depinNodes)
    .set({
      totalUptime: Number(uptimeSeconds),
      totalDowntime: Number(downtimeSeconds),
      lastHealthCheck: new Date(),
      updatedAt: new Date()
    })
    .where(eq(depinNodes.nodeId, Number(nodeId)));
}

async function processLog(log: ethers.Log, iface: ethers.Interface): Promise<void> {
  try {
    const parsedLog = iface.parseLog({
      topics: log.topics as string[],
      data: log.data
    });
    
    if (!parsedLog) return;

    switch (parsedLog.name) {
      case 'NodeMinted':
        await processNodeMintedEvent(log, parsedLog);
        break;
      case 'NodeRegistered':
        await processNodeRegisteredEvent(log, parsedLog);
        break;
      case 'RevenueDistributed':
        await processRevenueDistributedEvent(log, parsedLog);
        break;
      case 'NodeStatusChanged':
        await processNodeStatusChangedEvent(log, parsedLog);
        break;
      case 'NodeSlashed':
        await processNodeSlashedEvent(log, parsedLog);
        break;
      case 'NodeLeaseCreated':
        await processLeaseCreatedEvent(log, parsedLog);
        break;
      case 'PerformanceRecorded':
        await processPerformanceRecordedEvent(log, parsedLog);
        break;
      default:
        console.log(`[DePIN] Unhandled event: ${parsedLog.name}`);
    }

    await updateSyncState(log.blockNumber);
  } catch (error) {
    console.error('[DePIN Listener] Error processing log:', error);
    await recordError(String(error));
  }
}

export async function startEventListener(): Promise<void> {
  if (state.isRunning) {
    console.log('[DePIN Listener] Already running');
    return;
  }

  try {
    await initializeSyncState();

    state.provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const iface = new ethers.Interface(DEPIN_ABI);
    
    state.contract = new ethers.Contract(DEPIN_CONTRACT_ADDRESS, DEPIN_ABI, state.provider);
    state.isRunning = true;

    console.log('[DePIN Listener] Starting event listener for:', DEPIN_CONTRACT_ADDRESS);
    console.log('[DePIN Listener] Network:', NETWORK_CONFIG.chainName);

    state.contract.on('*', async (event) => {
      try {
        const log = event.log;
        if (log) {
          await processLog(log, iface);
        }
      } catch (error) {
        console.error('[DePIN Listener] Event processing error:', error);
        await recordError(String(error));
      }
    });

    await updateSyncState(state.lastProcessedBlock, true);
    console.log('[DePIN Listener] Event listener started successfully');

  } catch (error) {
    console.error('[DePIN Listener] Failed to start:', error);
    state.isRunning = false;
    await recordError(String(error));
    throw error;
  }
}

export async function stopEventListener(): Promise<void> {
  if (!state.isRunning || !state.contract) {
    console.log('[DePIN Listener] Not running');
    return;
  }

  try {
    state.contract.removeAllListeners();
    state.isRunning = false;
    await updateSyncState(state.lastProcessedBlock, false);
    console.log('[DePIN Listener] Event listener stopped');
  } catch (error) {
    console.error('[DePIN Listener] Error stopping listener:', error);
  }
}

export async function backfillEvents(fromBlock: number, toBlock?: number): Promise<{ processed: number; errors: number }> {
  console.log(`[DePIN Backfill] Starting from block ${fromBlock}`);
  
  let processed = 0;
  let errors = 0;
  
  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const iface = new ethers.Interface(DEPIN_ABI);
    
    const currentBlock = toBlock || await provider.getBlockNumber();
    const batchSize = 2000;
    
    console.log(`[DePIN Backfill] Processing blocks ${fromBlock} to ${currentBlock}`);
    
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += batchSize) {
      const endBlock = Math.min(startBlock + batchSize - 1, currentBlock);
      
      try {
        const logs = await provider.getLogs({
          address: DEPIN_CONTRACT_ADDRESS,
          fromBlock: startBlock,
          toBlock: endBlock
        });
        
        console.log(`[DePIN Backfill] Block ${startBlock}-${endBlock}: ${logs.length} events`);
        
        for (const log of logs) {
          try {
            await processLog(log, iface);
            processed++;
          } catch (error) {
            console.error(`[DePIN Backfill] Error processing log:`, error);
            errors++;
          }
        }
        
        await updateSyncState(endBlock);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[DePIN Backfill] Error fetching blocks ${startBlock}-${endBlock}:`, error);
        errors++;
      }
    }
    
    console.log(`[DePIN Backfill] Complete. Processed: ${processed}, Errors: ${errors}`);
    
  } catch (error) {
    console.error('[DePIN Backfill] Fatal error:', error);
    throw error;
  }
  
  return { processed, errors };
}

export function getListenerStatus(): { isRunning: boolean; lastProcessedBlock: number; errorCount: number } {
  return {
    isRunning: state.isRunning,
    lastProcessedBlock: state.lastProcessedBlock,
    errorCount: state.errorCount
  };
}

export async function getEventStats(): Promise<{
  totalEvents: number;
  nodesMinted: number;
  nodesRegistered: number;
  revenueDistributed: number;
  totalNodes: number;
  activeNodes: number;
}> {
  try {
    const events = await db.select().from(depinEvents);
    const nodes = await db.select().from(depinNodes);
    const revenues = await db.select().from(depinRevenueDistributions);
    
    return {
      totalEvents: events.length,
      nodesMinted: events.filter(e => e.eventType === 'node_minted').length,
      nodesRegistered: events.filter(e => e.eventType === 'node_registered').length,
      revenueDistributed: revenues.length,
      totalNodes: nodes.length,
      activeNodes: nodes.filter(n => n.status === 'active').length
    };
  } catch (error) {
    console.error('[DePIN Stats] Error getting stats:', error);
    return {
      totalEvents: 0,
      nodesMinted: 0,
      nodesRegistered: 0,
      revenueDistributed: 0,
      totalNodes: 0,
      activeNodes: 0
    };
  }
}
