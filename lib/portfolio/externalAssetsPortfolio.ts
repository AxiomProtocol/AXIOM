/**
 * External Assets Portfolio composer
 *
 * Unified wallet-aware view of external supported asset balances:
 *   USDC, PAXG, XAUT, WBTC, cbETH.
 *
 * Hard rules:
 *   - Read-only. No DB writes. No contract writes. No banking rails.
 *   - All balances are wallet-derived from on-chain ERC-20 balanceOf reads.
 *   - No internal ledgering. No deposits. No transfers. No synthetic balances.
 *   - If a price is unavailable, USD value is null and a structured warning is
 *     attached — no fallback fake numbers.
 *   - Axiom does NOT issue or custody any of these assets.
 */

import {
  getAssetBalance,
  isValidEvmAddress,
  listSupportedAssets,
  SUPPORTED_SYMBOLS,
  type AssetMetadata,
  type SupportedSymbol,
} from '../assets/externalAssetService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ExternalAssetPosition {
  symbol: SupportedSymbol;
  name: string;
  category: AssetMetadata['category'];
  productStatus: 'EXTERNAL_SUPPORTED';
  axiomIssued: false;
  axiomCustodies: false;
  issuer: string;
  chain: string;
  chainId: number;
  contractAddress: string;
  rawBalance: string;
  formattedBalance: string;
  quantity: number;
  unit: string;
  unitPriceUsd: number | null;
  estimatedUsdValue: number | null;
  allocationPct: number | null;
  oracleSource: string;
  warnings: string[];
}

export interface ExternalAssetsPortfolio {
  walletAddress: string;
  positions: ExternalAssetPosition[];
  totals: {
    totalUsdValue: number | null;
    byCategory: Record<string, number | null>;
  };
  warnings: string[];
  disclosures: string[];
  fetchedAt: string;
}

// ─── Disclosures ───────────────────────────────────────────────────────────────

export const EXTERNAL_ASSETS_DISCLOSURES: string[] = [
  'Axiom does not issue any of these assets.',
  'Axiom does not directly custody the underlying reserves of these assets.',
  'Read-only support: metadata, balance reads, reference USD valuation, ' +
    'disclosure, portfolio inclusion, insights inclusion. No swaps, no lending, ' +
    'no deposits, no withdrawals, no banking rails for these assets.',
  'Redemption rights for any asset depend on the underlying issuer\u2019s terms.',
  'AXAG is not live and is not issued.',
];

// ─── Public entrypoint ─────────────────────────────────────────────────────────

export { isValidEvmAddress };

export async function getExternalAssetsPortfolio(
  walletAddress: string,
): Promise<ExternalAssetsPortfolio> {
  if (!isValidEvmAddress(walletAddress)) {
    throw new Error('Invalid Ethereum address. Must be 0x followed by 40 hex characters.');
  }

  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  const meta = listSupportedAssets();
  const metaBySymbol = new Map<SupportedSymbol, AssetMetadata>(
    meta.map((m) => [m.symbol, m]),
  );

  const balanceResults = await Promise.allSettled(
    SUPPORTED_SYMBOLS.map((s) => getAssetBalance(s, walletAddress)),
  );

  const positions: ExternalAssetPosition[] = SUPPORTED_SYMBOLS.map((symbol, idx) => {
    const m = metaBySymbol.get(symbol)!;
    const r = balanceResults[idx];
    if (r.status === 'fulfilled') {
      const v = r.value;
      if (v.warnings.length > 0) warnings.push(...v.warnings);
      return {
        symbol,
        name: m.name,
        category: m.category,
        productStatus: 'EXTERNAL_SUPPORTED',
        axiomIssued: false,
        axiomCustodies: false,
        issuer: m.issuer,
        chain: v.chain,
        chainId: v.chainId,
        contractAddress: v.contractAddress,
        rawBalance: v.rawBalance,
        formattedBalance: v.formattedBalance,
        quantity: v.quantity,
        unit: v.unit,
        unitPriceUsd: v.unitPriceUsd,
        estimatedUsdValue: v.estimatedUsdValue,
        allocationPct: null,
        oracleSource: v.oracleSource,
        warnings: v.warnings,
      };
    } else {
      const errMsg = r.reason instanceof Error ? r.reason.message : 'unknown error';
      warnings.push(`${symbol} balance read failed: ${errMsg}`);
      return {
        symbol,
        name: m.name,
        category: m.category,
        productStatus: 'EXTERNAL_SUPPORTED',
        axiomIssued: false,
        axiomCustodies: false,
        issuer: m.issuer,
        chain: m.primaryChain,
        chainId: m.primaryChainId,
        contractAddress: m.contractAddress,
        rawBalance: '0',
        formattedBalance: '0',
        quantity: 0,
        unit: m.unit,
        unitPriceUsd: null,
        estimatedUsdValue: null,
        allocationPct: null,
        oracleSource: 'unavailable',
        warnings: [`Balance read failed: ${errMsg}`],
      };
    }
  });

  // Totals — only sum positions whose USD value is known. If any position is null,
  // total is null (we never silently zero-out unknowns).
  const valued = positions.filter((p) => p.estimatedUsdValue !== null);
  const totalUsdValue =
    valued.length === positions.length
      ? valued.reduce((s, p) => s + (p.estimatedUsdValue as number), 0)
      : null;

  // Per-category sums (null if any in-category position is null)
  const categories = Array.from(new Set(positions.map((p) => p.category)));
  const byCategory: Record<string, number | null> = {};
  for (const cat of categories) {
    const subset = positions.filter((p) => p.category === cat);
    if (subset.some((p) => p.estimatedUsdValue === null)) {
      byCategory[cat] = null;
    } else {
      byCategory[cat] = subset.reduce((s, p) => s + (p.estimatedUsdValue as number), 0);
    }
  }

  // Per-position allocation %
  for (const p of positions) {
    if (totalUsdValue !== null && totalUsdValue > 0 && p.estimatedUsdValue !== null) {
      p.allocationPct = (p.estimatedUsdValue / totalUsdValue) * 100;
    } else if (totalUsdValue === 0) {
      p.allocationPct = 0;
    } else {
      p.allocationPct = null;
    }
  }

  return {
    walletAddress,
    positions,
    totals: {
      totalUsdValue,
      byCategory,
    },
    warnings: Array.from(new Set(warnings)),
    disclosures: EXTERNAL_ASSETS_DISCLOSURES,
    fetchedAt,
  };
}
