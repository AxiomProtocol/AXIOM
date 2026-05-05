/**
 * /api/observer/reserve-assets
 *
 * Aggregates live on-chain balances and mark prices for all protocol reserve
 * assets on Arbitrum One.
 *
 * Balance sources (canonical, per spec):
 *   ETH   — deployer EOA native balance (eth_getBalance)
 *   PAXG  — BitGoTreasuryExtension.getReserveAssetBalances() (custodian-reported)
 *   AXAU  — AXAUFulfillmentService.getVaultBuffer() (fulfillment buffer, Chainlink XAU price)
 *   AXM   — TREASURY_REVENUE + STAKING_EMISSIONS ERC-20 balanceOf on Arbitrum One
 *   USDC  — canonical PSM + legacy PSM + backstop vault + deployer EOA (4 sources)
 *   AXUSD — TREASURY_REVENUE ERC-20 balanceOf on Arbitrum One
 *
 * Price sources:
 *   ETH   — CoinGecko free API (ethereum/usd + 24h change)
 *   PAXG  — Chainlink XAU/USD oracle on Arbitrum One (via getVaultBuffer)
 *   AXAU  — Chainlink XAU/USD oracle on Arbitrum One (same as PAXG; backing price)
 *   AXM   — On-chain EulerSwap pool reserve ratio (AXUSD/AXM)
 *   USDC  — $1.00 stable peg (no oracle)
 *   AXUSD — $1.00 stable peg (no oracle)
 *
 * 30-day sparkline data:
 *   ETH / PAXG — Alchemy Historical Prices API (1d interval)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { CANONICAL_PSM, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed } from '../../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES } from '../../../lib/services/AXAUContractService';
import { bitGoTreasuryExtension } from '../../../lib/services/BitGoTreasuryExtension';
import { getVaultBuffer } from '../../../lib/services/AXAUFulfillmentService';

const DEPLOYER_ADDRESS  = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const PAXG_ARBITRUM     = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXM_ADDRESS       = CORE_CONTRACTS.AXM_TOKEN;
const AXUSD_ADDRESS     = ERC3643_CONTRACTS.AXUSD_TOKEN;
const AXAU_ADDRESS      = AXAU_ADDRESSES.AXAUTokenLite3643;
const USDC_ADDRESS      = STABLECOINS.USDC;

const ALCHEMY_KEY   = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC  = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';
const ZERO          = '0x0000000000000000000000000000000000000000';
const AXM_LC        = AXM_ADDRESS.toLowerCase();

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const POOL_ABI  = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function getAssets() view returns (address,address)',
];

// ─── Price feeds ─────────────────────────────────────────────────────────────

interface CgPrices {
  ethUsd: number | null;
  eth24hPct: number | null;
  xauUsd: number | null;
  xau24hPct: number | null;
}

async function fetchCoinGeckoPrices(): Promise<CgPrices> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true';
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ethUsd: null, eth24hPct: null, xauUsd: null, xau24hPct: null };
    const json = await res.json() as {
      ethereum?: { usd?: number; usd_24h_change?: number };
      'pax-gold'?: { usd?: number; usd_24h_change?: number };
    };
    return {
      ethUsd:   json.ethereum?.usd ?? null,
      eth24hPct: json.ethereum?.usd_24h_change ?? null,
      xauUsd:   json['pax-gold']?.usd ?? null,
      xau24hPct: json['pax-gold']?.usd_24h_change ?? null,
    };
  } catch {
    return { ethUsd: null, eth24hPct: null, xauUsd: null, xau24hPct: null };
  }
}

async function fetchAxmPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  const poolAddr = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || !poolAddr || poolAddr === ZERO) return null;
  try {
    const pool     = new ethers.Contract(poolAddr, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);
    const asset0Lower  = (assets[0] as string).toLowerCase();
    const axmIsAsset0  = asset0Lower === AXM_LC;
    const axmReserve   = Number(ethers.formatUnits(axmIsAsset0 ? reserves[0] : reserves[1], 18));
    const axusdReserve = Number(ethers.formatUnits(axmIsAsset0 ? reserves[1] : reserves[0], 18));
    if (axmReserve <= 0) return null;
    return axusdReserve / axmReserve;
  } catch {
    return null;
  }
}

async function fetchSparkline(symbol: string, days = 30): Promise<number[] | null> {
  if (!ALCHEMY_KEY) return null;
  try {
    const endTime   = new Date().toISOString();
    const startTime = new Date(Date.now() - days * 86_400_000).toISOString();
    const params    = new URLSearchParams({ symbol, startTime, endTime, interval: '1d' });
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}/tokens/historical?${params}`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { data?: { history?: Array<{ value: string }> } };
    const history = json.data?.history ?? [];
    const prices  = history.map((h) => parseFloat(h.value)).filter((v) => !isNaN(v) && v > 0);
    return prices.length >= 2 ? prices : null;
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBal(n: number, decimals = 6): string {
  return n.toFixed(decimals);
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function arbiUrl(addr: string): string {
  return `https://arbiscan.io/address/${addr}`;
}

function change24hUsd(price: number | null, pct: number | null): string | null {
  if (price === null || pct === null) return null;
  return (price * pct / 100).toFixed(2);
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface PriceMovingAsset {
  symbol: string;
  label: string;
  balance: string;
  balanceSource: string;
  price: string | null;
  price24hChangePct: string | null;
  price24hChangeUsd: string | null;
  valueUsd: string | null;
  priceSource: string;
  priceHistoryNote: string | null;
  location: string;
  contracts: string[];
  arbiscanUrls: string[];
  sparkline: number[] | null;
}

export interface StableLocationRow {
  label: string;
  contract: string;
  balance: string;
  arbiscanUrl: string;
}

export interface StableAsset {
  symbol: string;
  label: string;
  totalBalance: string;
  totalValueUsd: string;
  locationBreakdown: StableLocationRow[];
}

export interface ReserveAssetsResponse {
  success: boolean;
  priceMov: PriceMovingAsset[];
  stable: StableAsset[];
  totals: {
    totalValueUsd: string;
    coverageRatio: string | null;
    coverageRatioPct: string | null;
    coverageNote: string;
  };
  deployer: string;
  timestamp: string;
  error?: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

const EMPTY_RESPONSE: Omit<ReserveAssetsResponse, 'timestamp' | 'error'> = {
  success: false,
  priceMov: [],
  stable: [],
  totals: { totalValueUsd: '0.00', coverageRatio: null, coverageRatioPct: null, coverageNote: '' },
  deployer: DEPLOYER_ADDRESS,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReserveAssetsResponse>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      ...EMPTY_RESPONSE,
      timestamp: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const axm   = new ethers.Contract(AXM_ADDRESS, ERC20_ABI, provider);
    const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
    const axauT = new ethers.Contract(AXAU_ADDRESS, ERC20_ABI, provider);
    const usdc  = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    // Kick off all data fetches in parallel
    const [
      cgPrices,
      axmPrice,
      vault,
      bitgo,
      ethBalanceRaw,
      axmTreasuryRaw,
      axmStakingRaw,
      axusdTreasuryRaw,
      usdcCanonicalRaw,
      usdcLegacyRaw,
      usdcBackstopRaw,
      usdcDeployerRaw,
      axauDeployerFallbackRaw,
      ethSparkline,
      paxgSparkline,
    ] = await Promise.all([
      fetchCoinGeckoPrices(),
      fetchAxmPrice(provider),
      getVaultBuffer().catch(() => null),
      bitGoTreasuryExtension.getReserveAssetBalances().catch(() => null),
      provider.getBalance(DEPLOYER_ADDRESS).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.STAKING_EMISSIONS).catch(() => 0n),
      axusd.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      usdc.balanceOf(CANONICAL_PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => 0n),
      usdc.balanceOf(DEPLOYER_ADDRESS).catch(() => 0n),
      axauT.balanceOf(DEPLOYER_ADDRESS).catch(() => 0n),
      fetchSparkline('WETH', 30),
      fetchSparkline('PAXG', 30),
    ]);

    // ── ETH ───────────────────────────────────────────────────────────────
    const ethBal      = Number(ethers.formatEther(ethBalanceRaw as bigint));
    const ethPrice    = cgPrices.ethUsd;
    const eth24hPct   = cgPrices.eth24hPct;
    const ethValue    = ethPrice !== null ? ethBal * ethPrice : null;

    // ── PAXG ──────────────────────────────────────────────────────────────
    // Balance: BitGo custodian (canonical) → vault deployer wallet (fallback)
    const bitgoPaxg = (bitgo?.positions ?? []).find(p => p.assetSymbol === 'PAXG');
    const paxgBal   = bitgoPaxg && bitgoPaxg.quantity > 0
      ? bitgoPaxg.quantity
      : (vault ? parseFloat(vault.paxgBalanceFormatted) : 0);
    const paxgBalSource = bitgoPaxg && bitgoPaxg.quantity > 0
      ? 'BitGo CaaS (custodian-reported)'
      : 'Deployer EOA on-chain balance (BitGo unavailable)';

    // Price: Chainlink XAU/USD via vault buffer → CoinGecko pax-gold fallback
    const xauPrice  = vault ? parseFloat(vault.xauUsdPrice) : (cgPrices.xauUsd ?? null);
    const xau24hPct = cgPrices.xau24hPct;
    const paxgValue = xauPrice !== null ? paxgBal * xauPrice : null;

    // ── AXAU ──────────────────────────────────────────────────────────────
    // Balance: vault buffer (deployer fulfillment buffer) → direct on-chain fallback
    const axauBal = vault
      ? parseFloat(vault.axauBalanceFormatted)
      : Number(ethers.formatUnits(axauDeployerFallbackRaw as bigint, 18));
    const axauBalSource = vault
      ? 'AXAUFulfillmentService.getVaultBuffer() (deployer buffer)'
      : 'Deployer EOA on-chain balanceOf (getVaultBuffer unavailable)';
    const axauValue = xauPrice !== null ? axauBal * xauPrice : null;

    // ── AXM ───────────────────────────────────────────────────────────────
    const axmTreasury = Number(ethers.formatUnits(axmTreasuryRaw as bigint, 18));
    const axmStaking  = Number(ethers.formatUnits(axmStakingRaw as bigint, 18));
    const axmTotal    = axmTreasury + axmStaking;
    const axmValue    = axmPrice !== null ? axmTotal * axmPrice : null;

    // ── USDC ──────────────────────────────────────────────────────────────
    const usdcCanonical = Number(ethers.formatUnits(usdcCanonicalRaw as bigint, 6));
    const usdcLegacy    = Number(ethers.formatUnits(usdcLegacyRaw as bigint, 6));
    const usdcBackstop  = Number(ethers.formatUnits(usdcBackstopRaw as bigint, 6));
    const usdcDeployer  = Number(ethers.formatUnits(usdcDeployerRaw as bigint, 6));
    const usdcTotal     = usdcCanonical + usdcLegacy + usdcBackstop + usdcDeployer;

    // ── AXUSD ─────────────────────────────────────────────────────────────
    const axusdTreasury = Number(ethers.formatUnits(axusdTreasuryRaw as bigint, 18));

    // ── Totals ────────────────────────────────────────────────────────────
    const knownValues    = [ethValue, paxgValue, axauValue, axmValue, usdcTotal, axusdTreasury]
      .filter((v): v is number => v !== null);
    const totalValueUsd  = knownValues.reduce((a, b) => a + b, 0);

    const hardAssets     = [ethValue, paxgValue, axauValue, usdcTotal].filter((v): v is number => v !== null);
    const totalHard      = hardAssets.reduce((a, b) => a + b, 0);
    const coverageRatio  = axusdTreasury > 0 ? totalHard / axusdTreasury : null;

    // ── Build response ────────────────────────────────────────────────────
    const priceMov: PriceMovingAsset[] = [
      {
        symbol:           'ETH',
        label:            'Ethereum',
        balance:          fmtBal(ethBal, 6),
        balanceSource:    'Deployer EOA native balance (eth_getBalance)',
        price:            ethPrice !== null ? fmtBal(ethPrice, 2) : null,
        price24hChangePct: eth24hPct !== null ? eth24hPct.toFixed(2) : null,
        price24hChangeUsd: change24hUsd(ethPrice, eth24hPct),
        valueUsd:         ethValue !== null ? fmtUsd(ethValue) : null,
        priceSource:      'CoinGecko (ethereum/usd)',
        priceHistoryNote: ethSparkline ? null : 'Historical chart sourced from Alchemy Historical Prices API',
        location:         'Deployer EOA',
        contracts:        [DEPLOYER_ADDRESS],
        arbiscanUrls:     [arbiUrl(DEPLOYER_ADDRESS)],
        sparkline:        ethSparkline,
      },
      {
        symbol:           'PAXG',
        label:            'PAX Gold',
        balance:          fmtBal(paxgBal, 6),
        balanceSource:    paxgBalSource,
        price:            xauPrice !== null ? fmtBal(xauPrice, 2) : null,
        price24hChangePct: xau24hPct !== null ? xau24hPct.toFixed(2) : null,
        price24hChangeUsd: change24hUsd(xauPrice, xau24hPct),
        valueUsd:         paxgValue !== null ? fmtUsd(paxgValue) : null,
        priceSource:      vault
          ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)'
          : 'CoinGecko pax-gold/usd (Chainlink fallback)',
        priceHistoryNote: paxgSparkline ? null : '30-day chart sourced from Alchemy Historical Prices API (PAXG symbol)',
        location:         'BitGo CaaS Custody',
        contracts:        [DEPLOYER_ADDRESS, PAXG_ARBITRUM],
        arbiscanUrls:     [arbiUrl(DEPLOYER_ADDRESS), arbiUrl(PAXG_ARBITRUM)],
        sparkline:        paxgSparkline,
      },
      {
        symbol:           'AXAU',
        label:            'AXAU — Gold Reserve Instrument',
        balance:          fmtBal(axauBal, 6),
        balanceSource:    axauBalSource,
        price:            xauPrice !== null ? fmtBal(xauPrice, 2) : null,
        price24hChangePct: xau24hPct !== null ? xau24hPct.toFixed(2) : null,
        price24hChangeUsd: change24hUsd(xauPrice, xau24hPct),
        valueUsd:         axauValue !== null ? fmtUsd(axauValue) : null,
        priceSource:      vault
          ? 'Chainlink XAU/USD · Arbitrum One (backing price, via getVaultBuffer)'
          : 'CoinGecko pax-gold/usd (Chainlink fallback)',
        priceHistoryNote: paxgSparkline ? null : '30-day chart uses XAU/USD proxy (PAXG = 1 troy oz gold)',
        location:         'Deployer EOA (fulfillment buffer)',
        contracts:        [DEPLOYER_ADDRESS, AXAU_ADDRESS],
        arbiscanUrls:     [arbiUrl(DEPLOYER_ADDRESS), arbiUrl(AXAU_ADDRESS)],
        sparkline:        paxgSparkline,
      },
      {
        symbol:           'AXM',
        label:            'Axiom Governance Token',
        balance:          fmtBal(axmTotal, 4),
        balanceSource:    'Treasury Revenue + Staking Emissions ERC-20 balanceOf',
        price:            axmPrice !== null ? axmPrice.toFixed(6) : null,
        price24hChangePct: null,
        price24hChangeUsd: null,
        valueUsd:         axmValue !== null ? fmtUsd(axmValue) : null,
        priceSource:      'On-chain EulerSwap pool reserve ratio (AXUSD/AXM) — spot price only, no oracle',
        priceHistoryNote: 'AXM is not listed on any public price index (CoinGecko, Alchemy, etc.). 24h change and 30-day sparkline are unavailable. Spot price is derived from the live AXUSD/AXM EulerSwap pool reserve ratio and reflects the current on-chain exchange rate only.',
        location:         'Treasury Revenue + Staking Emissions',
        contracts:        [CORE_CONTRACTS.TREASURY_REVENUE, CORE_CONTRACTS.STAKING_EMISSIONS],
        arbiscanUrls:     [arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE), arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS)],
        sparkline:        null,
      },
    ];

    const stable: StableAsset[] = [
      {
        symbol:       'USDC',
        label:        'USD Coin — Aggregated Reserve',
        totalBalance: fmtBal(usdcTotal, 2),
        totalValueUsd: fmtUsd(usdcTotal),
        locationBreakdown: [
          {
            label:       'Canonical PSM (ERC-3643)',
            contract:    CANONICAL_PSM,
            balance:     fmtBal(usdcCanonical, 6),
            arbiscanUrl: arbiUrl(CANONICAL_PSM),
          },
          {
            label:       'Legacy PSM / GENIUS (Migrating)',
            contract:    AXUSD_GENIUS_CONTRACTS.PSM,
            balance:     fmtBal(usdcLegacy, 6),
            arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.PSM),
          },
          {
            label:       'Backstop Vault USDC',
            contract:    AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
            balance:     fmtBal(usdcBackstop, 6),
            arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC),
          },
          {
            label:       'Deployer EOA',
            contract:    DEPLOYER_ADDRESS,
            balance:     fmtBal(usdcDeployer, 6),
            arbiscanUrl: arbiUrl(DEPLOYER_ADDRESS),
          },
        ],
      },
      {
        symbol:       'AXUSD',
        label:        'Axiom USD — Treasury Holding',
        totalBalance: fmtBal(axusdTreasury, 2),
        totalValueUsd: fmtUsd(axusdTreasury),
        locationBreakdown: [
          {
            label:       'Treasury Revenue Contract',
            contract:    CORE_CONTRACTS.TREASURY_REVENUE,
            balance:     fmtBal(axusdTreasury, 6),
            arbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
          },
        ],
      },
    ];

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      priceMov,
      stable,
      totals: {
        totalValueUsd:    fmtUsd(totalValueUsd),
        coverageRatio:    coverageRatio !== null ? coverageRatio.toFixed(4) : null,
        coverageRatioPct: coverageRatio !== null ? (coverageRatio * 100).toFixed(2) : null,
        coverageNote:     'Hard-asset collateral (ETH + PAXG + AXAU + USDC) / AXUSD treasury holding',
      },
      deployer:  DEPLOYER_ADDRESS,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[reserve-assets] error:', error?.message);
    return res.status(500).json({
      ...EMPTY_RESPONSE,
      timestamp: new Date().toISOString(),
      error: error?.message ?? 'Failed to fetch reserve assets',
    });
  }
}
