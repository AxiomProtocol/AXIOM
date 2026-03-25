import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';
import crypto from 'crypto';
import {
  ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM,
  EVK_OPEN_MARKET_VAULT_ADDRESS, isEvkVaultDeployed,
  EULER_EARN_VAULT_ADDRESS, isEulerEarnDeployed,
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed,
} from '../../../src/config/activeContracts.generated';
import { AXUSD_ORACLE_ADAPTER, isOracleDeployed } from '../../../src/config/oracleConfig';
import { EULER_LENDING_CONTRACTS } from '../../../shared/contracts';

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

const INTERNAL_SECRET = process.env.AUTO_INGEST_SECRET || crypto.randomBytes(32).toString('hex');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  const providedKey = (req.headers['x-auto-ingest-key'] as string) || (req.query.key as string);
  const referer = (req.headers['referer'] || '') as string;
  const origin = (req.headers['origin'] || '') as string;
  const host = req.headers['host'] || '';
  const forwardedHost = req.headers['x-forwarded-host'] || '';
  const publicDomain = process.env.PUBLIC_DOMAIN || '';

  const trustedHosts = [host, forwardedHost, publicDomain, `www.${publicDomain}`].filter(Boolean);
  const requestSource = referer || origin;
  const isInternalCall = trustedHosts.some(h => requestSource.includes(h as string));
  const isAdminAuth = adminKey && providedKey && providedKey === adminKey;

  if (!isInternalCall && !isAdminAuth) {
    console.log('[auto-ingest] Auth failed:', { referer, origin, host, forwardedHost, publicDomain, trustedHosts });
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const lastSnapshotResult = await pool.query(
    `SELECT created_at FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
  ).catch(() => ({ rows: [] }));

  if (lastSnapshotResult.rows.length > 0) {
    const lastCreated = new Date(lastSnapshotResult.rows[0].created_at);
    const secondsSince = (Date.now() - lastCreated.getTime()) / 1000;
    if (secondsSince < 30) {
      return res.status(429).json({ success: false, error: `Rate limited. Last snapshot was ${Math.round(secondsSince)}s ago. Wait at least 30 seconds.` });
    }
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return res.status(500).json({ success: false, error: 'ALCHEMY_API_KEY not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const primaryAxusd = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);
    const eulerAxusd = new ethers.Contract(EULER_AXUSD, ERC20_ABI, provider);

    const [
      primaryPsmUsdcRaw,
      eulerPsmUsdcRaw,
      primaryAxusdSupplyRaw,
      eulerAxusdSupplyRaw,
      deployerEthRaw,
      deployerUsdcRaw,
    ] = await Promise.all([
      usdc.balanceOf(ACTIVE_PSM),
      usdc.balanceOf(EULER_PSM),
      primaryAxusd.totalSupply(),
      eulerAxusd.totalSupply(),
      provider.getBalance(DEPLOYER_ADDRESS),
      usdc.balanceOf(DEPLOYER_ADDRESS),
    ]);

    const primaryPsmUsdc = parseFloat(ethers.formatUnits(primaryPsmUsdcRaw, 6));
    const eulerPsmUsdc = parseFloat(ethers.formatUnits(eulerPsmUsdcRaw, 6));
    const primaryAxusdSupply = parseFloat(ethers.formatUnits(primaryAxusdSupplyRaw, 18));
    const eulerAxusdSupply = parseFloat(ethers.formatUnits(eulerAxusdSupplyRaw, 18));
    const deployerEth = parseFloat(ethers.formatEther(deployerEthRaw));
    const deployerUsdc = parseFloat(ethers.formatUnits(deployerUsdcRaw, 6));

    let ethPrice = 2600;
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const cgData = await cgRes.json();
      if (cgData?.ethereum?.usd) ethPrice = cgData.ethereum.usd;
    } catch {}

    const deployerEthUsd = Math.round(deployerEth * ethPrice * 100) / 100;
    const psmReservesTotal = Math.round((primaryPsmUsdc + eulerPsmUsdc) * 100) / 100;

    const VAULT_ABI_SIMPLE = ['function totalAssets() view returns (uint256)'];

    // ── EVK Open Market vault TVL (Task #38) ─────────────────────────────────
    // Reports zero when vault is PENDING_DEPLOYMENT; updates automatically after deploy.
    let evkVaultTvlAxusd = 0;
    if (isEvkVaultDeployed()) {
      try {
        const evkVault = new ethers.Contract(EVK_OPEN_MARKET_VAULT_ADDRESS, VAULT_ABI_SIMPLE, provider);
        const tvlRaw: bigint = await evkVault.totalAssets();
        evkVaultTvlAxusd = parseFloat(ethers.formatEther(tvlRaw));
      } catch {
        // Non-fatal — EVK vault may be in initialization state
      }
    }

    // ── Euler Earn AXUSD vault TVL (Task #39) ────────────────────────────────
    // Multi-strategy yield aggregation vault. Reports zero until on-chain deploy.
    let eulerEarnTvlAxusd = 0;
    if (isEulerEarnDeployed()) {
      try {
        const eulerEarnVault = new ethers.Contract(EULER_EARN_VAULT_ADDRESS, VAULT_ABI_SIMPLE, provider);
        const tvlRaw: bigint = await eulerEarnVault.totalAssets();
        eulerEarnTvlAxusd = parseFloat(ethers.formatUnits(tvlRaw, 6));
      } catch {
        // Non-fatal — Euler Earn vault may be in initialization state
      }
    }

    // ── EulerSwap AXUSD Liquidity Layer (Task #40) ───────────────────────────
    // Dual-yield AMM pools (swap fees + EVK vault lending yield).
    // Peg stability signal: pool depth as primary liquidity metric.
    const EULERSWAP_RESERVES_ABI = ['function getReserves() view returns (uint256 reserve0, uint256 reserve1)'];
    let eulerSwapUsdcTvl = 0;
    let eulerSwapAxmTvl  = 0;
    const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
    if (isEulerSwapDeployed()) {
      if (EULER_SWAP_AXUSD_USDC_POOL_ADDRESS !== ZERO_ADDR) {
        try {
          const usdcPool = new ethers.Contract(EULER_SWAP_AXUSD_USDC_POOL_ADDRESS, EULERSWAP_RESERVES_ABI, provider);
          const r = await usdcPool.getReserves();
          eulerSwapUsdcTvl = parseFloat(ethers.formatUnits(r[0], 6)) + parseFloat(ethers.formatUnits(r[1], 6));
        } catch {}
      }
      if (EULER_SWAP_AXUSD_AXM_POOL_ADDRESS !== ZERO_ADDR) {
        try {
          const axmPool = new ethers.Contract(EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, EULERSWAP_RESERVES_ABI, provider);
          const r = await axmPool.getReserves();
          eulerSwapAxmTvl = parseFloat(ethers.formatUnits(r[0], 6)) + parseFloat(ethers.formatUnits(r[1], 6));
        } catch {}
      }
    }
    const eulerSwapTotalTvl = eulerSwapUsdcTvl + eulerSwapAxmTvl;

    const treasuryTotalUsd = Math.round((deployerEthUsd + deployerUsdc + psmReservesTotal) * 100) / 100;
    const liabilitiesTotalUsd = Math.round((primaryAxusdSupply + eulerAxusdSupply) * 100) / 100;

    const totalAssets = deployerEthUsd + deployerUsdc + psmReservesTotal;
    const composition = [
      { label: 'ETH (Deployer)', valueUsd: deployerEthUsd, pct: Math.round(deployerEthUsd / totalAssets * 10000) / 100 },
      { label: 'USDC (PSM)', valueUsd: psmReservesTotal, pct: Math.round(psmReservesTotal / totalAssets * 10000) / 100 },
      { label: 'USDC (Deployer)', valueUsd: deployerUsdc, pct: Math.round(deployerUsdc / totalAssets * 10000) / 100 },
    ].filter(c => c.valueUsd > 0);

    // ── ERC-7726 Oracle price enrichment ────────────────────────────────────
    // Use a fixed internal base URL to prevent SSRF via Host header manipulation.
    // Server-to-server internal calls always target the same process on port 5000.
    const INTERNAL_BASE = process.env.INTERNAL_API_BASE_URL || 'http://localhost:5000';
    let axusdOraclePrice: number | null = null;
    let axusdOracleSource = 'pending_deployment';
    try {
      const oracleRes = await fetch(`${INTERNAL_BASE}/api/oracle/axusd-price`, {
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
      // Non-fatal — solvency snapshot proceeds without oracle enrichment
    }

    const now = new Date().toISOString();
    const payloadJson = {
      treasuryTotalUsd,
      treasuryLiquidUsd: treasuryTotalUsd,
      reservesTotalUsd: psmReservesTotal,
      liabilitiesTotalUsd,
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
    const notes = req.body?.notes || `Auto-ingest after PSM operation — ${now}`;

    const result = await pool.query(
      `INSERT INTO solvency_snapshots (id, created_at, as_of_utc, payload_json, checksum, notes)
       VALUES (gen_random_uuid(), NOW(), $1, $2::jsonb, $3, $4)
       RETURNING id, created_at, checksum`,
      [now, payloadStr, checksum, notes]
    );

    const row = result.rows[0];

    let ameResult = null;
    try {
      const ameRes = await fetch(`${INTERNAL_BASE}/api/solvency/ame/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.ADMIN_SOLVENCY_KEY || '',
        },
        body: JSON.stringify({}),
      });
      ameResult = await ameRes.json();
    } catch (ameErr: any) {
      console.warn('[auto-ingest] AME auto-run warning:', ameErr.message);
    }

    return res.status(201).json({
      success: true,
      snapshotId: row.id,
      checksum: row.checksum,
      createdAt: row.created_at,
      summary: {
        treasuryTotalUsd,
        psmReserves: psmReservesTotal,
        liabilities: liabilitiesTotalUsd,
        ethPrice,
      },
      ameRun: ameResult?.dataStatus === 'ok' ? 'success' : (ameResult?.error || 'skipped'),
    });
  } catch (err: any) {
    console.error('[solvency/auto-ingest] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Auto-ingest failed' });
  }
}
