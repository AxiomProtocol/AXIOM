/**
 * /api/observer/reserve-assets
 *
 * Aggregates live on-chain balances and mark prices for all protocol reserve
 * assets held by the deployer EOA and treasury contracts on Arbitrum One.
 *
 * Assets tracked:
 *   ETH   — deployer wallet native balance
 *   PAXG  — deployer wallet ERC-20 balance (gold-backed)
 *   AXAU  — deployer wallet ERC-20 balance (gold-backed instrument)
 *   AXM   — treasury + staking contract ERC-20 holdings
 *   USDC  — canonical PSM + legacy PSM + backstop vault aggregated
 *   AXUSD — treasury revenue contract ERC-20 balance
 *
 * Prices:
 *   ETH   → Alchemy Prices API (by-symbol WETH)
 *   PAXG  → Chainlink XAU/USD on Arbitrum One
 *   AXAU  → Chainlink XAU/USD (AXAU is gold-collateralised)
 *   AXM   → On-chain EulerSwap pool reserve ratio (AXUSD/AXM)
 *   USDC  → $1.00 stable (peg)
 *   AXUSD → $1.00 stable (peg)
 *
 * Sparkline data (30-day daily close):
 *   ETH / PAXG — Alchemy historical prices endpoint
 *   Others     — not available, omitted
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { CANONICAL_PSM, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed } from '../../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES } from '../../../lib/services/AXAUContractService';

const DEPLOYER_ADDRESS = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const PAXG_ARBITRUM    = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const CHAINLINK_XAU    = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';
const AXM_ADDRESS      = CORE_CONTRACTS.AXM_TOKEN;
const AXUSD_ADDRESS    = ERC3643_CONTRACTS.AXUSD_TOKEN;
const AXAU_ADDRESS     = AXAU_ADDRESSES.AXAUTokenLite3643;
const USDC_ADDRESS     = STABLECOINS.USDC;

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
  'function decimals() view returns (uint8)',
];

const POOL_ABI = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function getAssets() view returns (address,address)',
];

const ZERO = '0x0000000000000000000000000000000000000000';
const AXM_LC   = AXM_ADDRESS.toLowerCase();
const AXUSD_LC = AXUSD_ADDRESS.toLowerCase();

async function fetchXauPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  try {
    const oracle = new ethers.Contract(CHAINLINK_XAU, CHAINLINK_ABI, provider);
    const [round, decimals] = await Promise.all([oracle.latestRoundData(), oracle.decimals()]);
    return Number(round[1]) / 10 ** Number(decimals);
  } catch {
    return null;
  }
}

const WETH_ARBITRUM = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

async function fetchEthPrice(): Promise<number | null> {
  if (!ALCHEMY_KEY) return null;

  function extractPrice(json: { data?: Array<{ prices?: Array<{ currency: string; value: string }> }> }): number | null {
    const entry    = json.data?.[0];
    const usdEntry = entry?.prices?.find((p) => p.currency === 'usd') ?? entry?.prices?.[0];
    if (!usdEntry?.value) return null;
    const v = parseFloat(usdEntry.value);
    return isNaN(v) || v <= 0 ? null : v;
  }

  try {
    const bySymbol = await fetch(
      `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}/tokens/by-symbol?symbols[]=WETH`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
    );
    if (bySymbol.ok) {
      const json = await bySymbol.json();
      const price = extractPrice(json);
      if (price !== null) return price;
    }
  } catch { /* fall through to by-address */ }

  try {
    const byAddr = await fetch(
      `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}/tokens/by-address?contractAddresses[]=${WETH_ARBITRUM}`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
    );
    if (!byAddr.ok) return null;
    const json = await byAddr.json();
    return extractPrice(json);
  } catch {
    return null;
  }
}

async function fetchAxmPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  const poolAddr = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || !poolAddr || poolAddr === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);
    const asset0Lower = (assets[0] as string).toLowerCase();
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
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;
    const json = await res.json() as { data?: { history?: Array<{ value: string }> } };
    const history = json.data?.history ?? [];
    return history.map((h) => parseFloat(h.value)).filter((v) => !isNaN(v) && v > 0);
  } catch {
    return null;
  }
}

function fmt(n: number, decimals = 6): string {
  return n.toFixed(decimals);
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface ReserveAsset {
  symbol: string;
  label: string;
  balance: string;
  balanceDecimals: number;
  price: string | null;
  valueUsd: string | null;
  priceSource: string;
  location: string;
  contracts: string[];
  arbiscanUrls: string[];
  sparkline: number[] | null;
}

export interface ReserveAssetsResponse {
  success: boolean;
  assets: ReserveAsset[];
  totals: {
    totalValueUsd: string;
    axusdSupply: string;
    axusdTreasuryHolding: string;
    coverageRatio: string | null;
    coverageRatioPct: string | null;
  };
  deployer: string;
  timestamp: string;
  error?: string;
}

function arbiUrl(addr: string): string {
  return `https://arbiscan.io/address/${addr}`;
}
function txUrl(tx: string): string {
  return `https://arbiscan.io/tx/${tx}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReserveAssetsResponse>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      assets: [],
      totals: { totalValueUsd: '0', axusdSupply: '0', axusdTreasuryHolding: '0', coverageRatio: null, coverageRatioPct: null },
      deployer: DEPLOYER_ADDRESS,
      timestamp: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const paxg    = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);
    const axau    = new ethers.Contract(AXAU_ADDRESS, ERC20_ABI, provider);
    const axm     = new ethers.Contract(AXM_ADDRESS, ERC20_ABI, provider);
    const axusd   = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
    const usdc    = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const [
      ethBalanceRaw,
      paxgDeployerRaw,
      axauDeployerRaw,
      axmTreasuryRaw,
      axmStakingRaw,
      axusdTreasuryRaw,
      usdcCanonicalRaw,
      usdcLegacyRaw,
      usdcBackstopRaw,
      xauPrice,
      ethPrice,
      axmPrice,
      ethSparkline,
      paxgSparkline,
    ] = await Promise.all([
      provider.getBalance(DEPLOYER_ADDRESS).catch(() => 0n),
      paxg.balanceOf(DEPLOYER_ADDRESS).catch(() => 0n),
      axau.balanceOf(DEPLOYER_ADDRESS).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.STAKING_EMISSIONS).catch(() => 0n),
      axusd.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      usdc.balanceOf(CANONICAL_PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => 0n),
      fetchXauPrice(provider),
      fetchEthPrice(),
      fetchAxmPrice(provider),
      fetchSparkline('WETH', 30),
      fetchSparkline('PAXG', 30),
    ]);

    const ethBal      = Number(ethers.formatEther(ethBalanceRaw as bigint));
    const paxgBal     = Number(ethers.formatUnits(paxgDeployerRaw as bigint, 18));
    const axauBal     = Number(ethers.formatUnits(axauDeployerRaw as bigint, 18));
    const axmTreasury = Number(ethers.formatUnits(axmTreasuryRaw as bigint, 18));
    const axmStaking  = Number(ethers.formatUnits(axmStakingRaw as bigint, 18));
    const axmTotal    = axmTreasury + axmStaking;
    const axusdTreasury = Number(ethers.formatUnits(axusdTreasuryRaw as bigint, 18));
    const usdcCanonical = Number(ethers.formatUnits(usdcCanonicalRaw as bigint, 6));
    const usdcLegacy    = Number(ethers.formatUnits(usdcLegacyRaw as bigint, 6));
    const usdcBackstop  = Number(ethers.formatUnits(usdcBackstopRaw as bigint, 6));
    const usdcTotal     = usdcCanonical + usdcLegacy + usdcBackstop;

    const ethValue  = ethPrice  !== null ? ethBal  * ethPrice  : null;
    const paxgValue = xauPrice  !== null ? paxgBal * xauPrice  : null;
    const axauValue = xauPrice  !== null ? axauBal * xauPrice  : null;
    const axmValue  = axmPrice  !== null ? axmTotal * axmPrice : null;
    const usdcValue = usdcTotal;
    const axusdValue = axusdTreasury;

    const knownValues = [ethValue, paxgValue, axauValue, axmValue, usdcValue, axusdValue]
      .filter((v): v is number => v !== null);
    const totalValueUsd = knownValues.reduce((a, b) => a + b, 0);

    const coverageAssets = [ethValue, paxgValue, axauValue, usdcValue].filter((v): v is number => v !== null);
    const totalCoverage  = coverageAssets.reduce((a, b) => a + b, 0);

    const axusdTotalSupplyApprox = axusdTreasury;
    const coverageRatio = axusdTotalSupplyApprox > 0 ? totalCoverage / axusdTotalSupplyApprox : null;

    const assets: ReserveAsset[] = [
      {
        symbol: 'ETH',
        label: 'Ethereum',
        balance: fmt(ethBal, 6),
        balanceDecimals: 18,
        price: ethPrice !== null ? fmt(ethPrice, 2) : null,
        valueUsd: ethValue !== null ? fmtUsd(ethValue) : null,
        priceSource: 'Alchemy Prices API',
        location: 'Deployer EOA',
        contracts: [DEPLOYER_ADDRESS],
        arbiscanUrls: [arbiUrl(DEPLOYER_ADDRESS)],
        sparkline: ethSparkline,
      },
      {
        symbol: 'PAXG',
        label: 'PAX Gold',
        balance: fmt(paxgBal, 6),
        balanceDecimals: 18,
        price: xauPrice !== null ? fmt(xauPrice, 2) : null,
        valueUsd: paxgValue !== null ? fmtUsd(paxgValue) : null,
        priceSource: 'Chainlink XAU/USD · Arbitrum One',
        location: 'Deployer EOA',
        contracts: [DEPLOYER_ADDRESS, PAXG_ARBITRUM],
        arbiscanUrls: [arbiUrl(DEPLOYER_ADDRESS), arbiUrl(PAXG_ARBITRUM)],
        sparkline: paxgSparkline,
      },
      {
        symbol: 'AXAU',
        label: 'AXAU — Gold Reserve Instrument',
        balance: fmt(axauBal, 6),
        balanceDecimals: 18,
        price: xauPrice !== null ? fmt(xauPrice, 2) : null,
        valueUsd: axauValue !== null ? fmtUsd(axauValue) : null,
        priceSource: 'Chainlink XAU/USD · Arbitrum One (backing price)',
        location: 'Deployer EOA (fulfillment buffer)',
        contracts: [DEPLOYER_ADDRESS, AXAU_ADDRESS],
        arbiscanUrls: [arbiUrl(DEPLOYER_ADDRESS), arbiUrl(AXAU_ADDRESS)],
        sparkline: paxgSparkline,
      },
      {
        symbol: 'AXM',
        label: 'Axiom Governance Token',
        balance: fmt(axmTotal, 4),
        balanceDecimals: 18,
        price: axmPrice !== null ? axmPrice.toFixed(6) : null,
        valueUsd: axmValue !== null ? fmtUsd(axmValue) : null,
        priceSource: 'On-chain EulerSwap pool ratio (AXUSD/AXM)',
        location: 'Treasury Revenue + Staking Emissions',
        contracts: [CORE_CONTRACTS.TREASURY_REVENUE, CORE_CONTRACTS.STAKING_EMISSIONS],
        arbiscanUrls: [arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE), arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS)],
        sparkline: null,
      },
      {
        symbol: 'USDC',
        label: 'USD Coin',
        balance: fmt(usdcTotal, 2),
        balanceDecimals: 6,
        price: '1.00',
        valueUsd: fmtUsd(usdcValue),
        priceSource: 'Stable peg ($1.00)',
        location: 'Canonical PSM + Legacy PSM + Backstop Vault',
        contracts: [CANONICAL_PSM, AXUSD_GENIUS_CONTRACTS.PSM, AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC],
        arbiscanUrls: [
          arbiUrl(CANONICAL_PSM),
          arbiUrl(AXUSD_GENIUS_CONTRACTS.PSM),
          arbiUrl(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC),
        ],
        sparkline: null,
      },
      {
        symbol: 'AXUSD',
        label: 'Axiom USD (Treasury Holding)',
        balance: fmt(axusdTreasury, 2),
        balanceDecimals: 18,
        price: '1.00',
        valueUsd: fmtUsd(axusdValue),
        priceSource: 'Stable peg ($1.00)',
        location: 'Treasury Revenue Contract',
        contracts: [CORE_CONTRACTS.TREASURY_REVENUE, AXUSD_ADDRESS],
        arbiscanUrls: [arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE), arbiUrl(AXUSD_ADDRESS)],
        sparkline: null,
      },
    ];

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      assets,
      totals: {
        totalValueUsd: fmtUsd(totalValueUsd),
        axusdSupply: fmtUsd(axusdTreasury),
        axusdTreasuryHolding: fmt(axusdTreasury, 2),
        coverageRatio: coverageRatio !== null ? coverageRatio.toFixed(4) : null,
        coverageRatioPct: coverageRatio !== null ? (coverageRatio * 100).toFixed(2) : null,
      },
      deployer: DEPLOYER_ADDRESS,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[reserve-assets] error:', error?.message);
    return res.status(500).json({
      success: false,
      assets: [],
      totals: { totalValueUsd: '0', axusdSupply: '0', axusdTreasuryHolding: '0', coverageRatio: null, coverageRatioPct: null },
      deployer: DEPLOYER_ADDRESS,
      timestamp: new Date().toISOString(),
      error: error?.message ?? 'Failed to fetch reserve assets',
    });
  }
}
