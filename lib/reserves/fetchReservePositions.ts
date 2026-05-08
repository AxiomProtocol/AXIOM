/**
 * lib/reserves/fetchReservePositions.ts
 *
 * Core reserve-balance fetching logic extracted from the API handler so it
 * can be imported directly by the snapshot runner and bootstrap endpoint
 * without any internal HTTP self-calls.
 *
 * The API handler at pages/api/founder/reserve-positions.ts delegates to
 * this function after auth checks.
 */

import { ethers } from 'ethers';
import { GOVERNANCE_SAFE, DEPLOYER_EOA } from '../../src/config/adminRoles';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS, STABLECOINS, EULER_LENDING_CONTRACTS } from '../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../shared/contracts-3643';
import { CANONICAL_PSM, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed } from '../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES, ORACLE_STALE_THRESHOLD_SECONDS } from '../services/AXAUContractService';
import { bitGoTreasuryExtension } from '../services/BitGoTreasuryExtension';
import { getVaultBuffer } from '../services/AXAUFulfillmentService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReserveAssetPosition {
  symbol: string;
  label: string;
  balance: number;
  balanceFormatted: string;
  usdValue: number | null;
  price: number | null;
  priceSource: string;
  status: 'OK' | 'LOW' | 'ZERO' | 'DEPLETED' | 'PARTIAL' | 'UNKNOWN';
  statusDetail: string;
  depositAddress: string;
  depositLabel: string;
  depositArbiscanUrl: string;
  locationBreakdown: Array<{
    label: string;
    address: string;
    balance: number;
    balanceFormatted: string;
    arbiscanUrl: string;
  }>;
  actionType: 'copy_address' | 'open_bitgo' | 'open_safe' | 'open_contract' | 'axau_buffer';
  actionLabel: string;
  actionUrl?: string;
  purchaseUrl?: string;
  purchaseLabel?: string;
  secondFundingUrl?: string;
  secondFundingLabel?: string;
  bufferCapacity?: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  mintPaused?: boolean;
  oracleStale?: boolean;
  oracleAgeSeconds?: number | null;
  oracleThresholdSeconds?: number;
  lastUpdatedAt: string;
}

export interface ReservePositionsResponse {
  success: boolean;
  assets: ReserveAssetPosition[];
  totals: {
    totalValueUsd: number;
    totalValueUsdFormatted: string;
    ethStatus: 'OK' | 'LOW';
    axauBufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED' | 'UNKNOWN';
    mintPaused: boolean;
  };
  deployer: string;
  governanceSafe: string;
  fetchedAt: string;
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAXG_ARBITRUM    = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXM_ADDRESS      = CORE_CONTRACTS.AXM_TOKEN;
const AXUSD_ADDRESS    = ERC3643_CONTRACTS.AXUSD_TOKEN;
const AXAU_ADDRESS     = AXAU_ADDRESSES.AXAUTokenLite3643;
const USDC_ADDRESS     = STABLECOINS.USDC;
const ETH_LOW_THRESHOLD = 0.1;
const ZERO             = '0x0000000000000000000000000000000000000000';
const AXM_LC           = AXM_ADDRESS.toLowerCase();

const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const POOL_ABI  = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function getAssets() view returns (address,address)',
];
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

void PAXG_ARBITRUM; void AXAU_ADDRESS; // used indirectly via vault

// ── Helpers ──────────────────────────────────────────────────────────────────

function arbiUrl(addr: string): string {
  return `https://arbiscan.io/address/${addr}`;
}

function fmtBal(n: number, decimals = 6): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchAxmPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  const poolAddr = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || !poolAddr || (poolAddr as string) === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);
    const asset0Lower  = (assets[0] as string).toLowerCase();
    const axmIsAsset0  = asset0Lower === AXM_LC;
    const axmReserve   = Number(ethers.formatUnits(axmIsAsset0 ? reserves[0] : reserves[1], 18));
    const axusdReserve = Number(ethers.formatUnits(axmIsAsset0 ? reserves[1] : reserves[0], 18));
    if (axmReserve <= 0) return null;
    return axusdReserve / axmReserve;
  } catch { return null; }
}

async function fetchEthPrice(): Promise<number | null> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { ethereum?: { usd?: number } };
    return json.ethereum?.usd ?? null;
  } catch { return null; }
}

// ── Main exported function ────────────────────────────────────────────────────

export async function fetchReservePositions(): Promise<ReservePositionsResponse> {
  const rpcReq = new ethers.FetchRequest(ARBITRUM_RPC);
  rpcReq.timeout = 5_000;
  const provider = new ethers.JsonRpcProvider(rpcReq);

  const axm   = new ethers.Contract(AXM_ADDRESS,   ERC20_ABI, provider);
  const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
  const usdc  = new ethers.Contract(USDC_ADDRESS,  ERC20_ABI, provider);
  const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);

  const FETCH_DEADLINE_MS = 20_000;
  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('reserve-positions fetch deadline exceeded')), FETCH_DEADLINE_MS),
  );

  const [
    ethPrice, axmPrice, vault, bitgo,
    ethBalRaw, axmTreasuryRaw, axmStakingRaw,
    axusdTreasuryRaw, axusdEvkRaw,
    usdcCanonicalRaw, usdcLegacyRaw, usdcBackstopRaw, usdcDeployerRaw,
    oracleRound,
  ] = await Promise.race([
    Promise.all([
      withTimeout(fetchEthPrice(),                                                                 6_000, null),
      withTimeout(fetchAxmPrice(provider),                                                         6_000, null),
      withTimeout(getVaultBuffer().catch(() => null),                                              6_000, null),
      withTimeout(bitGoTreasuryExtension.getReserveAssetBalances().catch(() => null),              6_000, null),
      withTimeout(provider.getBalance(DEPLOYER_EOA).catch(() => 0n),                              6_000, 0n),
      withTimeout(axm.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),                 6_000, 0n),
      withTimeout(axm.balanceOf(CORE_CONTRACTS.STAKING_EMISSIONS).catch(() => 0n),                6_000, 0n),
      withTimeout(axusd.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),               6_000, 0n),
      withTimeout(axusd.balanceOf(EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT).catch(() => 0n), 6_000, 0n),
      withTimeout(usdc.balanceOf(CANONICAL_PSM).catch(() => 0n),                                  6_000, 0n),
      withTimeout(usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => 0n),                     6_000, 0n),
      withTimeout(usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => 0n),     6_000, 0n),
      withTimeout(usdc.balanceOf(DEPLOYER_EOA).catch(() => 0n),                                   6_000, 0n),
      withTimeout(chainlink.latestRoundData().catch(() => null),                                   6_000, null),
    ]),
    deadline,
  ]);

  // ── Oracle freshness ──────────────────────────────────────────────────────
  const nowSec          = Math.floor(Date.now() / 1000);
  const oracleUpdatedAt = oracleRound ? Number(oracleRound[3]) : 0;
  const oracleAgeSeconds: number | null = oracleUpdatedAt > 0 ? nowSec - oracleUpdatedAt : null;
  const oracleStale     = oracleAgeSeconds !== null ? oracleAgeSeconds > ORACLE_STALE_THRESHOLD_SECONDS : true;

  // ── ETH ───────────────────────────────────────────────────────────────────
  const ethBal   = Number(ethers.formatEther(ethBalRaw as bigint));
  const ethValue = ethPrice !== null ? ethBal * ethPrice : null;
  const ethStatus: 'OK' | 'LOW' = ethBal < ETH_LOW_THRESHOLD ? 'LOW' : 'OK';

  // ── PAXG ──────────────────────────────────────────────────────────────────
  const bitgoPaxg     = (bitgo?.positions ?? []).find(p => p.assetSymbol === 'PAXG');
  const paxgViaBitgo  = !!(bitgoPaxg && bitgoPaxg.quantity > 0);
  const paxgBal       = paxgViaBitgo
    ? bitgoPaxg!.quantity
    : (vault ? parseFloat(vault.paxgBalanceFormatted) : 0);
  const xauPrice      = vault ? parseFloat(vault.xauUsdPrice) : null;
  const paxgValue     = xauPrice !== null ? paxgBal * xauPrice : null;
  const paxgDepositAddr  = DEPLOYER_EOA;
  const paxgDepositLabel = paxgViaBitgo
    ? 'Deployer EOA (MintRedeemController collateral source) — primary custody via BitGo CaaS'
    : 'Deployer EOA — on-chain PAXG balance (BitGo CaaS unavailable)';

  // ── AXAU ──────────────────────────────────────────────────────────────────
  const axauBal         = vault ? parseFloat(vault.axauBalanceFormatted) : 0;
  const axauValueUsd    = vault ? parseFloat(vault.axauValueUsd) : axauBal * 1.15;
  const axauNavPerToken = vault && axauBal > 0
    ? parseFloat(vault.axauValueUsd) / axauBal
    : 1.15;
  const bufferCapacity  = vault?.bufferCapacity ?? 'UNKNOWN';
  const mintPaused      = vault?.mintPaused ?? false;
  const axauStatus: ReserveAssetPosition['status'] =
    bufferCapacity === 'SUFFICIENT' ? 'OK' :
    bufferCapacity === 'PARTIAL'    ? 'PARTIAL' :
    bufferCapacity === 'DEPLETED'   ? 'DEPLETED' : 'UNKNOWN';

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
  const axusdTreasury = Number(ethers.formatUnits(axusdTreasuryRaw as bigint, 18));
  const axusdEvk      = Number(ethers.formatUnits(axusdEvkRaw as bigint, 18));
  const axusdTotal    = axusdTreasury + axusdEvk;

  // ── Totals ────────────────────────────────────────────────────────────────
  const knownValues   = [ethValue, paxgValue, axauValueUsd, axmValue, usdcTotal, axusdTotal]
    .filter((v): v is number => v !== null);
  const totalValueUsd = knownValues.reduce((a, b) => a + b, 0);

  // ── Assets array ──────────────────────────────────────────────────────────
  const batchFetchedAt = new Date().toISOString();

  const assets: ReserveAssetPosition[] = [
    {
      symbol: 'ETH', label: 'Ethereum — Gas Reserve',
      balance: ethBal, balanceFormatted: fmtBal(ethBal, 6) + ' ETH',
      usdValue: ethValue, price: ethPrice, priceSource: 'CoinGecko (ethereum/usd)',
      status: ethStatus,
      statusDetail: ethStatus === 'LOW'
        ? `Balance below ${ETH_LOW_THRESHOLD} ETH minimum gas reserve — replenish soon`
        : `ETH gas reserve nominal (${fmtBal(ethBal, 4)} ETH)`,
      depositAddress: DEPLOYER_EOA, depositLabel: 'Deployer EOA (send ETH on Arbitrum One)',
      depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
      locationBreakdown: [{ label: 'Deployer EOA', address: DEPLOYER_EOA, balance: ethBal, balanceFormatted: fmtBal(ethBal, 6) + ' ETH', arbiscanUrl: arbiUrl(DEPLOYER_EOA) }],
      actionType: 'copy_address', actionLabel: 'Copy Deposit Address',
      lastUpdatedAt: batchFetchedAt,
    },
    {
      symbol: 'PAXG', label: 'PAX Gold — Custodial Reserve',
      balance: paxgBal, balanceFormatted: fmtBal(paxgBal, 6) + ' PAXG',
      usdValue: paxgValue, price: xauPrice,
      priceSource: vault ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)' : 'Chainlink unavailable — no price',
      status: paxgBal > 0 ? 'OK' : 'ZERO',
      statusDetail: paxgBal > 0
        ? `${fmtBal(paxgBal, 4)} PAXG — source: ${paxgViaBitgo ? 'BitGo CaaS custodian-reported' : 'Deployer EOA on-chain (BitGo unavailable)'}`
        : 'No PAXG balance detected — check BitGo CaaS and deployer EOA',
      depositAddress: paxgDepositAddr, depositLabel: paxgDepositLabel,
      depositArbiscanUrl: arbiUrl(paxgDepositAddr),
      locationBreakdown: [{
        label: paxgViaBitgo ? 'Deployer EOA (collateral source — BitGo CaaS is primary custodian)' : 'Deployer EOA (on-chain balance — BitGo CaaS unavailable)',
        address: DEPLOYER_EOA, balance: paxgBal, balanceFormatted: fmtBal(paxgBal, 6) + ' PAXG', arbiscanUrl: arbiUrl(DEPLOYER_EOA),
      }],
      actionType: 'open_bitgo', actionLabel: 'Open BitGo Dashboard', actionUrl: 'https://app.bitgo.com',
      lastUpdatedAt: batchFetchedAt,
    },
    {
      symbol: 'AXAU', label: 'AXAU — Gold Reserve Instrument (Fulfillment Buffer)',
      balance: axauBal, balanceFormatted: fmtBal(axauBal, 6) + ' AXAU',
      usdValue: axauValueUsd, price: axauNavPerToken,
      priceSource: 'Mint NAV (~$1.15/AXAU) — not XAU/USD spot',
      status: axauStatus,
      statusDetail: vault
        ? `Buffer: ${vault.bufferCapacity} · ${vault.pendingOrdersCount} pending order(s) · Covers orders: ${vault.axauCoversOrders ? 'YES' : 'NO'}${mintPaused ? ' · MINT PAUSED' : ''}`
        : 'Vault buffer unavailable — check DEPLOYER_PRIVATE_KEY config',
      depositAddress: DEPLOYER_EOA,
      depositLabel: 'Deployer EOA — send AXAU (PATH A) or trigger PAXG mint (PATH B) via Arbitrum One',
      depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
      locationBreakdown: [{ label: 'Deployer EOA (fulfillment buffer)', address: DEPLOYER_EOA, balance: axauBal, balanceFormatted: fmtBal(axauBal, 6) + ' AXAU', arbiscanUrl: arbiUrl(DEPLOYER_EOA) }],
      actionType: 'axau_buffer', actionLabel: 'Copy Deployer Address',
      bufferCapacity: vault?.bufferCapacity, mintPaused, oracleStale, oracleAgeSeconds,
      oracleThresholdSeconds: ORACLE_STALE_THRESHOLD_SECONDS,
      lastUpdatedAt: batchFetchedAt,
    },
    {
      symbol: 'AXM', label: 'AXM — Governance Token Reserve',
      balance: axmTotal, balanceFormatted: fmtBal(axmTotal, 2) + ' AXM',
      usdValue: axmValue, price: axmPrice,
      priceSource: axmPrice !== null ? 'On-chain EulerSwap AXUSD/AXM pool reserve ratio' : 'Price unavailable — pool reserve ratio failed',
      status: axmTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(axmTreasury, 2)} AXM in Treasury + ${fmtBal(axmStaking, 2)} AXM in Staking Emissions`,
      depositAddress: CORE_CONTRACTS.TREASURY_REVENUE,
      depositLabel: 'Treasury Revenue Hub — send AXM here on Arbitrum One',
      depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
      locationBreakdown: [
        { label: 'Treasury Revenue Hub', address: CORE_CONTRACTS.TREASURY_REVENUE, balance: axmTreasury, balanceFormatted: fmtBal(axmTreasury, 2) + ' AXM', arbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE) },
        { label: 'Staking Emissions Hub', address: CORE_CONTRACTS.STAKING_EMISSIONS, balance: axmStaking, balanceFormatted: fmtBal(axmStaking, 2) + ' AXM', arbiscanUrl: arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS) },
      ],
      actionType: 'copy_address', actionLabel: 'Copy Treasury Address',
      actionUrl: `https://app.safe.global/home?safe=arb1:${GOVERNANCE_SAFE}`,
      purchaseUrl: '/dex', purchaseLabel: 'Buy AXM on Protocol Exchange',
      lastUpdatedAt: batchFetchedAt,
    },
    {
      symbol: 'USDC', label: 'USDC — Stablecoin Reserve (Aggregated)',
      balance: usdcTotal, balanceFormatted: fmtBal(usdcTotal, 2) + ' USDC',
      usdValue: usdcTotal, price: 1.0, priceSource: 'Stable peg — $1.00 USDC',
      status: usdcTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(usdcCanonical, 2)} canonical PSM + ${fmtBal(usdcLegacy, 2)} legacy PSM + ${fmtBal(usdcBackstop, 2)} backstop + ${fmtBal(usdcDeployer, 2)} deployer`,
      depositAddress: CANONICAL_PSM,
      depositLabel: 'Canonical PSM (ERC-3643) — primary USDC reserve',
      depositArbiscanUrl: arbiUrl(CANONICAL_PSM),
      locationBreakdown: [
        { label: 'Canonical PSM (ERC-3643)', address: CANONICAL_PSM, balance: usdcCanonical, balanceFormatted: fmtBal(usdcCanonical, 2) + ' USDC', arbiscanUrl: arbiUrl(CANONICAL_PSM) },
        { label: 'Legacy PSM / GENIUS', address: AXUSD_GENIUS_CONTRACTS.PSM, balance: usdcLegacy, balanceFormatted: fmtBal(usdcLegacy, 2) + ' USDC', arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.PSM) },
        { label: 'Backstop Vault USDC', address: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC, balance: usdcBackstop, balanceFormatted: fmtBal(usdcBackstop, 2) + ' USDC', arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC) },
        { label: 'Deployer EOA', address: DEPLOYER_EOA, balance: usdcDeployer, balanceFormatted: fmtBal(usdcDeployer, 2) + ' USDC', arbiscanUrl: arbiUrl(DEPLOYER_EOA) },
      ],
      actionType: 'copy_address', actionLabel: 'Copy PSM Address',
      lastUpdatedAt: batchFetchedAt,
    },
    {
      symbol: 'AXUSD', label: 'AXUSD — Protocol Holdings',
      balance: axusdTotal, balanceFormatted: fmtBal(axusdTotal, 2) + ' AXUSD',
      usdValue: axusdTotal, price: 1.0, priceSource: 'Stable peg — $1.00 AXUSD',
      status: axusdTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(axusdTreasury, 2)} in Treasury + ${fmtBal(axusdEvk, 2)} in Euler EVK Vault`,
      depositAddress: CORE_CONTRACTS.TREASURY_REVENUE,
      depositLabel: 'Treasury Revenue Hub — send AXUSD here on Arbitrum One',
      depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
      locationBreakdown: [
        { label: 'Treasury Revenue Hub', address: CORE_CONTRACTS.TREASURY_REVENUE, balance: axusdTreasury, balanceFormatted: fmtBal(axusdTreasury, 2) + ' AXUSD', arbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE) },
        { label: 'Euler EVK Open Market Vault (eAXUSD-6)', address: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT, balance: axusdEvk, balanceFormatted: fmtBal(axusdEvk, 2) + ' AXUSD', arbiscanUrl: arbiUrl(EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT) },
      ],
      actionType: 'open_contract', actionLabel: 'View EVK Vault',
      actionUrl: arbiUrl(EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT),
      purchaseUrl: '/onramp', purchaseLabel: 'Fund via Card (USD → AXUSD)',
      secondFundingUrl: '/dex', secondFundingLabel: 'Swap USDC → AXUSD',
      lastUpdatedAt: batchFetchedAt,
    },
  ];

  return {
    success: true,
    assets,
    totals: {
      totalValueUsd,
      totalValueUsdFormatted: '$' + totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ethStatus,
      axauBufferCapacity: vault?.bufferCapacity ?? 'UNKNOWN',
      mintPaused,
    },
    deployer: DEPLOYER_EOA,
    governanceSafe: GOVERNANCE_SAFE,
    fetchedAt: batchFetchedAt,
  };
}
