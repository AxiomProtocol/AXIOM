/**
 * Callable solvency-snapshot generator.
 *
 * This is the canonical implementation that BOTH the public auto-ingest
 * endpoint (`/api/solvency/auto-ingest`) and the scheduled cron handler
 * (`/api/cron/refresh-solvency`) call directly. There is intentionally no
 * HTTP self-call between them — that pattern works on Replit (single
 * long-running process, loopback always reachable) but breaks on Vercel
 * (each route is its own isolated serverless function, loopback doesn't
 * resolve, and Vercel-internal self-fetches occasionally surface as
 * unhandled framework errors that escape user-level try/catch).
 *
 * Auth is the caller's responsibility — this function performs none.
 *
 * On-chain reads, DB writes, oracle enrichment, and AME re-run are all
 * performed inline. Optional auxiliary calls (oracle, AME) accept an
 * `internalBaseUrl` and are silently skipped when null/empty so that the
 * primary deliverable — a fresh, persisted snapshot — succeeds even when
 * sibling endpoints aren't reachable from the current execution context.
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { pool } from '../../server/db';
import {
  ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM,
  CANONICAL_PSM, isCanonicalPsmDeployed,
  EVK_OPEN_MARKET_VAULT_ADDRESS, isEvkVaultDeployed,
  EULER_EARN_VAULT_ADDRESS, isEulerEarnDeployed,
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed,
} from '../../src/config/activeContracts.generated';
import { AXUSD_ORACLE_ADAPTER, isOracleDeployed } from '../../src/config/oracleConfig';

const PSM_ABI = [
  'function axusd() view returns (address)',
  'function collateral() view returns (address)',
  'function debtCeiling() view returns (uint256)',
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function paused() view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const DEPLOYER_ADDRESS = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

void PSM_ABI; // ABI retained for future PSM-state enrichment

export type RunAutoIngestOpts = {
  notes?: string;
  /**
   * Optional URL to use for auxiliary HTTP calls (oracle, AME).
   * Pass `null` (or omit) to skip those calls entirely — the primary
   * snapshot still persists and the response degrades gracefully.
   * On Vercel, callers should pass `null` because cross-function
   * loopback is unreliable; the snapshot itself contains all the
   * material data anyway.
   */
  internalBaseUrl?: string | null;
  /**
   * Admin key to use when calling the AME re-run endpoint. Required
   * only if `internalBaseUrl` is set.
   */
  adminKey?: string;
};

export type RunAutoIngestResult =
  | {
      ok: true;
      rateLimited: false;
      snapshotId: string;
      checksum: string;
      createdAt: Date;
      summary: {
        treasuryTotalUsd: number;
        psmReserves: number;
        liabilities: number;
        ethPrice: number;
      };
      ameRun: string;
    }
  | {
      ok: true;
      rateLimited: true;
      secondsSinceLast: number;
    };

export class RunAutoIngestError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'RunAutoIngestError';
    this.status = status;
  }
}

export async function runAutoIngest(opts: RunAutoIngestOpts = {}): Promise<RunAutoIngestResult> {
  const { notes: notesIn, internalBaseUrl = null, adminKey } = opts;

  // ── Rate limit ───────────────────────────────────────────────────────
  const lastSnapshotResult = await pool.query(
    `SELECT created_at FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
  ).catch(() => ({ rows: [] as Array<{ created_at: string | Date }> }));

  if (lastSnapshotResult.rows.length > 0) {
    const lastCreated = new Date(lastSnapshotResult.rows[0].created_at as any);
    const secondsSince = (Date.now() - lastCreated.getTime()) / 1000;
    if (secondsSince < 30) {
      return { ok: true, rateLimited: true, secondsSinceLast: Math.round(secondsSince) };
    }
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    throw new RunAutoIngestError('ALCHEMY_API_KEY not configured', 500);
  }

  const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const primaryAxusd = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);
  const eulerAxusd = new ethers.Contract(EULER_AXUSD, ERC20_ABI, provider);

  const [
    primaryPsmUsdcRaw,
    eulerPsmUsdcRaw,
    canonicalPsmUsdcRaw,
    primaryAxusdSupplyRaw,
    eulerAxusdSupplyRaw,
    deployerEthRaw,
    deployerUsdcRaw,
    evkVaultAxusdRaw,
  ] = await Promise.all([
    usdc.balanceOf(ACTIVE_PSM),
    usdc.balanceOf(EULER_PSM),
    isCanonicalPsmDeployed() ? usdc.balanceOf(CANONICAL_PSM) : Promise.resolve(0n),
    primaryAxusd.totalSupply(),
    eulerAxusd.totalSupply(),
    provider.getBalance(DEPLOYER_ADDRESS),
    usdc.balanceOf(DEPLOYER_ADDRESS),
    isEvkVaultDeployed() ? primaryAxusd.balanceOf(EVK_OPEN_MARKET_VAULT_ADDRESS) : Promise.resolve(0n),
  ]);

  const primaryPsmUsdc = parseFloat(ethers.formatUnits(primaryPsmUsdcRaw, 6));
  const eulerPsmUsdc = parseFloat(ethers.formatUnits(eulerPsmUsdcRaw, 6));
  const canonicalPsmUsdc = parseFloat(ethers.formatUnits(canonicalPsmUsdcRaw, 6));
  const primaryAxusdSupply = parseFloat(ethers.formatUnits(primaryAxusdSupplyRaw, 18));
  const eulerAxusdSupply = parseFloat(ethers.formatUnits(eulerAxusdSupplyRaw, 18));
  const deployerEth = parseFloat(ethers.formatEther(deployerEthRaw));
  const deployerUsdc = parseFloat(ethers.formatUnits(deployerUsdcRaw, 6));
  const evkVaultAxusd = parseFloat(ethers.formatUnits(evkVaultAxusdRaw, 18));

  const canonicalAxusdInternalUsd = Math.round(evkVaultAxusd * 100) / 100;
  const canonicalAxusdExternalUsd = Math.max(
    0,
    Math.round((primaryAxusdSupply - evkVaultAxusd) * 100) / 100
  );

  let ethPrice = 2600;
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      signal: AbortSignal.timeout(5000),
    });
    const cgData: any = await cgRes.json();
    if (cgData?.ethereum?.usd) ethPrice = cgData.ethereum.usd;
  } catch {
    // Non-fatal — fall back to default ETH price.
  }

  const deployerEthUsd = Math.round(deployerEth * ethPrice * 100) / 100;
  const psmReservesTotal = Math.round((primaryPsmUsdc + eulerPsmUsdc + canonicalPsmUsdc) * 100) / 100;

  const VAULT_ABI_SIMPLE = ['function totalAssets() view returns (uint256)'];

  let evkVaultTvlAxusd = 0;
  if (isEvkVaultDeployed()) {
    try {
      const evkVault = new ethers.Contract(EVK_OPEN_MARKET_VAULT_ADDRESS, VAULT_ABI_SIMPLE, provider);
      const tvlRaw: bigint = await evkVault.totalAssets();
      evkVaultTvlAxusd = parseFloat(ethers.formatEther(tvlRaw));
    } catch {
      // Non-fatal
    }
  }

  let eulerEarnTvlAxusd = 0;
  if (isEulerEarnDeployed()) {
    try {
      const eulerEarnVault = new ethers.Contract(EULER_EARN_VAULT_ADDRESS, VAULT_ABI_SIMPLE, provider);
      const tvlRaw: bigint = await eulerEarnVault.totalAssets();
      eulerEarnTvlAxusd = parseFloat(ethers.formatUnits(tvlRaw, 6));
    } catch {
      // Non-fatal
    }
  }

  const EULERSWAP_POOL_ABI_LITE = [
    'function getReserves() view returns (uint256 reserve0, uint256 reserve1)',
    'function token0() view returns (address)',
  ];
  const AXUSD_ADDR_LOWER = '0xd6110f59a978ada6ef5c0e9d6baa04455d46ade7';
  let eulerSwapUsdcTvl = 0;
  let eulerSwapAxmTvl = 0;
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  if (isEulerSwapDeployed()) {
    if (EULER_SWAP_AXUSD_USDC_POOL_ADDRESS !== ZERO_ADDR) {
      try {
        const usdcPool = new ethers.Contract(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULERSWAP_POOL_ABI_LITE, provider);
        const [r, token0] = await Promise.all([usdcPool.getReserves(), usdcPool.token0()]);
        eulerSwapUsdcTvl = parseFloat(ethers.formatUnits(r[0], 6)) + parseFloat(ethers.formatUnits(r[1], 6));
        void token0;
      } catch {}
    }
    if (EULER_SWAP_AXUSD_AXM_POOL_ADDRESS !== ZERO_ADDR) {
      try {
        const axmPool = new ethers.Contract(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, EULERSWAP_POOL_ABI_LITE, provider);
        const [r, token0] = await Promise.all([axmPool.getReserves(), axmPool.token0()]);
        const isAxusdToken0 = (token0 as string).toLowerCase() === AXUSD_ADDR_LOWER;
        const axusdRaw = isAxusdToken0 ? r[0] : r[1];
        const axusdReserve = parseFloat(ethers.formatUnits(axusdRaw, 6));
        eulerSwapAxmTvl = axusdReserve * 2;
      } catch {}
    }
  }
  const eulerSwapTotalTvl = eulerSwapUsdcTvl + eulerSwapAxmTvl;

  const treasuryTotalUsd = Math.round((deployerEthUsd + deployerUsdc + psmReservesTotal) * 100) / 100;

  const liabilitiesGrossUsd = Math.round((primaryAxusdSupply + eulerAxusdSupply) * 100) / 100;
  const liabilitiesTotalUsd = liabilitiesGrossUsd;
  const liabilitiesExternalUsd = Math.round((canonicalAxusdExternalUsd + eulerAxusdSupply) * 100) / 100;

  const totalAssets = deployerEthUsd + deployerUsdc + psmReservesTotal;
  const safePct = (v: number) => totalAssets > 0 ? Math.round(v / totalAssets * 10000) / 100 : 0;
  const composition = [
    { label: 'ETH (Deployer)', valueUsd: deployerEthUsd, pct: safePct(deployerEthUsd) },
    { label: 'USDC (Canonical PSM)', valueUsd: Math.round(canonicalPsmUsdc * 100) / 100, pct: safePct(canonicalPsmUsdc) },
    { label: 'USDC (Legacy GENIUS PSM)', valueUsd: Math.round(primaryPsmUsdc * 100) / 100, pct: safePct(primaryPsmUsdc) },
    { label: 'USDC (Euler PSM)', valueUsd: Math.round(eulerPsmUsdc * 100) / 100, pct: safePct(eulerPsmUsdc) },
    { label: 'USDC (Deployer)', valueUsd: deployerUsdc, pct: safePct(deployerUsdc) },
  ].filter(c => c.valueUsd > 0);

  // ── Optional oracle enrichment ───────────────────────────────────────
  let axusdOraclePrice: number | null = null;
  let axusdOracleSource = 'pending_deployment';
  if (internalBaseUrl) {
    try {
      const oracleRes = await fetch(`${internalBaseUrl}/api/oracle/axusd-price`, {
        signal: AbortSignal.timeout(5000),
      });
      if (oracleRes.ok) {
        const oracleData = await oracleRes.json() as { axusdUsdPrice?: string; source?: string };
        if (oracleData.axusdUsdPrice) {
          axusdOraclePrice = parseFloat(oracleData.axusdUsdPrice);
          axusdOracleSource = oracleData.source ?? 'unknown';
        }
      }
    } catch {
      // Non-fatal — snapshot proceeds without oracle enrichment
    }
  }

  const now = new Date().toISOString();
  const payloadJson = {
    treasuryTotalUsd,
    treasuryLiquidUsd: treasuryTotalUsd,
    reservesTotalUsd: psmReservesTotal,
    liabilitiesTotalUsd,
    liabilitiesGrossUsd,
    liabilitiesExternalUsd,
    axusdLiquidity: {
      canonicalSupplyUsd: Math.round(primaryAxusdSupply * 100) / 100,
      canonicalInternalUsd: canonicalAxusdInternalUsd,
      canonicalExternalUsd: canonicalAxusdExternalUsd,
      eulerLegacySupplyUsd: Math.round(eulerAxusdSupply * 100) / 100,
      internalLiquidityVenue: {
        name: 'EVK Open Money Market (eAXUSD-6)',
        address: EVK_OPEN_MARKET_VAULT_ADDRESS,
        axusdHeld: evkVaultAxusd,
      },
      nettingBasis:
        'liabilitiesTotalUsd is the GROSS outstanding AXUSD (all consumers — metrics, AME, policy gates — read this). liabilitiesExternalUsd nets canonical AXUSD held in the deployer-controlled EVK Open Money Market vault, treating it as protocol-owned internal liquidity rather than external creditor exposure; surfaced on /disclosure for context only.',
    },
    lossBufferUsd: 0,
    policyMode: 'BOOTSTRAP',
    hardBrake: 'OFF',
    gateStatus: 'OPEN',
    composition,
    evkOpenMarket: {
      vaultAddress: EVK_OPEN_MARKET_VAULT_ADDRESS,
      deployed: isEvkVaultDeployed(),
      tvlAxusd: evkVaultTvlAxusd,
      status: isEvkVaultDeployed() ? 'LIVE' : 'PENDING_DEPLOYMENT',
      note: isEvkVaultDeployed()
        ? `EVK Open Money Market live — ${evkVaultTvlAxusd.toFixed(2)} AXUSD TVL`
        : 'EVK Open Money Market vault pending on-chain deployment (Task #38)',
    },
    eulerEarn: {
      vaultAddress: EULER_EARN_VAULT_ADDRESS,
      deployed: isEulerEarnDeployed(),
      tvlAxusd: eulerEarnTvlAxusd,
      strategies: ['Phase 6 Credit Market (40%)', 'EVK Open Money Market (40%)', 'T-Bill Reserve (20%)'],
      perfFeeBps: 1000,
      smearingPeriodDays: 14,
      status: isEulerEarnDeployed() ? 'LIVE' : 'PENDING_DEPLOYMENT',
      note: isEulerEarnDeployed()
        ? `Euler Earn AXUSD yield aggregation vault live — ${eulerEarnTvlAxusd.toFixed(2)} AXUSD TVL`
        : 'Euler Earn AXUSD vault pending on-chain deployment (Task #39)',
    },
    eulerSwap: {
      deployed: isEulerSwapDeployed(),
      pools: [
        {
          pair: 'AXUSD/USDC',
          address: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
          tvlUsd: eulerSwapUsdcTvl,
          status: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS !== ZERO_ADDR ? 'LIVE' : 'PENDING_DEPLOYMENT',
        },
        {
          pair: 'AXUSD/AXM',
          address: EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
          tvlUsd: eulerSwapAxmTvl,
          status: EULER_SWAP_AXUSD_AXM_POOL_ADDRESS !== ZERO_ADDR ? 'LIVE' : 'PENDING_DEPLOYMENT',
        },
      ],
      totalTvlUsd: eulerSwapTotalTvl,
      pegDepthUsd: eulerSwapUsdcTvl,
      status: isEulerSwapDeployed() ? 'LIVE' : 'PENDING_DEPLOYMENT',
      note: isEulerSwapDeployed()
        ? `EulerSwap AXUSD pools live — ${eulerSwapTotalTvl.toFixed(2)} USD TVL (peg depth: ${eulerSwapUsdcTvl.toFixed(2)} USD)`
        : 'EulerSwap AXUSD/USDC + AXUSD/AXM pools pending on-chain deployment (Task #40)',
    },
    oracle: {
      axusdUsdPrice: axusdOraclePrice,
      axusdOracleSource,
      oracleAddress: AXUSD_ORACLE_ADAPTER,
      oracleDeployed: isOracleDeployed(),
      standard: 'ERC-7726',
      note: isOracleDeployed()
        ? 'Price sourced from AXIOMOracleAdapter on-chain contract'
        : 'Oracle pending deployment — price sourced from PSM ratio or static parity',
    },
    sources: [
      { label: 'Arbitrum One RPC', detail: 'Live on-chain balance queries via Alchemy' },
      { label: 'CoinGecko', detail: `ETH/USD spot price: $${ethPrice}` },
      { label: 'Contract Registry', detail: 'activeContracts.generated.ts — PSM, deployer addresses' },
      { label: 'ERC-7726 Oracle', detail: axusdOraclePrice ? `AXUSD/USD: $${axusdOraclePrice.toFixed(6)} via ${axusdOracleSource}` : 'Oracle price unavailable' },
      { label: 'Euler Earn AXUSD', detail: isEulerEarnDeployed() ? `Multi-strategy vault live — ${eulerEarnTvlAxusd.toFixed(2)} AXUSD TVL` : 'Pending deployment (Task #39)' },
      { label: 'EulerSwap Pools', detail: isEulerSwapDeployed() ? `AXUSD/USDC + AXUSD/AXM live — ${eulerSwapTotalTvl.toFixed(2)} USD TVL, peg depth ${eulerSwapUsdcTvl.toFixed(2)} USD` : 'Pending deployment (Task #40)' },
    ],
  };

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solvency_snapshots (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      as_of_utc TIMESTAMP NOT NULL,
      payload_json JSONB NOT NULL,
      checksum TEXT NOT NULL,
      notes TEXT
    );
  `);

  const payloadStr = JSON.stringify(payloadJson);
  const checksum = crypto.createHash('sha256').update(payloadStr).digest('hex').slice(0, 16);
  const notes = notesIn || `Auto-ingest snapshot — ${now}`;

  const result = await pool.query(
    `INSERT INTO solvency_snapshots (id, created_at, as_of_utc, payload_json, checksum, notes)
     VALUES (gen_random_uuid(), NOW(), $1, $2::jsonb, $3, $4)
     RETURNING id, created_at, checksum`,
    [now, payloadStr, checksum, notes]
  );

  const row = result.rows[0];

  // ── Optional AME re-run ──────────────────────────────────────────────
  let ameRun = 'skipped';
  if (internalBaseUrl) {
    try {
      const ameRes = await fetch(`${internalBaseUrl}/api/solvency/ame/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || process.env.ADMIN_SOLVENCY_KEY || '',
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15_000),
      });
      const ameResult: any = await ameRes.json().catch(() => ({}));
      ameRun = ameResult?.dataStatus === 'ok' ? 'success' : (ameResult?.error || 'skipped');
    } catch (ameErr: any) {
      console.warn('[runAutoIngest] AME re-run warning:', ameErr?.message);
      ameRun = `error: ${ameErr?.message || 'unknown'}`;
    }
  }

  return {
    ok: true,
    rateLimited: false,
    snapshotId: row.id,
    checksum: row.checksum,
    createdAt: row.created_at,
    summary: {
      treasuryTotalUsd,
      psmReserves: psmReservesTotal,
      liabilities: liabilitiesTotalUsd,
      ethPrice,
    },
    ameRun,
  };
}
