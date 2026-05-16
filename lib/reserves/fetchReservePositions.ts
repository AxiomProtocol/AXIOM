/**
 * lib/reserves/fetchReservePositions.ts
 *
 * Authenticated internal reserve view — used by the Founder Ops reserves tab
 * and the snapshot runner.
 *
 * All balance-fetching logic is delegated to getCanonicalReserveSnapshot()
 * so the internal and public views cannot drift in AXUSD scope, coverage
 * denominator, or hard-asset numerator definition.
 *
 * This module maps the canonical snapshot to the richer ReserveAssetPosition
 * shape which includes operational fields (action URLs, buffer capacity,
 * oracle staleness, purchase links) that are internal-only.
 */

import { GOVERNANCE_SAFE, DEPLOYER_EOA } from '../../src/config/adminRoles';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../shared/contracts';
import { CANONICAL_PSM } from '../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES, ORACLE_STALE_THRESHOLD_SECONDS } from '../services/AXAUContractService';
import { getCanonicalReserveSnapshot } from './getCanonicalReserveSnapshot';

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
    axusdCirculatingSupply: number;
    axusdCirculatingSupplyFormatted: string;
    hardAssetCoverageUsd: number;
    coverageRatio: number | null;
  };
  deployer: string;
  governanceSafe: string;
  fetchedAt: string;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ETH_LOW_THRESHOLD = 0.1;

function arbiUrl(addr: string): string {
  return `https://arbiscan.io/address/${addr}`;
}

function fmtBal(n: number, decimals = 6): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

// ── Main exported function ────────────────────────────────────────────────────

export async function fetchReservePositions(): Promise<ReservePositionsResponse> {
  const snap = await getCanonicalReserveSnapshot();
  const r    = snap._raw;
  const at   = snap.fetchedAt;

  // ── ETH ───────────────────────────────────────────────────────────────────
  const ethStatus: 'OK' | 'LOW' = r.ethBal < ETH_LOW_THRESHOLD ? 'LOW' : 'OK';

  // ── PAXG ──────────────────────────────────────────────────────────────────
  const paxgDepositAddr  = DEPLOYER_EOA;
  const paxgDepositLabel = r.paxgViaBitgo
    ? 'Deployer EOA (MintRedeemController collateral source) — primary custody via BitGo CaaS'
    : 'Deployer EOA — on-chain PAXG balance (BitGo CaaS unavailable)';
  const paxgValue = r.xauPrice !== null ? r.paxgBal * r.xauPrice : null;

  // ── AXAU ──────────────────────────────────────────────────────────────────
  const axauStatus: ReserveAssetPosition['status'] =
    r.bufferCapacity === 'SUFFICIENT' ? 'OK'      :
    r.bufferCapacity === 'PARTIAL'    ? 'PARTIAL'  :
    r.bufferCapacity === 'DEPLETED'   ? 'DEPLETED' : 'UNKNOWN';

  // ── AXM ───────────────────────────────────────────────────────────────────
  const axmValue = r.axmPrice !== null ? r.axmTotal * r.axmPrice : null;

  // ── Totals ────────────────────────────────────────────────────────────────
  const { totalReserveUsd, hardAssetCoverageUsd, axusdCirculatingSupply, coverageRatio } = snap.totals;

  const assets: ReserveAssetPosition[] = [
    {
      symbol: 'ETH', label: 'Ethereum — Gas Reserve',
      balance: r.ethBal, balanceFormatted: fmtBal(r.ethBal, 6) + ' ETH',
      usdValue: r.ethPrice !== null ? r.ethBal * r.ethPrice : null,
      price: r.ethPrice, priceSource: 'CoinGecko (ethereum/usd)',
      status: ethStatus,
      statusDetail: ethStatus === 'LOW'
        ? `Balance below ${ETH_LOW_THRESHOLD} ETH minimum gas reserve — replenish soon`
        : `ETH gas reserve nominal (${fmtBal(r.ethBal, 4)} ETH)`,
      depositAddress: DEPLOYER_EOA, depositLabel: 'Deployer EOA (send ETH on Arbitrum One)',
      depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
      locationBreakdown: [{ label: 'Deployer EOA', address: DEPLOYER_EOA, balance: r.ethBal, balanceFormatted: fmtBal(r.ethBal, 6) + ' ETH', arbiscanUrl: arbiUrl(DEPLOYER_EOA) }],
      actionType: 'copy_address', actionLabel: 'Copy Deposit Address',
      lastUpdatedAt: at,
    },
    {
      symbol: 'PAXG', label: 'PAX Gold — Custodial Reserve',
      balance: r.paxgBal, balanceFormatted: fmtBal(r.paxgBal, 6) + ' PAXG',
      usdValue: paxgValue, price: r.xauPrice,
      priceSource: r.vault
        ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)'
        : 'Chainlink unavailable — no price',
      status: r.paxgBal > 0 ? 'OK' : 'ZERO',
      statusDetail: r.paxgBal > 0
        ? `${fmtBal(r.paxgBal, 4)} PAXG — source: ${r.paxgViaBitgo ? 'BitGo CaaS custodian-reported' : 'Deployer EOA on-chain (BitGo unavailable)'}`
        : 'No PAXG balance detected — check BitGo CaaS and deployer EOA',
      depositAddress: paxgDepositAddr, depositLabel: paxgDepositLabel,
      depositArbiscanUrl: arbiUrl(paxgDepositAddr),
      locationBreakdown: [{
        label: r.paxgViaBitgo
          ? 'Deployer EOA (collateral source — BitGo CaaS is primary custodian)'
          : 'Deployer EOA (on-chain balance — BitGo CaaS unavailable)',
        address: DEPLOYER_EOA, balance: r.paxgBal,
        balanceFormatted: fmtBal(r.paxgBal, 6) + ' PAXG',
        arbiscanUrl: arbiUrl(DEPLOYER_EOA),
      }],
      actionType: 'open_bitgo', actionLabel: 'Open BitGo Dashboard', actionUrl: 'https://app.bitgo.com',
      lastUpdatedAt: at,
    },
    {
      symbol: 'AXAU', label: 'AXAU — Gold Reserve Instrument (Fulfillment Buffer)',
      balance: r.axauBal, balanceFormatted: fmtBal(r.axauBal, 6) + ' AXAU',
      usdValue: r.axauValueUsd, price: r.axauNavPerToken,
      priceSource: 'Mint NAV (~$1.15/AXAU) — not XAU/USD spot',
      status: axauStatus,
      statusDetail: r.vault
        ? `Buffer: ${r.vault.bufferCapacity} · ${r.vault.pendingOrdersCount} pending order(s) · Covers orders: ${r.vault.axauCoversOrders ? 'YES' : 'NO'}${r.mintPaused ? ' · MINT PAUSED' : ''}`
        : 'Vault buffer unavailable — check DEPLOYER_PRIVATE_KEY config',
      depositAddress: DEPLOYER_EOA,
      depositLabel: 'Deployer EOA — send AXAU (PATH A) or trigger PAXG mint (PATH B) via Arbitrum One',
      depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
      locationBreakdown: [{ label: 'Deployer EOA (fulfillment buffer)', address: DEPLOYER_EOA, balance: r.axauBal, balanceFormatted: fmtBal(r.axauBal, 6) + ' AXAU', arbiscanUrl: arbiUrl(DEPLOYER_EOA) }],
      actionType: 'axau_buffer', actionLabel: 'Copy Deployer Address',
      bufferCapacity: r.bufferCapacity === 'UNKNOWN' ? undefined : r.bufferCapacity,
      mintPaused: r.mintPaused,
      oracleStale: r.oracleStale,
      oracleAgeSeconds: r.oracleAgeSeconds,
      oracleThresholdSeconds: ORACLE_STALE_THRESHOLD_SECONDS,
      lastUpdatedAt: at,
    },
    {
      symbol: 'AXM', label: 'AXM — Governance Token Reserve',
      balance: r.axmTotal, balanceFormatted: fmtBal(r.axmTotal, 2) + ' AXM',
      usdValue: axmValue, price: r.axmPrice,
      priceSource: r.axmPrice !== null
        ? 'On-chain pool reserve ratio'
        : 'Price unavailable — EulerSwap AXUSD/AXM pool withdrawn 2026-05-13',
      status: r.axmTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(r.axmTreasury, 2)} AXM in Treasury + ${fmtBal(r.axmStaking, 2)} AXM in Staking Emissions`,
      depositAddress: CORE_CONTRACTS.TREASURY_REVENUE,
      depositLabel: 'Treasury Revenue Hub — send AXM here on Arbitrum One',
      depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
      locationBreakdown: [
        { label: 'Treasury Revenue Hub', address: CORE_CONTRACTS.TREASURY_REVENUE, balance: r.axmTreasury, balanceFormatted: fmtBal(r.axmTreasury, 2) + ' AXM', arbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE) },
        { label: 'Staking Emissions Hub', address: CORE_CONTRACTS.STAKING_EMISSIONS, balance: r.axmStaking, balanceFormatted: fmtBal(r.axmStaking, 2) + ' AXM', arbiscanUrl: arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS) },
      ],
      actionType: 'copy_address', actionLabel: 'Copy Treasury Address',
      actionUrl: `https://app.safe.global/home?safe=arb1:${GOVERNANCE_SAFE}`,
      purchaseUrl: '/dex', purchaseLabel: 'Buy AXM on Protocol Exchange',
      lastUpdatedAt: at,
    },
    {
      symbol: 'USDC', label: 'USDC — Stablecoin Reserve (Aggregated)',
      balance: r.usdcTotal, balanceFormatted: fmtBal(r.usdcTotal, 2) + ' USDC',
      usdValue: r.usdcTotal, price: 1.0, priceSource: 'Stable peg — $1.00 USDC',
      status: r.usdcTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(r.usdcCanonical, 2)} canonical PSM + ${fmtBal(r.usdcLegacy, 2)} legacy PSM + ${fmtBal(r.usdcBackstop, 2)} backstop + ${fmtBal(r.usdcDeployer, 2)} deployer`,
      depositAddress: CANONICAL_PSM,
      depositLabel: 'Canonical PSM (ERC-3643) — primary USDC reserve',
      depositArbiscanUrl: arbiUrl(CANONICAL_PSM),
      locationBreakdown: [
        { label: 'Canonical PSM (ERC-3643)', address: CANONICAL_PSM, balance: r.usdcCanonical, balanceFormatted: fmtBal(r.usdcCanonical, 2) + ' USDC', arbiscanUrl: arbiUrl(CANONICAL_PSM) },
        { label: 'Legacy PSM / GENIUS (Migrating)', address: AXUSD_GENIUS_CONTRACTS.PSM, balance: r.usdcLegacy, balanceFormatted: fmtBal(r.usdcLegacy, 2) + ' USDC', arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.PSM) },
        { label: 'Backstop Vault USDC', address: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC, balance: r.usdcBackstop, balanceFormatted: fmtBal(r.usdcBackstop, 2) + ' USDC', arbiscanUrl: arbiUrl(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC) },
        { label: 'Deployer EOA', address: DEPLOYER_EOA, balance: r.usdcDeployer, balanceFormatted: fmtBal(r.usdcDeployer, 2) + ' USDC', arbiscanUrl: arbiUrl(DEPLOYER_EOA) },
      ],
      actionType: 'copy_address', actionLabel: 'Copy PSM Address',
      lastUpdatedAt: at,
    },
    {
      symbol: 'AXUSD', label: 'AXUSD — Protocol Holdings',
      balance: r.axusdTotal, balanceFormatted: fmtBal(r.axusdTotal, 2) + ' AXUSD',
      usdValue: r.axusdTotal, price: 1.0, priceSource: 'Stable peg — $1.00 AXUSD',
      status: r.axusdTotal > 0 ? 'OK' : 'ZERO',
      statusDetail: `${fmtBal(r.axusdTreasury, 2)} in Treasury Revenue Hub only (EVK vault withdrawn 2026-05-13)`,
      depositAddress: CORE_CONTRACTS.TREASURY_REVENUE,
      depositLabel: 'Treasury Revenue Hub — send AXUSD here on Arbitrum One',
      depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
      locationBreakdown: [
        { label: 'Treasury Revenue Hub', address: CORE_CONTRACTS.TREASURY_REVENUE, balance: r.axusdTreasury, balanceFormatted: fmtBal(r.axusdTreasury, 2) + ' AXUSD', arbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE) },
      ],
      actionType: 'copy_address', actionLabel: 'Copy Treasury Address',
      purchaseUrl: '/onramp', purchaseLabel: 'Fund via Card (USD → AXUSD)',
      secondFundingUrl: '/dex', secondFundingLabel: 'Swap USDC → AXUSD',
      lastUpdatedAt: at,
    },
  ];

  return {
    success: true,
    assets,
    totals: {
      totalValueUsd: totalReserveUsd,
      totalValueUsdFormatted: '$' + totalReserveUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ethStatus,
      axauBufferCapacity: r.bufferCapacity,
      mintPaused: r.mintPaused,
      axusdCirculatingSupply,
      axusdCirculatingSupplyFormatted: '$' + axusdCirculatingSupply.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      hardAssetCoverageUsd,
      coverageRatio,
    },
    deployer: DEPLOYER_EOA,
    governanceSafe: GOVERNANCE_SAFE,
    fetchedAt: at,
  };
}
