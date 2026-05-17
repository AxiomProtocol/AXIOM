/**
 * lib/treasury/vault/eventPoller.ts
 *
 * Polls AxiomTreasuryVault on-chain events every 60 seconds and writes
 * them to the `treasury_vault_events` PostgreSQL table.
 *
 * Tracked events:
 *   Deposit            → event_type = 'deposit'
 *   Withdrawal         → event_type = 'withdraw'
 *   StrategyAllocated  → event_type = 'allocate'
 *   StrategyHarvested  → event_type = 'harvest'
 *   Rebalanced         → event_type = 'rebalance'
 *   EmergencyWithdraw  → event_type = 'emergency_withdraw'
 *
 * Usage (in a long-running process):
 *   import { startVaultEventPoller } from 'lib/treasury/vault/eventPoller';
 *   startVaultEventPoller();
 */

import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { treasuryVaultEvents } from '../../../shared/treasuryVaultSchema';
import { eq } from 'drizzle-orm';

const RPC           = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const VAULT_ADDRESS = process.env.AXIOM_TREASURY_VAULT_ADDRESS ?? '';
const POLL_MS       = 60_000;
const BLOCK_LOOKBACK = 200;

const VAULT_ABI = [
  'event Deposit(address indexed asset, uint256 amount, address indexed depositor)',
  'event Withdrawal(address indexed asset, uint256 amount, address indexed recipient)',
  'event StrategyAllocated(address indexed strategy, address indexed asset, uint256 amount)',
  'event StrategyHarvested(address indexed strategy, uint256 yieldAmount)',
  'event Rebalanced(address indexed fromStrategy, address indexed toStrategy, uint256 amount)',
  'event EmergencyWithdraw(address indexed strategy, uint256 amount)',
];

let running = false;
let lastProcessedBlock = 0;

export function startVaultEventPoller() {
  if (!VAULT_ADDRESS) {
    console.warn('[eventPoller] AXIOM_TREASURY_VAULT_ADDRESS not set — poller disabled');
    return;
  }
  if (running) return;
  running = true;
  console.log('[eventPoller] Starting treasury vault event poller…');
  poll().catch(console.error);
}

export function stopVaultEventPoller() {
  running = false;
}

async function poll() {
  while (running) {
    try {
      await fetchAndStoreEvents();
    } catch (err) {
      console.error('[eventPoller] poll error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

async function fetchAndStoreEvents() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = lastProcessedBlock > 0
    ? lastProcessedBlock + 1
    : currentBlock - BLOCK_LOOKBACK;

  if (fromBlock > currentBlock) return;

  const vault  = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
  const filter = { address: VAULT_ADDRESS, fromBlock, toBlock: currentBlock };
  const logs   = await provider.getLogs(filter);
  const iface  = new ethers.Interface(VAULT_ABI);

  for (const log of logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;

      const txHash     = log.transactionHash;
      const blockNumber = log.blockNumber;

      const alreadyExists = await db
        .select({ id: treasuryVaultEvents.id })
        .from(treasuryVaultEvents)
        .where(eq(treasuryVaultEvents.txHash, txHash))
        .limit(1);
      if (alreadyExists.length > 0) continue;

      let eventType: string;
      let strategy:  string | null = null;
      let amountRaw: bigint = 0n;

      switch (parsed.name) {
        case 'Deposit':
          eventType = 'deposit';
          amountRaw = parsed.args[1] as bigint;
          break;
        case 'Withdrawal':
          eventType = 'withdraw';
          amountRaw = parsed.args[1] as bigint;
          break;
        case 'StrategyAllocated':
          eventType = 'allocate';
          strategy  = parsed.args[0] as string;
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'StrategyHarvested':
          eventType = 'harvest';
          strategy  = parsed.args[0] as string;
          amountRaw = parsed.args[1] as bigint;
          break;
        case 'Rebalanced':
          eventType = 'rebalance';
          strategy  = `${parsed.args[0] as string}→${parsed.args[1] as string}`;
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'EmergencyWithdraw':
          eventType = 'emergency_withdraw';
          strategy  = parsed.args[0] as string;
          amountRaw = parsed.args[1] as bigint;
          break;
        default:
          continue;
      }

      const amountUsd = Number(amountRaw) / 1e6;

      await db.insert(treasuryVaultEvents).values({
        eventType,
        strategy,
        amountUsd: amountUsd.toFixed(6),
        txHash,
        blockNumber,
      });
    } catch (err) {
      console.error('[eventPoller] log parse error:', err);
    }
  }

  lastProcessedBlock = currentBlock;
  console.log(`[eventPoller] Processed blocks ${fromBlock}–${currentBlock} (${logs.length} logs)`);
}
