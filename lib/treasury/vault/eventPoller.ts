/**
 * lib/treasury/vault/eventPoller.ts
 *
 * Polls AxiomTreasuryVault on-chain events every 60 seconds and writes
 * them to the `treasury_vault_events` PostgreSQL table.
 *
 * Deduplicated by (tx_hash, log_index) — a unique composite constraint in the
 * schema guarantees that multiple events emitted in a single transaction are
 * all recorded correctly and that replaying the same log never creates
 * duplicate rows.
 *
 * Tracked events (ERC-4626 + custom):
 *   Deposit(caller,owner,assets,shares) [ERC-4626] → event_type = 'deposit'
 *   Withdraw(caller,receiver,owner,assets,shares) [ERC-4626] → event_type = 'withdraw'
 *   TokenDeposited(asset,amount,depositor) → event_type = 'deposit'  (secondary assets)
 *   TokenWithdrawn(asset,amount,recipient) → event_type = 'withdraw' (secondary assets)
 *   StrategyAllocated  → event_type = 'allocate'
 *   StrategyRecalled   → event_type = 'recall'
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
import { and, eq } from 'drizzle-orm';

const RPC            = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const VAULT_ADDRESS  = process.env.AXIOM_TREASURY_VAULT_ADDRESS ?? '';
const POLL_MS        = 60_000;
const BLOCK_LOOKBACK = 200;
const USDC_ADDRESS   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ADDRESS  = process.env.AXUSD_ADDRESS ?? '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const THBILL_ADDRESS = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a';
const WETH_ADDRESS   = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const CHAINLINK_ETH_USD_FEED = '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612';
const MAX_CHAINLINK_ETH_USD_STALENESS_SECONDS = 3 * 60 * 60;

const VAULT_ABI = [
  // ERC-4626 standard primary-asset events (USDC)
  'event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
  // Secondary-asset events (AXUSD and future non-primary tokens)
  'event TokenDeposited(address indexed asset, uint256 amount, address indexed depositor)',
  'event TokenWithdrawn(address indexed asset, uint256 amount, address indexed recipient)',
  // Strategy lifecycle events
  'event StrategyAllocated(address indexed strategy, address indexed asset, uint256 amount)',
  'event StrategyRecalled(address indexed strategy, address indexed asset, uint256 amount)',
  'event StrategyHarvested(address indexed strategy, address indexed asset, uint256 yieldAmount)',
  'event Rebalanced(address indexed fromStrategy, address indexed toStrategy, uint256 amount)',
  'event EmergencyWithdraw(address indexed strategy, uint256 amount)',
];

const CHAINLINK_FEED_ABI = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

let running = false;
let lastProcessedBlock = 0;

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

async function fetchEthUsdPrice(provider: ethers.Provider): Promise<number | null> {
  try {
    const feed = new ethers.Contract(CHAINLINK_ETH_USD_FEED, CHAINLINK_FEED_ABI, provider);
    const [decimals, round] = await Promise.all([
      feed.decimals() as Promise<number | bigint>,
      feed.latestRoundData() as Promise<{ answer: bigint; updatedAt: bigint }>,
    ]);

    if (round.answer <= 0n || round.updatedAt <= 0n) return null;
    const ageSeconds = (Date.now() - Number(round.updatedAt) * 1000) / 1000;
    if (ageSeconds > MAX_CHAINLINK_ETH_USD_STALENESS_SECONDS) return null;

    return Number(round.answer) / Math.pow(10, Number(decimals));
  } catch {
    return null;
  }
}

export async function eventAmountToUsd(
  provider: ethers.Provider,
  amountRaw: bigint,
  assetAddress: string | null,
): Promise<number> {
  if (!assetAddress) return 0;
  if (sameAddress(assetAddress, USDC_ADDRESS)) return Number(ethers.formatUnits(amountRaw, 6));
  if (sameAddress(assetAddress, AXUSD_ADDRESS)) return Number(ethers.formatUnits(amountRaw, 18));
  if (sameAddress(assetAddress, THBILL_ADDRESS)) return Number(ethers.formatUnits(amountRaw, 6));
  if (sameAddress(assetAddress, WETH_ADDRESS)) {
    const ethUsd = await fetchEthUsdPrice(provider);
    return ethUsd === null ? 0 : Number(ethers.formatUnits(amountRaw, 18)) * ethUsd;
  }

  return 0;
}

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

  const filter = { address: VAULT_ADDRESS, fromBlock, toBlock: currentBlock };
  const logs   = await provider.getLogs(filter);
  const iface  = new ethers.Interface(VAULT_ABI);

  for (const log of logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (!parsed) continue;

      const txHash   = log.transactionHash;
      const logIndex = log.index;
      const blockNumber = log.blockNumber;

      // Deduplicate by (txHash, logIndex) — catches multiple events in one tx
      const alreadyExists = await db
        .select({ id: treasuryVaultEvents.id })
        .from(treasuryVaultEvents)
        .where(
          and(
            eq(treasuryVaultEvents.txHash, txHash),
            eq(treasuryVaultEvents.logIndex, logIndex)
          )
        )
        .limit(1);
      if (alreadyExists.length > 0) continue;

      let eventType: string;
      let strategy:  string | null = null;
      let amountRaw: bigint = 0n;
      let assetAddress: string | null = USDC_ADDRESS;

      switch (parsed.name) {
        case 'Deposit':
          // ERC-4626: Deposit(caller, owner, assets, shares) — assets at index 2
          eventType = 'deposit';
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'Withdraw':
          // ERC-4626: Withdraw(caller, receiver, owner, assets, shares) — assets at index 3
          eventType = 'withdraw';
          amountRaw = parsed.args[3] as bigint;
          break;
        case 'TokenDeposited':
          // Secondary asset: TokenDeposited(asset, amount, depositor) — amount at index 1
          eventType = 'deposit';
          assetAddress = parsed.args[0] as string;
          amountRaw = parsed.args[1] as bigint;
          break;
        case 'TokenWithdrawn':
          // Secondary asset: TokenWithdrawn(asset, amount, recipient) — amount at index 1
          eventType = 'withdraw';
          assetAddress = parsed.args[0] as string;
          amountRaw = parsed.args[1] as bigint;
          break;
        case 'StrategyAllocated':
          eventType = 'allocate';
          strategy  = parsed.args[0] as string;
          assetAddress = parsed.args[1] as string;
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'StrategyRecalled':
          eventType = 'recall';
          strategy  = parsed.args[0] as string;
          assetAddress = parsed.args[1] as string;
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'StrategyHarvested':
          eventType = 'harvest';
          strategy  = parsed.args[0] as string;
          assetAddress = parsed.args[1] as string;
          amountRaw = parsed.args[2] as bigint;  // args: [strategy, asset, yieldAmount]
          break;
        case 'Rebalanced':
          eventType = 'rebalance';
          strategy  = `${parsed.args[0] as string}→${parsed.args[1] as string}`;
          assetAddress = null;
          amountRaw = parsed.args[2] as bigint;
          break;
        case 'EmergencyWithdraw':
          eventType = 'emergency_withdraw';
          strategy  = parsed.args[0] as string;
          assetAddress = null;
          amountRaw = parsed.args[1] as bigint;
          break;
        default:
          continue;
      }

      const amountUsd = await eventAmountToUsd(provider, amountRaw, assetAddress);

      await db.insert(treasuryVaultEvents).values({
        eventType,
        strategy,
        amountUsd: amountUsd.toFixed(6),
        txHash,
        logIndex,
        blockNumber,
      });
    } catch (err) {
      console.error('[eventPoller] log parse error:', err);
    }
  }

  lastProcessedBlock = currentBlock;
  console.log(`[eventPoller] Processed blocks ${fromBlock}–${currentBlock} (${logs.length} logs)`);
}
