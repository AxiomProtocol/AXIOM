/**
 * Commodity Insights composer
 *
 * Reference-only commodity intelligence: gold spot, silver spot, gold/silver
 * ratio, AXAU implied USD per token, KAG implied USD per token, plus optional
 * wallet-context concentration analysis.
 *
 * Hard rules (Phase 1):
 *   - Read-only. No DB writes. No contract writes. No banking rails.
 *   - No trading signals. No buy/sell recommendations. No yield claims.
 *   - No automated rebalancing. No financial advice.
 *   - All numbers are reference-only. Null + structured warning on outage.
 *   - AXAG is NOT LIVE and NOT ISSUED — surfaced explicitly.
 */

import { getKagUsdValue } from './kagService';
import {
  getRealAssetsPortfolio,
  isValidEvmAddress,
  _internal as portfolioInternal,
} from '../portfolio/realAssetsPortfolio';
import {
  getAssetUsdValue,
  getAssetMetadata,
  SUPPORTED_SYMBOLS,
  type SupportedSymbol,
} from '../assets/externalAssetService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RiskLabel = 'HEALTHY' | 'WATCH' | 'DEGRADED' | 'CRITICAL';

const TROY_OZ_GRAMS = 31.1035;

export interface SpotMetric {
  usdPerTroyOz: number | null;
  usdPerGram: number | null;
  source: string;
  error?: string;
}

export interface AssetIntelligence {
  symbol: string;
  productStatus: 'LIVE' | 'EXTERNAL_SUPPORTED' | 'NOT_LIVE_NOT_ISSUED';
  issuer: string | null;
  impliedUsdPerToken: number | null;
  source: string;
  note: string;
  error?: string;
}

export interface PortfolioContext {
  walletAddress: string;
  goldUsdValue: number | null;
  silverUsdValue: number | null;
  commodityUsdValue: number | null;
  totalRealAssetsUsdValue: number | null;
  commoditySharePct: number | null;
  concentration: {
    label: RiskLabel;
    note: string;
    dominantAsset: string | null;
    dominantSharePct: number | null;
  };
}

export interface ExternalAssetIntelligence {
  symbol: string;
  productStatus: 'EXTERNAL_SUPPORTED';
  category: string;
  issuer: string;
  unitPriceUsd: number | null;
  source: string;
  note: string;
  axiomIssued: false;
  axiomCustodies: false;
  error?: string;
}

export interface AssetComparison {
  label: string;
  members: string[];
  note: string;
}

export interface CommodityInsights {
  goldSpot: SpotMetric;
  silverSpot: SpotMetric;
  goldSilverRatio: { value: number | null; note: string };
  axau: AssetIntelligence;
  kag: AssetIntelligence;
  axag: AssetIntelligence;
  externalSupported: ExternalAssetIntelligence[];
  comparisons: AssetComparison[];
  comparison: { summary: string; axauVsKag: string };
  oracleHealth: { label: RiskLabel; note: string };
  productMaturity: Array<{ symbol: string; status: string; note: string }>;
  portfolioContext: PortfolioContext | null;
  disclosures: string[];
  fetchedAt: string;
}

// ─── Disclosures ───────────────────────────────────────────────────────────────

const COMMODITY_DISCLOSURES: string[] = [
  'Reference only. This page is informational and does not constitute trading, investment, or rebalancing advice.',
  'No buy/sell recommendations are made. No yield is offered or implied.',
  'KAG is issued by KMS Labs within the Kinesis ecosystem.',
  'Axiom supports KAG as an external commodity asset.',
  'Axiom does not issue KAG. Axiom does not issue AXAG in this phase.',
  'Axiom does not directly custody the underlying silver.',
  'Any redemption rights depend on KMS Labs / Kinesis terms.',
  'AXAG is not live and is not issued.',
  'External supported assets (USDC, PAXG, XAUT, WBTC, cbETH) are not issued or ' +
    'custodied by Axiom. Read-only support only — no swaps, no lending, no deposits, ' +
    'no withdrawals, no banking rails. Redemption rights depend on each issuer.',
];

// ─── Public entrypoint ─────────────────────────────────────────────────────────

export async function getCommodityInsights(
  options: { walletAddress?: string } = {},
): Promise<CommodityInsights> {
  const fetchedAt = new Date().toISOString();
  const includePortfolio =
    typeof options.walletAddress === 'string' &&
    isValidEvmAddress(options.walletAddress);

  // Parallel fan-out
  const settled = await Promise.allSettled([
    getKagUsdValue(1),
    portfolioInternal.getAxauUsdPerToken(),
    includePortfolio
      ? getRealAssetsPortfolio(options.walletAddress as string)
      : Promise.resolve(null),
    ...SUPPORTED_SYMBOLS.map((s) => getAssetUsdValue(s, 1)),
  ]);
  const kagPriceRes = settled[0] as PromiseSettledResult<Awaited<ReturnType<typeof getKagUsdValue>>>;
  const axauPriceRes = settled[1] as PromiseSettledResult<Awaited<ReturnType<typeof portfolioInternal.getAxauUsdPerToken>>>;
  const portfolioRes = settled[2] as PromiseSettledResult<Awaited<ReturnType<typeof getRealAssetsPortfolio>> | null>;
  const externalPriceResults = settled.slice(3) as PromiseSettledResult<Awaited<ReturnType<typeof getAssetUsdValue>>>[];

  // ── Silver spot (from KAG) ────────────────────────────────────────────────
  let silverSpot: SpotMetric;
  if (kagPriceRes.status === 'fulfilled') {
    const k = kagPriceRes.value;
    silverSpot = {
      usdPerTroyOz: k.xagUsdPerTroyOz,
      usdPerGram: k.kagUsdPerGram,
      source: k.oracleSource,
      ...(k.error ? { error: k.error } : {}),
    };
  } else {
    silverSpot = {
      usdPerTroyOz: null,
      usdPerGram: null,
      source: 'unavailable',
      error: `Silver spot fetch failed: ${kagPriceRes.reason?.message ?? 'unknown'}`,
    };
  }

  // ── Gold spot (from AXAU pax-gold reference) ──────────────────────────────
  let goldSpot: SpotMetric;
  if (axauPriceRes.status === 'fulfilled') {
    const a = axauPriceRes.value;
    goldSpot = {
      usdPerTroyOz: a.usd,
      usdPerGram: a.usd !== null ? a.usd / TROY_OZ_GRAMS : null,
      source: a.source,
      ...(a.error ? { error: a.error } : {}),
    };
  } else {
    goldSpot = {
      usdPerTroyOz: null,
      usdPerGram: null,
      source: 'unavailable',
      error: `Gold spot fetch failed: ${axauPriceRes.reason?.message ?? 'unknown'}`,
    };
  }

  // ── Gold/silver ratio ─────────────────────────────────────────────────────
  let ratio: number | null = null;
  let ratioNote: string;
  if (goldSpot.usdPerTroyOz !== null && silverSpot.usdPerTroyOz !== null && silverSpot.usdPerTroyOz > 0) {
    ratio = goldSpot.usdPerTroyOz / silverSpot.usdPerTroyOz;
    ratioNote =
      'Gold/silver ratio = USD per troy oz of gold ÷ USD per troy oz of silver. ' +
      'Reference only — historical context, not a trading signal.';
  } else {
    ratioNote =
      'Gold/silver ratio unavailable: one or both spot prices are missing. ' +
      'No fallback used.';
  }

  // ── Asset intelligence rows ───────────────────────────────────────────────
  const axau: AssetIntelligence = {
    symbol: 'AXAU',
    productStatus: 'LIVE',
    issuer: 'Axiom Protocol',
    impliedUsdPerToken: goldSpot.usdPerTroyOz,
    source: goldSpot.source,
    note:
      'AXAU is Axiom\u2019s gold rail. Implied USD value shown here is a ' +
      'CoinGecko pax-gold reference (USD per troy oz). The authoritative ' +
      'on-chain NAV is published by NAVEngine — see /axau for live system state.',
    ...(goldSpot.error ? { error: goldSpot.error } : {}),
  };

  const kag: AssetIntelligence = {
    symbol: 'KAG',
    productStatus: 'EXTERNAL_SUPPORTED',
    issuer: 'KMS Labs (Kinesis)',
    impliedUsdPerToken: silverSpot.usdPerGram,
    source: silverSpot.source,
    note:
      '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver. Implied USD per ' +
      'token = CoinGecko kinesis-silver direct (USD per gram). KAG is supported ' +
      'as an external commodity asset; redemption rights depend on KMS Labs / ' +
      'Kinesis terms.',
    ...(silverSpot.error ? { error: silverSpot.error } : {}),
  };

  const axag: AssetIntelligence = {
    symbol: 'AXAG',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    issuer: null,
    impliedUsdPerToken: null,
    source: 'n/a (not issued)',
    note:
      'AXAG is not live and is not issued. The wrapper-token path is deferred. ' +
      'Phase 1 is direct KAG support only. No AXAG token exists.',
  };

  // ── Comparison summary ────────────────────────────────────────────────────
  const summaryParts: string[] = [];
  summaryParts.push(
    'AXAU is Axiom-issued and live on Arbitrum One. KAG is external (KMS Labs / Kinesis) and supported on Ethereum mainnet. AXAG is not live and is not issued.',
  );
  if (ratio !== null) {
    summaryParts.push(
      `Current gold/silver ratio is approximately ${ratio.toFixed(1)}:1 (reference only).`,
    );
  }
  const summary = summaryParts.join(' ');

  const axauVsKag =
    'AXAU = Axiom-issued, NAVEngine-backed, Arbitrum One. ' +
    'KAG = external KMS Labs ERC-20, Ethereum mainnet, Axiom-supported (read-only). ' +
    'These are different products with different issuers, custodians, chains, and risk profiles.';

  // ── Oracle health ─────────────────────────────────────────────────────────
  const goldOk = goldSpot.usdPerTroyOz !== null;
  const silverOk = silverSpot.usdPerTroyOz !== null;
  let oracleHealth: { label: RiskLabel; note: string };
  if (goldOk && silverOk) {
    const stale =
      goldSpot.source.includes('stale') || silverSpot.source.includes('stale');
    oracleHealth = stale
      ? { label: 'WATCH', note: 'One or more reference prices are serving from stale cache.' }
      : { label: 'HEALTHY', note: 'All reference price sources returning fresh data.' };
  } else if (!goldOk && !silverOk) {
    oracleHealth = {
      label: 'CRITICAL',
      note: 'Both gold and silver reference prices unavailable. No fallback used.',
    };
  } else {
    oracleHealth = {
      label: 'DEGRADED',
      note: `${goldOk ? 'Silver' : 'Gold'} reference price unavailable.`,
    };
  }

  // ── Product maturity ──────────────────────────────────────────────────────
  const productMaturity = [
    { symbol: 'AXAU', status: 'Axiom-issued / live', note: 'Gold rail on Arbitrum One.' },
    {
      symbol: 'KAG',
      status: 'External supported asset',
      note: 'Issued by KMS Labs within the Kinesis ecosystem; Axiom read-only.',
    },
    {
      symbol: 'AXAG',
      status: 'Not live / not issued',
      note: 'Wrapper-token path deferred. No AXAG token exists.',
    },
  ];

  // ── Optional portfolio context ────────────────────────────────────────────
  let portfolioContext: PortfolioContext | null = null;
  if (includePortfolio && portfolioRes.status === 'fulfilled' && portfolioRes.value) {
    const p = portfolioRes.value;
    const total = p.totals.totalUsdValue;
    const commodity = p.totals.commodityUsdValue;

    // Concentration: dominant asset by allocationPct.
    const ranked = p.positions
      .filter((pos) => pos.allocationPct !== null)
      .sort((a, b) => (b.allocationPct as number) - (a.allocationPct as number));
    const dominant = ranked[0] ?? null;
    const dominantPct = dominant?.allocationPct ?? null;

    let concentrationLabel: RiskLabel = 'HEALTHY';
    let concentrationNote = 'Allocation appears reasonably distributed across positions.';
    if (dominantPct !== null) {
      if (dominantPct >= 95) {
        concentrationLabel = 'CRITICAL';
        concentrationNote = `${dominant?.symbol} represents ≥95% of the basket. Single-asset concentration is extreme. Reference only — not a rebalancing instruction.`;
      } else if (dominantPct >= 80) {
        concentrationLabel = 'DEGRADED';
        concentrationNote = `${dominant?.symbol} represents ≥80% of the basket. Reference only — not a rebalancing instruction.`;
      } else if (dominantPct >= 60) {
        concentrationLabel = 'WATCH';
        concentrationNote = `${dominant?.symbol} represents ≥60% of the basket. Reference only — not a rebalancing instruction.`;
      }
    }
    if (total === 0) {
      concentrationLabel = 'HEALTHY';
      concentrationNote = 'No real-asset positions held in this wallet.';
    }

    portfolioContext = {
      walletAddress: p.walletAddress,
      goldUsdValue: p.totals.goldUsdValue,
      silverUsdValue: p.totals.silverUsdValue,
      commodityUsdValue: commodity,
      totalRealAssetsUsdValue: total,
      commoditySharePct: p.totals.commodityVsStable.commodityPct,
      concentration: {
        label: concentrationLabel,
        note: concentrationNote,
        dominantAsset: dominant?.symbol ?? null,
        dominantSharePct: dominantPct,
      },
    };
  } else if (includePortfolio && portfolioRes.status === 'rejected') {
    // Portfolio was requested but failed — surface a soft warning by leaving
    // portfolioContext null. The page renders an empty state.
  }

  // ── External supported assets intelligence rows ──────────────────────────
  const categoryLabelOf = (c: string): string => {
    switch (c) {
      case 'STABLE': return 'Reserve-grade stable';
      case 'GOLD': return 'Gold';
      case 'BTC': return 'BTC reference';
      case 'STAKED_ETH': return 'Staked ETH (yield-bearing)';
      default: return c;
    }
  };

  const externalSupported: ExternalAssetIntelligence[] = SUPPORTED_SYMBOLS.map(
    (sym: SupportedSymbol, idx: number) => {
      const meta = getAssetMetadata(sym);
      const r = externalPriceResults[idx];
      const baseNote =
        sym === 'cbETH'
          ? '1 cbETH represents an evolving claim on staked ETH; cbETH/ETH ratio increases over time. Reference USD shown is CoinGecko spot. Axiom does not issue or custody cbETH; no yield is offered or implied by Axiom.'
          : sym === 'WBTC'
          ? '1 WBTC is intended to represent 1 BTC under the WBTC custodial model. Reference USD shown is CoinGecko spot. Axiom does not issue or custody WBTC.'
          : sym === 'USDC'
          ? '1 USDC = 1 USD reference. Issued by Circle. Axiom does not issue USDC; AXUSD is the Axiom-issued stable layer and is independent of USDC.'
          : sym === 'PAXG'
          ? '1 PAXG ≈ 1 troy ounce of LBMA gold (Paxos / NYDFS). Axiom does not issue PAXG; AXAU is the Axiom-issued gold rail and is independent of PAXG.'
          : sym === 'XAUT'
          ? '1 XAUT ≈ 1 troy ounce of LBMA gold (TG Commodities, BVI). Axiom does not issue XAUT.'
          : '';

      if (r.status === 'fulfilled') {
        return {
          symbol: sym,
          productStatus: 'EXTERNAL_SUPPORTED' as const,
          category: categoryLabelOf(meta.category),
          issuer: meta.issuer,
          unitPriceUsd: r.value.unitPriceUsd,
          source: r.value.oracleSource,
          note: baseNote,
          axiomIssued: false as const,
          axiomCustodies: false as const,
          ...(r.value.error ? { error: r.value.error } : {}),
        };
      }
      return {
        symbol: sym,
        productStatus: 'EXTERNAL_SUPPORTED' as const,
        category: categoryLabelOf(meta.category),
        issuer: meta.issuer,
        unitPriceUsd: null,
        source: 'unavailable',
        note: baseNote,
        axiomIssued: false as const,
        axiomCustodies: false as const,
        error: `Reference USD price unavailable: ${r.reason instanceof Error ? r.reason.message : 'unknown error'}`,
      };
    },
  );

  // ── Cross-asset comparisons (reference only — not advice) ────────────────
  const comparisons: AssetComparison[] = [
    {
      label: 'Gold rails: AXAU vs PAXG vs XAUT',
      members: ['AXAU', 'PAXG', 'XAUT'],
      note:
        'AXAU is the Axiom-issued gold rail on Arbitrum One with on-chain NAV via NAVEngine. ' +
        'PAXG (Paxos / NYDFS) and XAUT (TG Commodities / BVI) are external gold tokens, each ' +
        '~1 troy ounce of LBMA gold. Different issuers, jurisdictions, custody models, and ' +
        'redemption terms — reference comparison only.',
    },
    {
      label: 'Stable layer: AXUSD vs USDC',
      members: ['AXUSD', 'USDC'],
      note:
        'AXUSD is the Axiom-issued, ERC-3643 compliant stable layer used for protocol settlement. ' +
        'USDC is Circle\u2019s USD-referenced stablecoin, supported by Axiom as an external read-only ' +
        'asset. Different issuers, reserve compositions, regulatory frameworks — reference only.',
    },
    {
      label: 'BTC reference benchmark: WBTC',
      members: ['WBTC'],
      note:
        'WBTC is the BTC reference benchmark used for portfolio sizing and disclosure. ' +
        'Custody is held by BitGo Trust Company; Axiom does not issue or custody WBTC.',
    },
    {
      label: 'Yield-bearing staked-ETH benchmark: cbETH',
      members: ['cbETH'],
      note:
        'cbETH is the yield-bearing staked-ETH benchmark; the cbETH/ETH ratio changes over time ' +
        'as Coinbase staking rewards accrue. cbETH is NOT a 1:1 ETH wrapper. ' +
        'Axiom does not issue, custody, or stake cbETH, and does not offer or imply any yield.',
    },
    {
      label: 'Silver benchmark: KAG',
      members: ['KAG'],
      note:
        'KAG remains the silver benchmark — 1 KAG = 1 gram of LBMA Good Delivery 999 fine silver, ' +
        'issued by KMS Labs in the Kinesis ecosystem. Axiom does not issue KAG. AXAG is not live.',
    },
  ];

  return {
    goldSpot,
    silverSpot,
    goldSilverRatio: { value: ratio, note: ratioNote },
    axau,
    kag,
    axag,
    externalSupported,
    comparisons,
    comparison: { summary, axauVsKag },
    oracleHealth,
    productMaturity,
    portfolioContext,
    disclosures: COMMODITY_DISCLOSURES,
    fetchedAt,
  };
}
