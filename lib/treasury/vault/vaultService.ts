/**
 * lib/treasury/vault/vaultService.ts
 *
 * Read-only service that aggregates live on-chain vault state from
 * AxiomTreasuryVault + StrategyManager and combines it with DB event history.
 *
 * All USD figures assume USDC / AXUSD are 1:1 with USD (6 decimals).
 */

import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { treasuryVaultEvents } from '../../../shared/treasuryVaultSchema';
import { desc, eq, gte, sql } from 'drizzle-orm';
import { getAaveArbitrumMarket } from '../../defi/aave/arbitrumService';

const RPC = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';

const VAULT_ADDRESS    = process.env.AXIOM_TREASURY_VAULT_ADDRESS     ?? '';
const SM_ADDRESS       = process.env.AXIOM_STRATEGY_MANAGER_ADDRESS   ?? '';
const AAVE_STRATEGY    = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS   ?? '';
const CAMELOT_STRATEGY = process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS   ?? '';
const USDC             = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const VAULT_ABI = [
  'function balanceOf(address) view returns (uint256)',  // ERC20 share balance
  'function totalAssets() view returns (uint256)',        // ERC-4626
  'function totalSupply() view returns (uint256)',        // ERC20 shares
  'function paused() view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

const STRATEGY_ABI = [
  'function currentValue() view returns (uint256)',
  'function principal() view returns (uint256)',
  'function unrealizedYield() view returns (int256)',
  'function lastRebalancedAt() view returns (uint256)',
];

const STRATEGY_MANAGER_ABI = [
  'function strategyInfo(address) view returns (bool active, string name, address asset, uint256 allocatedPrincipal, uint256 harvestedYield, uint256 addedAt)',
  'function totalDeployed(address asset) view returns (uint256)',
];

export interface VaultSummary {
  aumUsdc: number;
  idleUsdc: number;
  deployedUsdc: number;
  aavePosition: StrategyPosition;
  camelotPosition: StrategyPosition;
  blendedApyEstimatePct: number | null;
  yieldHarvestedInceptionUsdc: number;
  paused: boolean;
  lastUpdated: string;
  isLive: boolean;
}

export interface StrategyPosition {
  address: string;
  name: string;
  currentValueUsdc: number;
  principalUsdc: number;
  unrealizedYieldUsdc: number;
  allocationPct: number;
  lastRebalancedAt: string | null;
  apyEstimatePct: number | null;
}

function toUsdc(raw: bigint): number {
  return Number(raw) / 1e6;
}

async function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

/** Fetch live Aave USDC supply APY and per-strategy configured APY. */
async function fetchApyEstimates(): Promise<{
  aaveApyPct: number | null;
  camelotApyPct: number | null;
}> {
  let aaveApyPct: number | null = null;
  try {
    const market = await getAaveArbitrumMarket();
    const usdc = market?.markets.find((m) => m.symbol === 'USDC');
    aaveApyPct = usdc?.supplyApyPct ?? null;
  } catch {
    aaveApyPct = null;
  }

  // Camelot APY from env var (set AXIOM_CAMELOT_APY_PCT to a configured estimate)
  const camelotRaw = process.env.AXIOM_CAMELOT_APY_PCT;
  const camelotApyPct = camelotRaw ? (parseFloat(camelotRaw) || null) : null;

  return { aaveApyPct, camelotApyPct };
}

async function fetchStrategyPosition(
  provider: ethers.Provider,
  stratAddr: string,
  smAddr: string,
  totalDeployedUsdc: number,
  apyEstimatePct: number | null
): Promise<StrategyPosition> {
  if (!stratAddr) {
    return {
      address: '',
      name: 'Not deployed',
      currentValueUsdc: 0,
      principalUsdc: 0,
      unrealizedYieldUsdc: 0,
      allocationPct: 0,
      lastRebalancedAt: null,
      apyEstimatePct: null,
    };
  }
  try {
    const strat = new ethers.Contract(stratAddr, STRATEGY_ABI, provider);
    const sm    = new ethers.Contract(smAddr, STRATEGY_MANAGER_ABI, provider);
    const [cv, pr, uy, lra, info] = await Promise.all([
      strat.currentValue()    as Promise<bigint>,
      strat.principal()       as Promise<bigint>,
      strat.unrealizedYield() as Promise<bigint>,
      strat.lastRebalancedAt() as Promise<bigint>,
      sm.strategyInfo(stratAddr) as Promise<{ name: string }>,
    ]);
    const currentValueUsdc    = toUsdc(cv);
    const principalUsdc       = toUsdc(pr);
    const unrealizedYieldUsdc = Number(uy) / 1e6;
    const allocationPct       = totalDeployedUsdc > 0
      ? (currentValueUsdc / totalDeployedUsdc) * 100 : 0;
    return {
      address: stratAddr,
      name: info.name,
      currentValueUsdc,
      principalUsdc,
      unrealizedYieldUsdc,
      allocationPct: Math.round(allocationPct * 10) / 10,
      lastRebalancedAt: lra > 0n ? new Date(Number(lra) * 1000).toISOString() : null,
      apyEstimatePct,
    };
  } catch {
    return {
      address: stratAddr,
      name: 'Error fetching',
      currentValueUsdc: 0,
      principalUsdc: 0,
      unrealizedYieldUsdc: 0,
      allocationPct: 0,
      lastRebalancedAt: null,
      apyEstimatePct: null,
    };
  }
}

/**
 * Calculate blended APY as a capital-weighted average of per-strategy APYs.
 * Returns null if either APY is unavailable.
 */
function calcBlendedApy(
  aavePos: StrategyPosition,
  camelotPos: StrategyPosition,
  deployedUsdc: number
): number | null {
  const aave = aavePos.apyEstimatePct;
  const camelot = camelotPos.apyEstimatePct;
  if (deployedUsdc <= 0) return aave ?? null;
  if (aave !== null && camelot !== null) {
    return (aavePos.currentValueUsdc * aave + camelotPos.currentValueUsdc * camelot) / deployedUsdc;
  }
  if (aave !== null && camelotPos.currentValueUsdc === 0) return aave;
  if (camelot !== null && aavePos.currentValueUsdc === 0) return camelot;
  return aave ?? camelot ?? null;
}

export async function getVaultSummary(): Promise<VaultSummary> {
  if (!VAULT_ADDRESS) {
    return buildOfflineResponse();
  }
  try {
    const provider = await getProvider();
    const vault    = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
    const usdc     = new ethers.Contract(USDC, ERC20_ABI, provider);
    const sm       = new ethers.Contract(SM_ADDRESS, STRATEGY_MANAGER_ABI, provider);

    const [idleRaw, totalRaw, paused, totalDeployedRaw, { aaveApyPct, camelotApyPct }] =
      await Promise.all([
        usdc.balanceOf(VAULT_ADDRESS) as Promise<bigint>,
        vault.totalAssets()           as Promise<bigint>,
        vault.paused()                as Promise<boolean>,
        sm.totalDeployed(USDC)        as Promise<bigint>,
        fetchApyEstimates(),
      ]);

    const idleUsdc     = toUsdc(idleRaw);
    const aumUsdc      = toUsdc(totalRaw);
    const deployedUsdc = toUsdc(totalDeployedRaw);

    const [aavePos, camelotPos] = await Promise.all([
      fetchStrategyPosition(provider, AAVE_STRATEGY,    SM_ADDRESS, deployedUsdc, aaveApyPct),
      fetchStrategyPosition(provider, CAMELOT_STRATEGY, SM_ADDRESS, deployedUsdc, camelotApyPct),
    ]);

    const yieldHarvestedInceptionUsdc = await getTotalHarvestedFromDb();
    const blendedApyEstimatePct = calcBlendedApy(aavePos, camelotPos, deployedUsdc);

    return {
      aumUsdc,
      idleUsdc,
      deployedUsdc,
      aavePosition:    aavePos,
      camelotPosition: camelotPos,
      blendedApyEstimatePct,
      yieldHarvestedInceptionUsdc,
      paused,
      lastUpdated: new Date().toISOString(),
      isLive: true,
    };
  } catch (err) {
    console.error('[vaultService] getVaultSummary error:', err);
    return buildOfflineResponse();
  }
}

async function getTotalHarvestedFromDb(): Promise<number> {
  try {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
      .from(treasuryVaultEvents)
      .where(eq(treasuryVaultEvents.eventType, 'harvest'));
    return parseFloat(result[0]?.total ?? '0');
  } catch {
    return 0;
  }
}

function buildOfflineResponse(): VaultSummary {
  const emptyPos: StrategyPosition = {
    address: '',
    name: 'Not deployed',
    currentValueUsdc: 0,
    principalUsdc: 0,
    unrealizedYieldUsdc: 0,
    allocationPct: 0,
    lastRebalancedAt: null,
    apyEstimatePct: null,
  };
  return {
    aumUsdc: 0,
    idleUsdc: 0,
    deployedUsdc: 0,
    aavePosition: emptyPos,
    camelotPosition: emptyPos,
    blendedApyEstimatePct: null,
    yieldHarvestedInceptionUsdc: 0,
    paused: false,
    lastUpdated: new Date().toISOString(),
    isLive: false,
  };
}

export async function getVaultEventHistory(limit = 50, offset = 0) {
  try {
    return await db
      .select()
      .from(treasuryVaultEvents)
      .orderBy(desc(treasuryVaultEvents.createdAt))
      .limit(limit)
      .offset(offset);
  } catch {
    return [];
  }
}

export async function getIncomeSummary(period: 'monthly' | 'quarterly' | 'ytd' | 'inception') {
  const now = new Date();
  let since: Date;
  if (period === 'monthly') {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3);
    since = new Date(now.getFullYear(), q * 3, 1);
  } else if (period === 'ytd') {
    since = new Date(now.getFullYear(), 0, 1);
  } else {
    since = new Date(0);
  }

  try {
    const rows = await db
      .select({
        eventType: treasuryVaultEvents.eventType,
        total:     sql<string>`COALESCE(SUM(amount_usd), 0)`,
        count:     sql<string>`COUNT(*)`,
      })
      .from(treasuryVaultEvents)
      .where(gte(treasuryVaultEvents.createdAt, since))
      .groupBy(treasuryVaultEvents.eventType);

    const harvest  = rows.find((r) => r.eventType === 'harvest');
    const deposit  = rows.find((r) => r.eventType === 'deposit');
    const withdraw = rows.find((r) => r.eventType === 'withdraw');
    const allocate = rows.find((r) => r.eventType === 'allocate');

    return {
      period,
      since: since.toISOString(),
      harvestTotalUsdc:  parseFloat(harvest?.total ?? '0'),
      harvestEventCount: parseInt(harvest?.count  ?? '0'),
      depositTotalUsdc:  parseFloat(deposit?.total ?? '0'),
      withdrawTotalUsdc: parseFloat(withdraw?.total ?? '0'),
      allocateTotalUsdc: parseFloat(allocate?.total ?? '0'),
    };
  } catch {
    return {
      period,
      since: since.toISOString(),
      harvestTotalUsdc:  0,
      harvestEventCount: 0,
      depositTotalUsdc:  0,
      withdrawTotalUsdc: 0,
      allocateTotalUsdc: 0,
    };
  }
}
