/**
 * lib/treasury/vault/vaultService.ts
 *
 * Read-only service that aggregates live on-chain vault state from
 * AxiomTreasuryVault + StrategyManager and combines it with DB event history.
 *
 * All USD figures assume USDC / AXUSD are 1:1 with USD.
 * USDC: 6 decimals. AXUSD (ERC-3643): 18 decimals — see AXUSD_DECIMALS below.
 */

import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { treasuryVaultEvents, harvestCronRuns } from '../../../shared/treasuryVaultSchema';
import { desc, eq, gte, sql } from 'drizzle-orm';
import { getMinHarvestThreshold } from './harvestRunner';
import { getAaveArbitrumMarket } from '../../defi/aave/arbitrumService';
import { resolveCanonicalCamelotStrategyAddress } from '../../axiom/camelotStrategyRoutes';

const RPC = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';

const VAULT_ADDRESS          = process.env.AXIOM_TREASURY_VAULT_ADDRESS            ?? '';
const SM_ADDRESS             = process.env.AXIOM_STRATEGY_MANAGER_ADDRESS          ?? '';
const AAVE_STRATEGY          = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS          ?? '';
const CAMELOT_STRATEGY       = resolveCanonicalCamelotStrategyAddress(process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS);
const EULER_USDC_STRATEGY    = process.env.EULER_USDC_THEO_STRATEGY_ADDRESS        ?? '';
const EULER_THBILL_STRATEGY  = process.env.EULER_THBILL_THEO_STRATEGY_ADDRESS      ?? '';
const EULER_WETH_STRATEGY    = process.env.EULER_WETH_ARBITRUM_STRATEGY_ADDRESS    ?? '';
const USDC             = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH             = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const THBILL           = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a';
const CHAINLINK_ETH_USD_FEED = '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612';
const MAX_CHAINLINK_ETH_USD_STALENESS_SECONDS = 3 * 60 * 60;

// AXUSD is an ERC-3643 stablecoin; address configured at deploy time.
// AXUSD has 18 decimals (ERC-20 standard, confirmed on-chain). Both USDC and AXUSD
// are treated 1:1 with USD for AUM reporting purposes.
const AXUSD_ADDRESS    = process.env.AXUSD_ADDRESS ?? '';
const AXUSD_DECIMALS   = 18;

const VAULT_ABI = [
  'function balanceOf(address) view returns (uint256)',          // ERC20 share balance
  'function totalAssets() view returns (uint256)',               // ERC-4626 (USDC only)
  'function totalSupply() view returns (uint256)',               // ERC20 shares
  'function paused() view returns (bool)',
  'function getIdleBalance(address asset) view returns (uint256)', // multi-asset idle query
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const CHAINLINK_FEED_ABI = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
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

export interface CronRunEntry {
  id: number;
  startedAt: string;
  completedAt: string;
  status: string;
  yieldUsdc: number;
  txHash: string | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface VaultSummary {
  /** Total AUM across accepted assets and valued strategies, denominated in USD. */
  aumUsdc: number;
  /** Idle USDC held in vault (not deployed to any strategy). */
  idleUsdc: number;
  /** USD value deployed across active strategies. */
  deployedUsdc: number;
  /** Idle AXUSD held in vault (tracked via idleBalance mapping). */
  axusdIdleUsdc: number;
  /** AXUSD deployed across active strategies (via SM.totalDeployed). */
  axusdDeployedUsdc: number;
  aavePosition: StrategyPosition;
  camelotPosition: StrategyPosition;
  /** Euler v2 — USDC Theo Market (~13.11% APY) */
  eulerUsdcPosition: StrategyPosition;
  /** Euler v2 — thBILL Theo Market (~15.31% APY) */
  eulerThbillPosition: StrategyPosition;
  /** Euler v2 — WETH Arbitrum Market (~15.98% APY) */
  eulerWethPosition: StrategyPosition;
  blendedApyEstimatePct: number | null;
  yieldHarvestedInceptionUsdc: number;
  /** ISO 8601 timestamp of the most recent harvest event, or null if none. */
  lastHarvestedAt: string | null;
  paused: boolean;
  lastUpdated: string;
  isLive: boolean;
  /** Minimum yield threshold for harvest (from env HARVEST_MIN_USDC, default $1.00). */
  minHarvestThresholdUsdc: number;
  /** Last 10 scheduled cron harvest runs. */
  cronRunHistory: CronRunEntry[];
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

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function strategyRawAssetValueToUsd(
  raw: bigint,
  assetDecimals: number,
  usdPricePerToken: number | null,
): number {
  if (usdPricePerToken === null || usdPricePerToken <= 0) return 0;
  return parseFloat(ethers.formatUnits(raw, assetDecimals)) * usdPricePerToken;
}

export function getStrategyCurrentValueDecimals(
  strategyAddress: string,
  strategyName: string,
  assetDecimals: number,
): number {
  if (
    (CAMELOT_STRATEGY && sameAddress(strategyAddress, CAMELOT_STRATEGY)) ||
    strategyName.toLowerCase().includes('camelot')
  ) {
    // CamelotStrategy.currentValue() reports the pool position in 18-decimal
    // units even though StrategyManager registers the strategy's asset as USDC.
    return 18;
  }
  return assetDecimals;
}

export function calcVaultAumUsdc(
  idleUsdc: number,
  axusdIdleUsdc: number,
  deployedUsdc: number,
  axusdDeployedUsdc: number,
): number {
  return idleUsdc + axusdIdleUsdc + deployedUsdc + axusdDeployedUsdc;
}

function capitalWeightUsdc(pos: StrategyPosition): number {
  return Math.max(pos.currentValueUsdc, pos.principalUsdc, 0);
}

export function deriveDeployedUsdcFromPositions(
  positions: StrategyPosition[],
  fallbackDeployedUsdc = 0
): number {
  const totalFromPositions = positions.reduce((sum, pos) => sum + capitalWeightUsdc(pos), 0);
  if (totalFromPositions > 0) return totalFromPositions;
  return Math.max(fallbackDeployedUsdc, 0);
}

export function applyAllocationPercentages(
  positions: StrategyPosition[],
  totalDeployedUsdc: number
): StrategyPosition[] {
  if (totalDeployedUsdc <= 0) {
    return positions.map((pos) => ({ ...pos, allocationPct: 0 }));
  }

  return positions.map((pos) => {
    const allocationPct = (capitalWeightUsdc(pos) / totalDeployedUsdc) * 100;
    return {
      ...pos,
      allocationPct: Math.round(allocationPct * 10) / 10,
    };
  });
}

async function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

async function getAssetDecimals(provider: ethers.Provider, asset: string): Promise<number> {
  if (!asset) return 18;
  if (sameAddress(asset, USDC)) return 6;
  if (sameAddress(asset, WETH)) return 18;
  if (AXUSD_ADDRESS && sameAddress(asset, AXUSD_ADDRESS)) return AXUSD_DECIMALS;

  try {
    const token = new ethers.Contract(asset, ERC20_ABI, provider);
    const decimals = await token.decimals() as number | bigint;
    return Number(decimals);
  } catch {
    // Fail closed toward 18 decimals so unknown assets cannot be overstated by 1e12.
    return 18;
  }
}

async function fetchEthUsdPrice(provider: ethers.Provider): Promise<number | null> {
  try {
    const feed = new ethers.Contract(CHAINLINK_ETH_USD_FEED, CHAINLINK_FEED_ABI, provider);
    const [decimals, round] = await Promise.all([
      feed.decimals() as Promise<number | bigint>,
      feed.latestRoundData() as Promise<{
        answer: bigint;
        updatedAt: bigint;
      }>,
    ]);

    if (round.answer <= 0n || round.updatedAt <= 0n) return null;
    const updatedAtMs = Number(round.updatedAt) * 1000;
    const ageSeconds = (Date.now() - updatedAtMs) / 1000;
    if (ageSeconds > MAX_CHAINLINK_ETH_USD_STALENESS_SECONDS) return null;

    return Number(round.answer) / Math.pow(10, Number(decimals));
  } catch {
    return null;
  }
}

async function fetchAssetUsdPrice(provider: ethers.Provider, asset: string): Promise<number | null> {
  if (!asset) return null;
  if (sameAddress(asset, USDC)) return 1;
  if (AXUSD_ADDRESS && sameAddress(asset, AXUSD_ADDRESS)) return 1;
  if (sameAddress(asset, THBILL)) return 1;
  if (sameAddress(asset, WETH)) return fetchEthUsdPrice(provider);

  return null;
}

/** Fetch live Aave USDC supply APY and per-strategy configured APYs. */
async function fetchApyEstimates(): Promise<{
  aaveApyPct: number | null;
  camelotApyPct: number | null;
  eulerUsdcApyPct: number | null;
  eulerThbillApyPct: number | null;
  eulerWethApyPct: number | null;
}> {
  let aaveApyPct: number | null = null;
  try {
    const market = await getAaveArbitrumMarket();
    const usdc = market?.markets.find((m) => m.symbol === 'USDC');
    aaveApyPct = usdc?.supplyApyPct ?? null;
  } catch {
    aaveApyPct = null;
  }

  // Camelot APY from env var
  const camelotRaw = process.env.AXIOM_CAMELOT_APY_PCT;
  const camelotApyPct = camelotRaw ? (parseFloat(camelotRaw) || null) : null;

  // Euler APYs — fetched live from Euler app API, fallback to env vars
  let eulerUsdcApyPct: number | null   = null;
  let eulerThbillApyPct: number | null = null;
  let eulerWethApyPct: number | null   = null;
  try {
    const res  = await fetch('https://app.euler.finance/api/vaults?chainId=42161', { next: { revalidate: 300 } });
    const data = await res.json() as { evkVaults?: Array<{ address: string; supplyApy?: { __bi?: string } | number }> };
    const vaults = data.evkVaults ?? [];
    const find = (addr: string) => vaults.find((v) => v.address.toLowerCase() === addr.toLowerCase());

    const parseApy = (v: typeof vaults[0] | undefined): number | null => {
      if (!v) return null;
      if (typeof v.supplyApy === 'number') return v.supplyApy;
      // __bi field is in ray (1e27) — convert: apy = value / 1e25 (gives %)
      const raw = v.supplyApy?.__bi;
      if (raw) return parseFloat(raw) / 1e25;
      return null;
    };

    eulerUsdcApyPct   = parseApy(find('0x05d28A86E057364F6ad1a88944297E58Fc6160b3'));
    eulerThbillApyPct = parseApy(find('0x79e1F4a1Cde92568D58EB823f81D9c0C7C384e6b'));
    eulerWethApyPct   = parseApy(find('0x78E3E051D32157AACD550fBB78458762d8f7edFF'));
  } catch {
    // Fallback to env var overrides if API is unreachable
  }

  // Allow env var overrides for any Euler market
  const eulerUsdcEnv   = process.env.EULER_USDC_APY_PCT;
  const eulerThbillEnv = process.env.EULER_THBILL_APY_PCT;
  const eulerWethEnv   = process.env.EULER_WETH_APY_PCT;
  if (eulerUsdcEnv)   eulerUsdcApyPct   = parseFloat(eulerUsdcEnv)   || eulerUsdcApyPct;
  if (eulerThbillEnv) eulerThbillApyPct = parseFloat(eulerThbillEnv) || eulerThbillApyPct;
  if (eulerWethEnv)   eulerWethApyPct   = parseFloat(eulerWethEnv)   || eulerWethApyPct;

  return { aaveApyPct, camelotApyPct, eulerUsdcApyPct, eulerThbillApyPct, eulerWethApyPct };
}

async function fetchStrategyPosition(
  provider: ethers.Provider,
  stratAddr: string,
  smAddr: string,
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
      sm.strategyInfo(stratAddr) as Promise<{ name: string; asset: string }>,
    ]);
    const asset = info.asset ?? '';
    const [assetDecimals, usdPricePerToken] = await Promise.all([
      getAssetDecimals(provider, asset),
      fetchAssetUsdPrice(provider, asset),
    ]);
    const currentValueDecimals = getStrategyCurrentValueDecimals(stratAddr, info.name, assetDecimals);
    const currentValueUsdc = strategyRawAssetValueToUsd(cv, currentValueDecimals, usdPricePerToken);
    const principalUsdc = strategyRawAssetValueToUsd(pr, assetDecimals, usdPricePerToken);
    const unrealizedYieldUsdc = strategyRawAssetValueToUsd(uy, assetDecimals, usdPricePerToken);
    return {
      address: stratAddr,
      name: info.name,
      currentValueUsdc,
      principalUsdc,
      unrealizedYieldUsdc,
      allocationPct: 0,
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
 * Calculate blended APY as a capital-weighted average of all active strategy APYs.
 * Returns null if no APY data is available.
 */
export function calcBlendedApy(
  positions: StrategyPosition[],
  totalDeployedUsdc: number
): number | null {
  if (totalDeployedUsdc <= 0) {
    // No capital deployed — return first non-null APY as reference rate
    return positions.find((p) => p.apyEstimatePct !== null)?.apyEstimatePct ?? null;
  }
  let weightedSum = 0;
  let totalWeight = 0;
  for (const pos of positions) {
    const weight = capitalWeightUsdc(pos);
    if (pos.apyEstimatePct !== null && weight > 0) {
      weightedSum += weight * pos.apyEstimatePct;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) {
    return positions.find((p) => p.apyEstimatePct !== null)?.apyEstimatePct ?? null;
  }
  return weightedSum / totalWeight;
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

    const [idleRaw, paused, totalDeployedRaw, apyEst] =
      await Promise.all([
        usdc.balanceOf(VAULT_ADDRESS) as Promise<bigint>,
        vault.paused()                as Promise<boolean>,
        sm.totalDeployed(USDC)        as Promise<bigint>,
        fetchApyEstimates(),
      ]);

    const { aaveApyPct, camelotApyPct, eulerUsdcApyPct, eulerThbillApyPct, eulerWethApyPct } = apyEst;

    const idleUsdc     = toUsdc(idleRaw);
    const fallbackDeployedUsdc = toUsdc(totalDeployedRaw);

    // ── AXUSD AUM (secondary asset) ──────────────────────────────────────────
    let axusdIdleUsdc     = 0;
    let axusdDeployedUsdc = 0;
    if (AXUSD_ADDRESS) {
      try {
        const [axusdIdleRaw, axusdDeployedRaw] = await Promise.all([
          vault.getIdleBalance(AXUSD_ADDRESS) as Promise<bigint>,
          sm.totalDeployed(AXUSD_ADDRESS)     as Promise<bigint>,
        ]);
        axusdIdleUsdc     = Number(axusdIdleRaw)     / Math.pow(10, AXUSD_DECIMALS);
        axusdDeployedUsdc = Number(axusdDeployedRaw) / Math.pow(10, AXUSD_DECIMALS);
      } catch {
        // AXUSD not yet deployed or address misconfigured — silently omit
      }
    }
    // ── Fetch all strategy positions in parallel ──────────────────────────────
    const basePositions = await Promise.all([
      fetchStrategyPosition(provider, AAVE_STRATEGY,         SM_ADDRESS, aaveApyPct),
      fetchStrategyPosition(provider, CAMELOT_STRATEGY,      SM_ADDRESS, camelotApyPct),
      fetchStrategyPosition(provider, EULER_USDC_STRATEGY,   SM_ADDRESS, eulerUsdcApyPct),
      fetchStrategyPosition(provider, EULER_THBILL_STRATEGY, SM_ADDRESS, eulerThbillApyPct),
      fetchStrategyPosition(provider, EULER_WETH_STRATEGY,   SM_ADDRESS, eulerWethApyPct),
    ]);
    const deployedUsdc = deriveDeployedUsdcFromPositions(basePositions, fallbackDeployedUsdc);
    const [aavePos, camelotPos, eulerUsdcPos, eulerThbillPos, eulerWethPos] = applyAllocationPercentages(
      basePositions,
      deployedUsdc,
    );
    const aumUsdc = calcVaultAumUsdc(idleUsdc, axusdIdleUsdc, deployedUsdc, axusdDeployedUsdc);

    const [yieldHarvestedInceptionUsdc, lastHarvestedAt, cronRunHistory] = await Promise.all([
      getTotalHarvestedFromDb(),
      getLastHarvestEvent(),
      getCronRunHistory(10),
    ]);

    const blendedApyEstimatePct = calcBlendedApy(
      [aavePos, camelotPos, eulerUsdcPos, eulerThbillPos, eulerWethPos],
      deployedUsdc,
    );

    return {
      aumUsdc,
      idleUsdc,
      deployedUsdc,
      axusdIdleUsdc,
      axusdDeployedUsdc,
      aavePosition:       aavePos,
      camelotPosition:    camelotPos,
      eulerUsdcPosition:  eulerUsdcPos,
      eulerThbillPosition: eulerThbillPos,
      eulerWethPosition:  eulerWethPos,
      blendedApyEstimatePct,
      yieldHarvestedInceptionUsdc,
      lastHarvestedAt,
      paused,
      lastUpdated: new Date().toISOString(),
      isLive: true,
      minHarvestThresholdUsdc: getMinHarvestThreshold(),
      cronRunHistory,
    };
  } catch (err) {
    console.error('[vaultService] getVaultSummary error:', err);
    return buildOfflineResponse();
  }
}

export async function getLastHarvestEvent(): Promise<string | null> {
  try {
    const result = await db
      .select({ createdAt: treasuryVaultEvents.createdAt })
      .from(treasuryVaultEvents)
      .where(eq(treasuryVaultEvents.eventType, 'harvest'))
      .orderBy(desc(treasuryVaultEvents.createdAt))
      .limit(1);
    return result[0]?.createdAt?.toISOString() ?? null;
  } catch {
    return null;
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

export async function getCronRunHistory(limit = 10): Promise<CronRunEntry[]> {
  try {
    const rows = await db
      .select()
      .from(harvestCronRuns)
      .orderBy(desc(harvestCronRuns.startedAt))
      .limit(limit);
    return rows.map((r) => ({
      id:           r.id,
      startedAt:    r.startedAt.toISOString(),
      completedAt:  r.completedAt.toISOString(),
      status:       r.status,
      yieldUsdc:    parseFloat(String(r.yieldUsdc)),
      txHash:       r.txHash ?? null,
      errorMessage: r.errorMessage ?? null,
      durationMs:   r.durationMs ?? null,
    }));
  } catch {
    return [];
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
    axusdIdleUsdc: 0,
    axusdDeployedUsdc: 0,
    aavePosition:        emptyPos,
    camelotPosition:     emptyPos,
    eulerUsdcPosition:   emptyPos,
    eulerThbillPosition: emptyPos,
    eulerWethPosition:   emptyPos,
    blendedApyEstimatePct: null,
    yieldHarvestedInceptionUsdc: 0,
    lastHarvestedAt: null,
    paused: false,
    lastUpdated: new Date().toISOString(),
    isLive: false,
    minHarvestThresholdUsdc: getMinHarvestThreshold(),
    cronRunHistory: [],
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
