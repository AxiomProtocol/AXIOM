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

export interface CommodityInsights {
  goldSpot: SpotMetric;
  silverSpot: SpotMetric;
  goldSilverRatio: { value: number | null; note: string };
  axau: AssetIntelligence;
  kag: AssetIntelligence;
  axag: AssetIntelligence;
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
  const [kagPriceRes, axauPriceRes, portfolioRes] = await Promise.allSettled([
    getKagUsdValue(1),
    portfolioInternal.getAxauUsdPerToken(),
    includePortfolio
      ? getRealAssetsPortfolio(options.walletAddress as string)
      : Promise.resolve(null),
  ]);

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

  return {
    goldSpot,
    silverSpot,
    goldSilverRatio: { value: ratio, note: ratioNote },
    axau,
    kag,
    axag,
    comparison: { summary, axauVsKag },
    oracleHealth,
    productMaturity,
    portfolioContext,
    disclosures: COMMODITY_DISCLOSURES,
    fetchedAt,
  };
}
