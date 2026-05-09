/**
 * /api/observer/reserve-assets
 *
 * Public (unauthenticated) reserve asset endpoint. Delegates all balance
 * and price fetching to getCanonicalReserveSnapshot() so AXUSD scope,
 * coverage denominator, and hard-asset numerator cannot drift from the
 * authenticated internal view.
 *
 * This handler is a thin adapter:
 *   1. Call getCanonicalReserveSnapshot() — canonical balances + prices
 *   2. Fetch sparklines separately (display-only, not in canonical function)
 *   3. Map canonical data → ReserveAssetsResponse shape
 *
 * Accounting rules are enforced in getCanonicalReserveSnapshot() and are
 * NOT re-implemented here. Do not add coverage logic to this file.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCanonicalReserveSnapshot } from '../../../lib/reserves/getCanonicalReserveSnapshot';
import { CORE_CONTRACTS, EULER_LENDING_CONTRACTS } from '../../../shared/contracts';
import { DEPLOYER_EOA } from '../../../src/config/adminRoles';
import { AXAU_ADDRESSES } from '../../../lib/services/AXAUContractService';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';

// Stale threshold for BitGo custodian data — emit a UI warning if exceeded.
const BITGO_STALE_THRESHOLD_SECONDS = 3_600;

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
    const json    = await res.json() as { data?: { history?: Array<{ value: string }> } };
    const history = json.data?.history ?? [];
    const prices  = history.map((h) => parseFloat(h.value)).filter((v) => !isNaN(v) && v > 0);
    return prices.length >= 2 ? prices : null;
  } catch { return null; }
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
    axusdCirculatingSupply: string;
  };
  freshness: {
    fetchedAt: string;
    dataAgeSeconds: number;
    bitgoDataAgeSeconds: number | null;
    isBitgoStale: boolean;
  };
  deployer: string;
  timestamp: string;
  error?: string;
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

// ─── Empty response ───────────────────────────────────────────────────────────

const EMPTY_RESPONSE: Omit<ReserveAssetsResponse, 'timestamp' | 'error'> = {
  success: false,
  priceMov: [],
  stable: [],
  totals: {
    totalValueUsd: '0.00',
    coverageRatio: null,
    coverageRatioPct: null,
    coverageNote: '',
    axusdCirculatingSupply: '0.00',
  },
  freshness: {
    fetchedAt: new Date().toISOString(),
    dataAgeSeconds: 0,
    bitgoDataAgeSeconds: null,
    isBitgoStale: false,
  },
  deployer: DEPLOYER_EOA,
};

// ─── Handler ──────────────────────────────────────────────────────────────────

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

  const requestStart = Date.now();

  try {
    // Step 1: canonical balances + prices (single source of truth)
    // Step 2: sparklines (display-only, parallel with canonical fetch would be ideal
    //         but canonical fetch is the bottleneck so we sequence for simplicity)
    const [snap, ethSparkline, paxgSparkline] = await Promise.all([
      getCanonicalReserveSnapshot(),
      fetchSparkline('WETH', 30),
      fetchSparkline('PAXG', 30),
    ]);

    const r = snap._raw;
    const dataAgeSeconds = Math.round((Date.now() - requestStart) / 1000);

    // ── ETH ─────────────────────────────────────────────────────────────
    const ethValue = r.ethPrice !== null ? r.ethBal * r.ethPrice : null;

    // ── PAXG ────────────────────────────────────────────────────────────
    const paxgBalSource = r.paxgViaBitgo
      ? 'BitGo CaaS (custodian-reported)'
      : 'Deployer EOA on-chain balance (BitGo unavailable)';
    const paxgValue = r.xauPrice !== null ? r.paxgBal * r.xauPrice : null;

    // ── AXAU ────────────────────────────────────────────────────────────
    const axauBalSource = r.vault
      ? 'AXAUFulfillmentService.getVaultBuffer() (deployer buffer)'
      : 'Deployer EOA on-chain balanceOf (getVaultBuffer unavailable)';

    // ── AXM ─────────────────────────────────────────────────────────────
    const axmValue = r.axmPrice !== null ? r.axmTotal * r.axmPrice : null;

    // ── Coverage ─────────────────────────────────────────────────────────
    const { totalReserveUsd, hardAssetCoverageUsd, axusdCirculatingSupply, coverageRatio } = snap.totals;

    // ── Freshness ────────────────────────────────────────────────────────
    const isBitgoStale = r.bitgoDataAgeSeconds !== null
      ? r.bitgoDataAgeSeconds > BITGO_STALE_THRESHOLD_SECONDS
      : false;

    // ── Build priceMov ────────────────────────────────────────────────────
    const priceMov: PriceMovingAsset[] = [
      {
        symbol:            'ETH',
        label:             'Ethereum',
        balance:           fmtBal(r.ethBal, 6),
        balanceSource:     'Deployer EOA native balance (eth_getBalance)',
        price:             r.ethPrice !== null ? fmtBal(r.ethPrice, 2) : null,
        price24hChangePct: r.eth24hPct !== null ? r.eth24hPct.toFixed(2) : null,
        price24hChangeUsd: change24hUsd(r.ethPrice, r.eth24hPct),
        valueUsd:          ethValue !== null ? fmtUsd(ethValue) : null,
        priceSource:       'CoinGecko (ethereum/usd)',
        priceHistoryNote:  ethSparkline ? null : 'Historical chart sourced from Alchemy Historical Prices API',
        location:          'Deployer EOA',
        contracts:         [DEPLOYER_EOA],
        arbiscanUrls:      [arbiUrl(DEPLOYER_EOA)],
        sparkline:         ethSparkline,
      },
      {
        symbol:            'PAXG',
        label:             'PAX Gold',
        balance:           fmtBal(r.paxgBal, 6),
        balanceSource:     paxgBalSource,
        price:             r.xauPrice !== null ? fmtBal(r.xauPrice, 2) : null,
        price24hChangePct: r.xau24hPct !== null ? r.xau24hPct.toFixed(2) : null,
        price24hChangeUsd: change24hUsd(r.xauPrice, r.xau24hPct),
        valueUsd:          paxgValue !== null ? fmtUsd(paxgValue) : null,
        priceSource:       r.vault
          ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)'
          : 'CoinGecko pax-gold/usd (Chainlink fallback)',
        priceHistoryNote:  paxgSparkline ? null : '30-day chart sourced from Alchemy Historical Prices API (PAXG symbol)',
        location:          'BitGo CaaS Custody',
        contracts:         [DEPLOYER_EOA, PAXG_ARBITRUM],
        arbiscanUrls:      [arbiUrl(DEPLOYER_EOA), arbiUrl(PAXG_ARBITRUM)],
        sparkline:         paxgSparkline,
      },
      {
        symbol:            'AXAU',
        label:             'AXAU — Gold Reserve Instrument',
        balance:           fmtBal(r.axauBal, 6),
        balanceSource:     axauBalSource,
        price:             r.axauNavPerToken.toFixed(4),
        price24hChangePct: null,
        price24hChangeUsd: null,
        valueUsd:          fmtUsd(r.axauValueUsd),
        priceSource:       'Approximate Mint NAV (AXAUFulfillmentService · ~$1.15/AXAU) — not XAU/USD spot',
        priceHistoryNote:  'AXAU is priced at its internal Mint NAV (~$1.15/token), not the XAU/USD gold price. It is a reserve instrument backed by gold/land NAV, not a direct troy-ounce equivalent. Not included in hard-asset coverage numerator.',
        location:          'Deployer EOA (fulfillment buffer)',
        contracts:         [DEPLOYER_EOA, AXAU_ADDRESSES.AXAUTokenLite3643],
        arbiscanUrls:      [arbiUrl(DEPLOYER_EOA), arbiUrl(AXAU_ADDRESSES.AXAUTokenLite3643)],
        sparkline:         null,
      },
      {
        symbol:            'AXM',
        label:             'Axiom Governance Token',
        balance:           fmtBal(r.axmTotal, 4),
        balanceSource:     'Treasury Revenue + Staking Emissions ERC-20 balanceOf',
        price:             r.axmPrice !== null ? r.axmPrice.toFixed(6) : null,
        price24hChangePct: null,
        price24hChangeUsd: null,
        valueUsd:          axmValue !== null ? fmtUsd(axmValue) : null,
        priceSource:       'On-chain EulerSwap pool reserve ratio (AXUSD/AXM) — spot price only, no oracle',
        priceHistoryNote:  'AXM is not listed on any public price index (CoinGecko, Alchemy, etc.). 24h change and 30-day sparkline are unavailable. Spot price is derived from the live AXUSD/AXM EulerSwap pool reserve ratio and reflects the current on-chain exchange rate only.',
        location:          'Treasury Revenue + Staking Emissions',
        contracts:         [CORE_CONTRACTS.TREASURY_REVENUE, CORE_CONTRACTS.STAKING_EMISSIONS],
        arbiscanUrls:      [arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE), arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS)],
        sparkline:         null,
      },
    ];

    // ── Build stable ──────────────────────────────────────────────────────
    const stable: StableAsset[] = [
      {
        symbol:        'USDC',
        label:         'USD Coin — Aggregated Reserve',
        totalBalance:  fmtBal(r.usdcTotal, 2),
        totalValueUsd: fmtUsd(r.usdcTotal),
        locationBreakdown: snap.assets
          .find(a => a.symbol === 'USDC')!
          .locations.map(loc => ({
            label:       loc.label,
            contract:    loc.address!,
            balance:     fmtBal(loc.balance, 6),
            arbiscanUrl: arbiUrl(loc.address!),
          })),
      },
      {
        symbol:        'AXUSD',
        label:         'Axiom USD — Protocol Holdings',
        totalBalance:  fmtBal(r.axusdTotal, 2),
        totalValueUsd: fmtUsd(r.axusdTotal),
        locationBreakdown: snap.assets
          .find(a => a.symbol === 'AXUSD')!
          .locations.map(loc => ({
            label:       loc.label,
            contract:    loc.address!,
            balance:     fmtBal(loc.balance, 6),
            arbiscanUrl: arbiUrl(loc.address!),
          })),
      },
    ];

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      priceMov,
      stable,
      totals: {
        totalValueUsd:          fmtUsd(totalReserveUsd),
        coverageRatio:          coverageRatio !== null ? coverageRatio.toFixed(4) : null,
        coverageRatioPct:       coverageRatio !== null ? (coverageRatio * 100).toFixed(2) : null,
        coverageNote:           snap.notes.coverage,
        axusdCirculatingSupply: fmtUsd(axusdCirculatingSupply),
      },
      freshness: {
        fetchedAt:           snap.fetchedAt,
        dataAgeSeconds,
        bitgoDataAgeSeconds: r.bitgoDataAgeSeconds,
        isBitgoStale,
      },
      deployer:  DEPLOYER_EOA,
      timestamp: snap.fetchedAt,
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
