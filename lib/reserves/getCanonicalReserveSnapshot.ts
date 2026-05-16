/**
 * lib/reserves/getCanonicalReserveSnapshot.ts
 *
 * Single canonical live-fetch for all Axiom Protocol reserve balances.
 * Both the public observer API and the authenticated founder API must
 * delegate to this function so AXUSD scope, coverage numerator, pricing
 * logic, and circulating-supply denominator cannot drift between them.
 *
 * Accounting rules enforced here (authoritative, do not relax without
 * updating both API adapters and this comment):
 *
 *   total_reserve     = ETH + PAXG + AXAU + AXM + USDC + AXUSD
 *
 *   coverage_numerator = PAXG + USDC only
 *     ETH  — gas reserve, operational only, not AXUSD backing
 *     AXAU — protocol instrument backed partly by PAXG (already counted)
 *            including it would double-count gold exposure
 *     AXM  — governance token, no fixed redemption peg to AXUSD
 *     AXUSD — this is the liability being covered, not a backing asset
 *
 *   coverage_denominator = axusd.totalSupply()  (circulating supply)
 *     NOT the treasury wallet balance — the relevant question is
 *     "are reserves adequate to cover all outstanding AXUSD?"
 *
 * AXUSD scope: Treasury Revenue contract + Euler EVK Open Market Vault
 * (eAXUSD-6). Both locations must be included or the total understates
 * protocol-held AXUSD and diverges from the internal Founder Ops view.
 */

import { ethers } from 'ethers';
import { DEPLOYER_EOA } from '../../src/config/adminRoles';
import {
  CORE_CONTRACTS,
  AXUSD_GENIUS_CONTRACTS,
  STABLECOINS,
  EULER_LENDING_CONTRACTS,
} from '../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../shared/contracts-3643';
import {
  CANONICAL_PSM,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  isEulerSwapDeployed,
} from '../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES, ORACLE_STALE_THRESHOLD_SECONDS } from '../services/AXAUContractService';
import { bitGoTreasuryExtension } from '../services/BitGoTreasuryExtension';
import { getVaultBuffer } from '../services/AXAUFulfillmentService';

// ── Canonical type definitions ────────────────────────────────────────────────
// These types are the contract between the canonical function and its adapters.

export type ReserveBucketType =
  | 'hard_asset_backing'      // PAXG, USDC — included in coverage numerator
  | 'stable_backing'          // USDC stable reserve
  | 'gas_reserve'             // ETH — operational only, NOT in coverage numerator
  | 'protocol_instrument'     // AXAU — do not double-count into coverage numerator
  | 'governance_inventory'    // AXM — governance token reserve
  | 'protocol_stable_inventory' // AXUSD held by protocol (the liability, not backing)
  | 'fiat_reserve';           // Fiat USD (banking rail, off-chain)

export type SourceType =
  | 'live_rpc'      // Direct on-chain eth_call / balanceOf
  | 'custodian_db'  // BitGo CaaS DB snapshot (may be stale — check dataAgeSeconds)
  | 'oracle'        // Chainlink or other on-chain oracle
  | 'coingecko'     // CoinGecko free API
  | 'internal_db';  // Internal Postgres snapshot

export interface CanonicalReserveLocation {
  label: string;
  address?: string;
  sourceType: SourceType;
  balance: number;
  valueUsd: number;
  notes?: string;
  fetchedAt: string;
  dataAgeSeconds?: number;
}

export interface CanonicalReserveAsset {
  symbol: string;
  bucketType: ReserveBucketType;
  /** Include the USD value of this asset in totalReserveUsd. */
  includedInTotalReserve: boolean;
  /** Include the USD value of this asset in the hard-asset coverage numerator.
   *  Only PAXG and USDC qualify. See module-level comment for rationale. */
  includedInCoverageNumerator: boolean;
  locations: CanonicalReserveLocation[];
  totalBalance: number;
  totalValueUsd: number;
  priceUsd?: number;
  pricingMethod?: string;
  notes?: string;
  /** Age of the balance data in seconds. 0 = live on-chain; larger = custodian DB snapshot. */
  dataAgeSeconds?: number;
}

export interface CanonicalReserveSnapshot {
  fetchedAt: string;
  assets: CanonicalReserveAsset[];
  totals: {
    totalReserveUsd: number;
    hardAssetCoverageUsd: number;
    axusdCirculatingSupply: number;
    coverageRatio: number | null;
  };
  notes: {
    coverage: string;
  };
  /**
   * Raw underlying values exposed for adapter-specific logic.
   * Adapters (API routes) should read from here rather than re-deriving
   * the same values from assets[]. Do not use `_raw` in UI — map through
   * the assets array instead.
   */
  _raw: {
    ethBal: number;
    ethPrice: number | null;
    eth24hPct: number | null;
    paxgBal: number;
    paxgViaBitgo: boolean;
    bitgoDataAgeSeconds: number | null;
    xauPrice: number | null;
    xau24hPct: number | null;
    axauBal: number;
    axauValueUsd: number;
    axauNavPerToken: number;
    axmTreasury: number;
    axmStaking: number;
    axmTotal: number;
    axmPrice: number | null;
    usdcCanonical: number;
    usdcLegacy: number;
    usdcBackstop: number;
    usdcDeployer: number;
    usdcTotal: number;
    axusdTreasury: number;
    axusdEvk: number;
    axusdTotal: number;
    axusdCirculatingSupply: number;
    vault: Awaited<ReturnType<typeof getVaultBuffer>> | null;
    oracleAgeSeconds: number | null;
    oracleStale: boolean;
    mintPaused: boolean;
    bufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED' | 'UNKNOWN';
  };
}

// ── Constants ────────────────────────────────────────────────────────────────

const AXM_ADDRESS   = CORE_CONTRACTS.AXM_TOKEN;
const AXUSD_ADDRESS = ERC3643_CONTRACTS.AXUSD_TOKEN;
const USDC_ADDRESS  = STABLECOINS.USDC;
const ZERO          = '0x0000000000000000000000000000000000000000';
const AXM_LC        = AXM_ADDRESS.toLowerCase();

const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const FETCH_DEADLINE_MS = 20_000;
const BITGO_STALE_THRESHOLD_SECONDS = 3_600; // 1 hour

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];
const POOL_ABI = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function getAssets() view returns (address,address)',
];
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

export const COVERAGE_NOTE =
  'Hard-asset backing (PAXG + USDC) / AXUSD circulating supply. ' +
  'ETH is an operational gas reserve and is not included. ' +
  'AXAU is a protocol instrument and is not double-counted.';

// ── Internal helpers ──────────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface CgPrices {
  ethUsd: number | null;
  eth24hPct: number | null;
  xauUsd: number | null;
  xau24hPct: number | null;
}

async function fetchCoinGeckoPrices(): Promise<CgPrices> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true',
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return { ethUsd: null, eth24hPct: null, xauUsd: null, xau24hPct: null };
    const json = await res.json() as {
      ethereum?: { usd?: number; usd_24h_change?: number };
      'pax-gold'?: { usd?: number; usd_24h_change?: number };
    };
    return {
      ethUsd:    json.ethereum?.usd ?? null,
      eth24hPct: json.ethereum?.usd_24h_change ?? null,
      xauUsd:    json['pax-gold']?.usd ?? null,
      xau24hPct: json['pax-gold']?.usd_24h_change ?? null,
    };
  } catch {
    return { ethUsd: null, eth24hPct: null, xauUsd: null, xau24hPct: null };
  }
}

async function fetchAxmPoolPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  const poolAddr = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || !poolAddr || (poolAddr as string) === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);
    const asset0Lower = (assets[0] as string).toLowerCase();
    const axmIsAsset0 = asset0Lower === AXM_LC;
    const axmReserve   = Number(ethers.formatUnits(axmIsAsset0 ? reserves[0] : reserves[1], 18));
    const axusdReserve = Number(ethers.formatUnits(axmIsAsset0 ? reserves[1] : reserves[0], 18));
    if (axmReserve <= 0) return null;
    return axusdReserve / axmReserve;
  } catch { return null; }
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function getCanonicalReserveSnapshot(): Promise<CanonicalReserveSnapshot> {
  const rpcReq = new ethers.FetchRequest(ARBITRUM_RPC);
  rpcReq.timeout = 5_000;
  const provider = new ethers.JsonRpcProvider(rpcReq);

  const axm       = new ethers.Contract(AXM_ADDRESS,   ERC20_ABI, provider);
  const axusd     = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
  const usdc      = new ethers.Contract(USDC_ADDRESS,  ERC20_ABI, provider);
  const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);

  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('canonical reserve snapshot: fetch deadline exceeded')), FETCH_DEADLINE_MS),
  );

  const [
    cgPrices,
    axmPrice,
    vault,
    bitgo,
    ethBalRaw,
    axmTreasuryRaw,
    axmStakingRaw,
    axusdTreasuryRaw,
    axusdEvkRaw,
    axusdTotalSupplyRaw,
    usdcCanonicalRaw,
    usdcLegacyRaw,
    usdcBackstopRaw,
    usdcDeployerRaw,
    oracleRound,
  ] = await Promise.race([
    Promise.all([
      withTimeout(fetchCoinGeckoPrices(),                                                               10_000, { ethUsd: null, eth24hPct: null, xauUsd: null, xau24hPct: null }),
      withTimeout(fetchAxmPoolPrice(provider),                                                          6_000, null),
      withTimeout(getVaultBuffer().catch(() => null),                                                   6_000, null),
      withTimeout(bitGoTreasuryExtension.getReserveAssetBalances().catch(() => null),                  6_000, null),
      withTimeout((async () => provider.getBalance(DEPLOYER_EOA))().catch(() => 0n),                                  6_000, 0n),
      withTimeout((async () => axm.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE))().catch(() => 0n),                     6_000, 0n),
      withTimeout((async () => axm.balanceOf(CORE_CONTRACTS.STAKING_EMISSIONS))().catch(() => 0n),                    6_000, 0n),
      withTimeout((async () => axusd.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE))().catch(() => 0n),                   6_000, 0n),
      // AXUSD scope: Treasury Revenue + EVK Open Market Vault (eAXUSD-6).
      // Both locations MUST be included. Omitting EVK was the Phase-1 bug.
      withTimeout((async () => axusd.balanceOf(EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT))().catch(() => 0n),    6_000, 0n),
      // Coverage denominator: use totalSupply(), NOT the treasury wallet balance.
      // The treasury wallet balance is often 0, making coverage appear undefined.
      withTimeout((async () => axusd.totalSupply())().catch(() => 0n),                                                6_000, 0n),
      withTimeout((async () => usdc.balanceOf(CANONICAL_PSM))().catch(() => 0n),                                     6_000, 0n),
      withTimeout((async () => usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM))().catch(() => 0n),                        6_000, 0n),
      withTimeout((async () => usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC))().catch(() => 0n),        6_000, 0n),
      withTimeout((async () => usdc.balanceOf(DEPLOYER_EOA))().catch(() => 0n),                                      6_000, 0n),
      withTimeout((async () => chainlink.latestRoundData())().catch(() => null),                                      6_000, null),
    ]),
    deadline,
  ]);

  const fetchedAt = new Date().toISOString();

  // ── Oracle freshness ──────────────────────────────────────────────────────
  const nowSec          = Math.floor(Date.now() / 1000);
  const oracleUpdatedAt = oracleRound ? Number(oracleRound[3]) : 0;
  const oracleAgeSeconds: number | null = oracleUpdatedAt > 0 ? nowSec - oracleUpdatedAt : null;
  const oracleStale = oracleAgeSeconds !== null
    ? oracleAgeSeconds > ORACLE_STALE_THRESHOLD_SECONDS
    : true;

  // ── Price resolution ──────────────────────────────────────────────────────
  const ethPrice  = cgPrices.ethUsd;
  const eth24hPct = cgPrices.eth24hPct;
  // XAU price: Chainlink (via vault buffer) preferred over CoinGecko.
  const xauPrice  = vault ? parseFloat(vault.xauUsdPrice) : (cgPrices.xauUsd ?? null);
  const xau24hPct = cgPrices.xau24hPct;

  // ── ETH ───────────────────────────────────────────────────────────────────
  const ethBal   = Number(ethers.formatEther(ethBalRaw as bigint));
  const ethValue = ethPrice !== null ? ethBal * ethPrice : null;

  // ── PAXG ──────────────────────────────────────────────────────────────────
  // Primary source: BitGo CaaS custodian-reported (DB snapshot).
  // Fallback:       Deployer EOA on-chain balance via AXAUFulfillmentService.
  // NOTE: bitgo_wallets table is currently empty; fallback is always used.
  const bitgoPaxg    = (bitgo?.positions ?? []).find(p => p.assetSymbol === 'PAXG');
  const paxgViaBitgo = !!(bitgoPaxg && bitgoPaxg.quantity > 0);
  const paxgBal      = paxgViaBitgo
    ? bitgoPaxg!.quantity
    : (vault ? parseFloat(vault.paxgBalanceFormatted) : 0);
  const paxgValue    = xauPrice !== null ? paxgBal * xauPrice : null;

  const bitgoDataAgeSeconds: number | null = (() => {
    const pos = (bitgo?.positions ?? []).find(p => p.assetSymbol === 'PAXG');
    if (!pos?.trustSource?.lastVerifiedAt) return null;
    try {
      return Math.round((Date.now() - new Date(pos.trustSource.lastVerifiedAt).getTime()) / 1000);
    } catch { return null; }
  })();

  const isBitgoStale = bitgoDataAgeSeconds !== null
    ? bitgoDataAgeSeconds > BITGO_STALE_THRESHOLD_SECONDS
    : false; // table is empty → no stale data to warn about

  // ── AXAU ──────────────────────────────────────────────────────────────────
  // Note: AXAU is a PROTOCOL INSTRUMENT, not hard-asset backing.
  // It is backed partly by PAXG (which is already counted in the coverage
  // numerator). Including AXAU in the coverage numerator would double-count
  // gold exposure. AXAU is included in totalReserveUsd but NOT in coverage.
  const axauBal         = vault ? parseFloat(vault.axauBalanceFormatted) : 0;
  const axauValueUsd    = vault ? parseFloat(vault.axauValueUsd) : axauBal * 1.15;
  const axauNavPerToken = vault && axauBal > 0
    ? parseFloat(vault.axauValueUsd) / axauBal
    : 1.15;
  const bufferCapacity  = vault?.bufferCapacity ?? 'UNKNOWN';
  const mintPaused      = vault?.mintPaused ?? false;

  // ── AXM ───────────────────────────────────────────────────────────────────
  const axmTreasury = Number(ethers.formatUnits(axmTreasuryRaw as bigint, 18));
  const axmStaking  = Number(ethers.formatUnits(axmStakingRaw as bigint, 18));
  const axmTotal    = axmTreasury + axmStaking;
  const axmValue    = axmPrice !== null ? axmTotal * axmPrice : null;

  // ── USDC ──────────────────────────────────────────────────────────────────
  const usdcCanonical = Number(ethers.formatUnits(usdcCanonicalRaw as bigint, 6));
  const usdcLegacy    = Number(ethers.formatUnits(usdcLegacyRaw as bigint, 6));
  const usdcBackstop  = Number(ethers.formatUnits(usdcBackstopRaw as bigint, 6));
  const usdcDeployer  = Number(ethers.formatUnits(usdcDeployerRaw as bigint, 6));
  const usdcTotal     = usdcCanonical + usdcLegacy + usdcBackstop + usdcDeployer;

  // ── AXUSD ─────────────────────────────────────────────────────────────────
  // Holdings scope: Treasury Revenue + Euler EVK Open Market Vault (eAXUSD-6).
  const axusdTreasury         = Number(ethers.formatUnits(axusdTreasuryRaw as bigint, 18));
  const axusdEvk              = Number(ethers.formatUnits(axusdEvkRaw as bigint, 18));
  const axusdTotal            = axusdTreasury + axusdEvk;
  // Coverage denominator is circulating supply, not protocol holdings.
  const axusdCirculatingSupply = Number(ethers.formatUnits(axusdTotalSupplyRaw as bigint, 18));

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalReserveUsd = [ethValue, paxgValue, axauValueUsd, axmValue, usdcTotal, axusdTotal]
    .filter((v): v is number => v !== null)
    .reduce((a, b) => a + b, 0);

  // Hard-asset coverage: PAXG + USDC only.
  // ETH  = gas reserve (operational) — excluded
  // AXAU = protocol instrument (gold partially counted via PAXG) — excluded
  // AXM  = governance token (no fixed AXUSD redemption peg) — excluded
  // AXUSD = the liability being covered — not in numerator
  const hardAssetCoverageUsd = [paxgValue, usdcTotal]
    .filter((v): v is number => v !== null)
    .reduce((a, b) => a + b, 0);

  const coverageRatio = axusdCirculatingSupply > 0
    ? hardAssetCoverageUsd / axusdCirculatingSupply
    : null;

  // ── Canonical assets array ────────────────────────────────────────────────

  const assets: CanonicalReserveAsset[] = [
    {
      symbol: 'ETH',
      bucketType: 'gas_reserve',
      includedInTotalReserve: true,
      includedInCoverageNumerator: false,
      notes: 'Operational gas reserve on Deployer EOA. Not included in hard-asset coverage numerator.',
      totalBalance: ethBal,
      totalValueUsd: ethValue ?? 0,
      priceUsd: ethPrice ?? undefined,
      pricingMethod: 'CoinGecko (ethereum/usd)',
      dataAgeSeconds: 0,
      locations: [
        {
          label: 'Deployer EOA',
          address: DEPLOYER_EOA,
          sourceType: 'live_rpc',
          balance: ethBal,
          valueUsd: ethValue ?? 0,
          fetchedAt,
          dataAgeSeconds: 0,
        },
      ],
    },
    {
      symbol: 'PAXG',
      bucketType: 'hard_asset_backing',
      includedInTotalReserve: true,
      includedInCoverageNumerator: true,
      notes: paxgViaBitgo
        ? 'BitGo CaaS custodian-reported balance (primary).'
        : 'BitGo CaaS unavailable — balance sourced from deployer EOA on-chain via AXAUFulfillmentService vault buffer.',
      totalBalance: paxgBal,
      totalValueUsd: paxgValue ?? 0,
      priceUsd: xauPrice ?? undefined,
      pricingMethod: vault
        ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)'
        : 'CoinGecko pax-gold/usd (Chainlink unavailable)',
      dataAgeSeconds: bitgoDataAgeSeconds ?? 0,
      locations: [
        {
          label: paxgViaBitgo
            ? 'Deployer EOA (collateral source — BitGo CaaS is primary custodian)'
            : 'Deployer EOA (on-chain balance — BitGo CaaS unavailable)',
          address: DEPLOYER_EOA,
          sourceType: paxgViaBitgo ? 'custodian_db' : 'live_rpc',
          balance: paxgBal,
          valueUsd: paxgValue ?? 0,
          fetchedAt,
          dataAgeSeconds: bitgoDataAgeSeconds ?? 0,
          notes: paxgViaBitgo && isBitgoStale
            ? `BitGo data may be stale (age: ${bitgoDataAgeSeconds}s > ${BITGO_STALE_THRESHOLD_SECONDS}s threshold)`
            : undefined,
        },
      ],
    },
    {
      symbol: 'AXAU',
      bucketType: 'protocol_instrument',
      includedInTotalReserve: true,
      includedInCoverageNumerator: false,
      notes: 'AXAU is a protocol-issued reserve instrument. It is backed partly by PAXG (already counted in coverage). Including AXAU in the coverage numerator would double-count gold exposure.',
      totalBalance: axauBal,
      totalValueUsd: axauValueUsd,
      priceUsd: axauNavPerToken,
      pricingMethod: 'Approximate Mint NAV (~$1.15/AXAU) — not XAU/USD spot',
      dataAgeSeconds: 0,
      locations: [
        {
          label: 'Deployer EOA (fulfillment buffer)',
          address: DEPLOYER_EOA,
          sourceType: 'live_rpc',
          balance: axauBal,
          valueUsd: axauValueUsd,
          fetchedAt,
          dataAgeSeconds: 0,
          notes: `Buffer: ${bufferCapacity}${mintPaused ? ' · MINT PAUSED' : ''}`,
        },
      ],
    },
    {
      symbol: 'AXM',
      bucketType: 'governance_inventory',
      includedInTotalReserve: true,
      includedInCoverageNumerator: false,
      notes: 'Governance token held in Treasury Revenue and Staking Emissions contracts. Price derived from EulerSwap pool reserve ratio. No fixed AXUSD redemption peg.',
      totalBalance: axmTotal,
      totalValueUsd: axmValue ?? 0,
      priceUsd: axmPrice ?? undefined,
      pricingMethod: 'On-chain EulerSwap AXUSD/AXM pool reserve ratio (spot)',
      dataAgeSeconds: 0,
      locations: [
        {
          label: 'Treasury Revenue Hub',
          address: CORE_CONTRACTS.TREASURY_REVENUE,
          sourceType: 'live_rpc',
          balance: axmTreasury,
          valueUsd: axmPrice !== null ? axmTreasury * axmPrice : 0,
          fetchedAt,
          dataAgeSeconds: 0,
        },
        {
          label: 'Staking Emissions Hub',
          address: CORE_CONTRACTS.STAKING_EMISSIONS,
          sourceType: 'live_rpc',
          balance: axmStaking,
          valueUsd: axmPrice !== null ? axmStaking * axmPrice : 0,
          fetchedAt,
          dataAgeSeconds: 0,
        },
      ],
    },
    {
      symbol: 'USDC',
      bucketType: 'stable_backing',
      includedInTotalReserve: true,
      includedInCoverageNumerator: true,
      notes: 'USDC aggregated across canonical PSM, legacy PSM, backstop vault, and deployer EOA.',
      totalBalance: usdcTotal,
      totalValueUsd: usdcTotal,
      priceUsd: 1.0,
      pricingMethod: 'Stable peg — $1.00 USDC',
      dataAgeSeconds: 0,
      locations: [
        {
          label: 'Canonical PSM (ERC-3643)',
          address: CANONICAL_PSM,
          sourceType: 'live_rpc',
          balance: usdcCanonical,
          valueUsd: usdcCanonical,
          fetchedAt,
          dataAgeSeconds: 0,
        },
        {
          label: 'Legacy PSM / GENIUS (Migrating)',
          address: AXUSD_GENIUS_CONTRACTS.PSM,
          sourceType: 'live_rpc',
          balance: usdcLegacy,
          valueUsd: usdcLegacy,
          fetchedAt,
          dataAgeSeconds: 0,
        },
        {
          label: 'Backstop Vault USDC',
          address: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
          sourceType: 'live_rpc',
          balance: usdcBackstop,
          valueUsd: usdcBackstop,
          fetchedAt,
          dataAgeSeconds: 0,
        },
        {
          label: 'Deployer EOA',
          address: DEPLOYER_EOA,
          sourceType: 'live_rpc',
          balance: usdcDeployer,
          valueUsd: usdcDeployer,
          fetchedAt,
          dataAgeSeconds: 0,
        },
      ],
    },
    {
      symbol: 'AXUSD',
      bucketType: 'protocol_stable_inventory',
      includedInTotalReserve: true,
      includedInCoverageNumerator: false,
      notes: 'AXUSD held by the protocol (Treasury Revenue + Euler EVK vault). Not in coverage numerator — AXUSD is the liability being covered, not an asset backing it.',
      totalBalance: axusdTotal,
      totalValueUsd: axusdTotal,
      priceUsd: 1.0,
      pricingMethod: 'Stable peg — $1.00 AXUSD',
      dataAgeSeconds: 0,
      locations: [
        {
          label: 'Treasury Revenue Contract',
          address: CORE_CONTRACTS.TREASURY_REVENUE,
          sourceType: 'live_rpc',
          balance: axusdTreasury,
          valueUsd: axusdTreasury,
          fetchedAt,
          dataAgeSeconds: 0,
        },
        {
          label: 'Euler EVK Open Market Vault (eAXUSD-6)',
          address: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT,
          sourceType: 'live_rpc',
          balance: axusdEvk,
          valueUsd: axusdEvk,
          fetchedAt,
          dataAgeSeconds: 0,
        },
      ],
    },
  ];

  return {
    fetchedAt,
    assets,
    totals: {
      totalReserveUsd,
      hardAssetCoverageUsd,
      axusdCirculatingSupply,
      coverageRatio,
    },
    notes: {
      coverage: COVERAGE_NOTE,
    },
    _raw: {
      ethBal,
      ethPrice,
      eth24hPct,
      paxgBal,
      paxgViaBitgo,
      bitgoDataAgeSeconds,
      xauPrice,
      xau24hPct,
      axauBal,
      axauValueUsd,
      axauNavPerToken,
      axmTreasury,
      axmStaking,
      axmTotal,
      axmPrice,
      usdcCanonical,
      usdcLegacy,
      usdcBackstop,
      usdcDeployer,
      usdcTotal,
      axusdTreasury,
      axusdEvk,
      axusdTotal,
      axusdCirculatingSupply,
      vault,
      oracleAgeSeconds,
      oracleStale,
      mintPaused,
      bufferCapacity: bufferCapacity as 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED' | 'UNKNOWN',
    },
  };
}
