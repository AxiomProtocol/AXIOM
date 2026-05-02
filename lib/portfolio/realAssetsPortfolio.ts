/**
 * Real Assets Portfolio composer
 *
 * Composes a wallet-aware view of a user's real-asset holdings across:
 *   - AXUSD  (Axiom-issued stablecoin, Arbitrum One, pegged 1.00 USD)
 *   - AXAU   (Axiom-issued gold rail, Arbitrum One, NAV-derived USD)
 *   - KAG    (Kinesis Silver, Ethereum mainnet, EXTERNAL_SUPPORTED)
 *
 * Hard rules (Phase 1):
 *   - Read-only. No DB writes. No contract writes. No banking rails.
 *   - No AXAG issuance. No KAG custody. No swaps. No lending.
 *   - All balances are wallet-derived from on-chain ERC-20 balanceOf reads.
 *   - No synthetic balances. If a price is unavailable, USD value is null
 *     and a structured warning is attached — no fallback fake numbers.
 */

import { getKagBalance, getKagAssetMetadata } from '../commodities/kagService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProductStatus = 'LIVE' | 'EXTERNAL_SUPPORTED' | 'NOT_LIVE_NOT_ISSUED';
export type AssetCategory = 'STABLE' | 'GOLD' | 'SILVER';

export interface RealAssetPosition {
  symbol: 'AXUSD' | 'AXAU' | 'KAG';
  name: string;
  issuer: string;
  axiomIssued: boolean;
  reserveModel: string;
  chain: string;
  chainId: number;
  contractAddress: string;
  productStatus: ProductStatus;
  category: AssetCategory;
  rawBalance: string;
  formattedBalance: string;
  estimatedUnitUsd: number | null;
  estimatedUsdValue: number | null;
  allocationPct: number | null;
  oracleSource: string;
  riskDisclosureLabel: string;
  warnings: string[];
}

export interface RealAssetsPortfolio {
  walletAddress: string;
  positions: RealAssetPosition[];
  totals: {
    totalUsdValue: number | null;
    stableUsdValue: number | null;
    commodityUsdValue: number | null;
    goldUsdValue: number | null;
    silverUsdValue: number | null;
    axiomIssuedUsdValue: number | null;
    externalUsdValue: number | null;
    commodityVsStable: { stablePct: number | null; commodityPct: number | null };
    goldVsSilver: { goldPct: number | null; silverPct: number | null };
    axiomVsExternal: { axiomIssuedPct: number | null; externalPct: number | null };
  };
  warnings: string[];
  disclosures: string[];
  fetchedAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ARB_ONE_CHAIN_ID = 42161;
const ARB_ONE_NAME = 'Arbitrum One';

const AXUSD = {
  address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  decimals: 18,
};
const AXAU = {
  address: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
  decimals: 18,
};

const ALCHEMY_KEY =
  process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_ARB_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

// ─── Disclosures ───────────────────────────────────────────────────────────────

export const REAL_ASSETS_DISCLOSURES: string[] = [
  'KAG is issued by KMS Labs within the Kinesis ecosystem.',
  'Axiom supports KAG as an external commodity asset.',
  'Axiom does not issue KAG. Axiom does not issue AXAG in this phase.',
  'Axiom does not directly custody the underlying silver.',
  'Any redemption rights depend on KMS Labs / Kinesis terms.',
  'AXAG is not live and is not issued.',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUnits(rawDec: string, decimals: number): string {
  const n = BigInt(rawDec);
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 8);
  return fracStr.length === 0 ? whole.toString() : `${whole}.${fracStr}`;
}

function rawToNumber(rawDec: string, decimals: number): number {
  // Safe conversion to JS number for portfolio sizing — limited to 1e18 magnitude.
  const big = BigInt(rawDec);
  const divisor = 10n ** BigInt(decimals);
  const whole = Number(big / divisor);
  const frac = Number(big % divisor) / Number(divisor);
  return whole + frac;
}

async function arbRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(ALCHEMY_ARB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Alchemy Arbitrum RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

async function getArbBalance(
  walletAddress: string,
  tokenAddress: string,
): Promise<{ raw: string }> {
  const result = (await arbRpc('alchemy_getTokenBalances', [
    walletAddress,
    [tokenAddress],
  ])) as { tokenBalances: { contractAddress: string; tokenBalance: string | null }[] };

  const entry = result?.tokenBalances?.find(
    (t) => t.contractAddress?.toLowerCase() === tokenAddress.toLowerCase(),
  );
  const raw = entry?.tokenBalance ?? '0x0';
  return { raw: BigInt(raw).toString() };
}

// ─── Price helpers ────────────────────────────────────────────────────────────

const AXAU_PRICE_TTL_MS = 60_000;
const AXAU_PRICE_STALE_MS = 10 * 60_000;
let axauPriceCache: { usd: number; source: string; fetchedAt: number } | null = null;

/**
 * Implied USD per AXAU token.
 *
 * Phase 1 strategy:
 *   - Try CoinGecko `pax-gold` (USD per troy ounce of gold) as a clean,
 *     dependency-free reference price. AXAU is gold-backed and per-token
 *     ≈ 1 troy ounce of gold value (per current AXAU model).
 *   - Cached 60s; reuse stale within 10 minutes on upstream error.
 *   - On total failure, return null with a structured warning — no synthetic.
 *
 * NOTE: This is a reference-only USD value for portfolio sizing. It is NOT a
 * mint/redeem quote and does NOT reflect on-chain NAVEngine state. The AXAU
 * dashboard remains the authoritative NAV surface.
 */
async function getAxauUsdPerToken(): Promise<{
  usd: number | null;
  source: string;
  error?: string;
}> {
  const now = Date.now();
  if (axauPriceCache && now - axauPriceCache.fetchedAt < AXAU_PRICE_TTL_MS) {
    return { usd: axauPriceCache.usd, source: `${axauPriceCache.source} (cached)` };
  }

  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price' +
      '?ids=pax-gold&vs_currencies=usd';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const usd = json?.['pax-gold']?.usd;
    if (typeof usd !== 'number' || !isFinite(usd) || usd <= 0) {
      throw new Error('CoinGecko: pax-gold USD not present');
    }
    axauPriceCache = {
      usd,
      source: 'CoinGecko (pax-gold, USD per token ≈ per troy oz)',
      fetchedAt: now,
    };
    return { usd, source: axauPriceCache.source };
  } catch (err) {
    if (axauPriceCache && now - axauPriceCache.fetchedAt < AXAU_PRICE_STALE_MS) {
      const ageSec = Math.round((now - axauPriceCache.fetchedAt) / 1000);
      return {
        usd: axauPriceCache.usd,
        source: `${axauPriceCache.source} (stale ${ageSec}s, upstream unavailable)`,
        error:
          'AXAU reference price upstream unavailable; serving stale cached price within 10-minute window. ' +
          (err instanceof Error ? err.message : 'unknown error'),
      };
    }
    return {
      usd: null,
      source: 'CoinGecko pax-gold (unavailable)',
      error:
        'AXAU reference USD price unavailable. No fallback used. Detail: ' +
        (err instanceof Error ? err.message : 'unknown error'),
    };
  }
}

// Re-export the cached AXAU price helper for use by the insights service so
// both surfaces share a single in-process cache and avoid duplicate fetches.
export const _internal = { getAxauUsdPerToken };

// ─── Public entrypoint ─────────────────────────────────────────────────────────

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function getRealAssetsPortfolio(
  walletAddress: string,
): Promise<RealAssetsPortfolio> {
  if (!isValidEvmAddress(walletAddress)) {
    throw new Error('Invalid Ethereum address. Must be 0x followed by 40 hex characters.');
  }
  if (!ALCHEMY_KEY) {
    throw new Error('Alchemy API key not configured (ALCHEMY_API_KEY).');
  }

  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  // Parallel fan-out: AXUSD balance, AXAU balance, KAG balance, AXAU price.
  const [axusdRes, axauRes, kagRes, axauPriceRes] = await Promise.allSettled([
    getArbBalance(walletAddress, AXUSD.address),
    getArbBalance(walletAddress, AXAU.address),
    getKagBalance(walletAddress),
    getAxauUsdPerToken(),
  ]);

  // ── AXUSD position ────────────────────────────────────────────────────────
  let axusdRawBalance = '0';
  let axusdQty = 0;
  if (axusdRes.status === 'fulfilled') {
    axusdRawBalance = axusdRes.value.raw;
    axusdQty = rawToNumber(axusdRawBalance, AXUSD.decimals);
  } else {
    warnings.push(`AXUSD balance read failed: ${axusdRes.reason?.message ?? 'unknown error'}`);
  }
  const axusdUnitUsd = 1.0; // pegged stablecoin
  const axusdUsdValue = axusdRes.status === 'fulfilled' ? axusdQty * axusdUnitUsd : null;
  const axusdPosition: RealAssetPosition = {
    symbol: 'AXUSD',
    name: 'Axiom USD',
    issuer: 'Axiom Protocol',
    axiomIssued: true,
    reserveModel: 'ERC-3643 compliant Axiom-issued stablecoin (USD-pegged)',
    chain: ARB_ONE_NAME,
    chainId: ARB_ONE_CHAIN_ID,
    contractAddress: AXUSD.address,
    productStatus: 'LIVE',
    category: 'STABLE',
    rawBalance: axusdRawBalance,
    formattedBalance: formatUnits(axusdRawBalance, AXUSD.decimals),
    estimatedUnitUsd: axusdRes.status === 'fulfilled' ? axusdUnitUsd : null,
    estimatedUsdValue: axusdUsdValue,
    allocationPct: null,
    oracleSource: 'Pegged 1.00 USD',
    riskDisclosureLabel: 'Axiom-issued stablecoin — see /axusd',
    warnings: axusdRes.status === 'rejected' ? ['Balance read failed; value treated as null.'] : [],
  };

  // ── AXAU position ─────────────────────────────────────────────────────────
  let axauRawBalance = '0';
  let axauQty = 0;
  if (axauRes.status === 'fulfilled') {
    axauRawBalance = axauRes.value.raw;
    axauQty = rawToNumber(axauRawBalance, AXAU.decimals);
  } else {
    warnings.push(`AXAU balance read failed: ${axauRes.reason?.message ?? 'unknown error'}`);
  }

  let axauUnitUsd: number | null = null;
  let axauOracleSource = 'AXAU reference price (unavailable)';
  const axauPositionWarnings: string[] = [];
  if (axauPriceRes.status === 'fulfilled') {
    axauUnitUsd = axauPriceRes.value.usd;
    axauOracleSource = axauPriceRes.value.source;
    if (axauPriceRes.value.error) {
      axauPositionWarnings.push(axauPriceRes.value.error);
      warnings.push(axauPriceRes.value.error);
    }
  } else {
    axauPositionWarnings.push('AXAU reference price unavailable.');
    warnings.push('AXAU reference price unavailable.');
  }
  if (axauRes.status === 'rejected') {
    axauPositionWarnings.push('Balance read failed; value treated as null.');
  }

  const axauUsdValue =
    axauRes.status === 'fulfilled' && axauUnitUsd !== null ? axauQty * axauUnitUsd : null;

  const axauPosition: RealAssetPosition = {
    symbol: 'AXAU',
    name: 'Axiom Gold (AXAU)',
    issuer: 'Axiom Protocol',
    axiomIssued: true,
    reserveModel: 'PAXG-backed gold rail with NAVEngine on-chain backing snapshot',
    chain: ARB_ONE_NAME,
    chainId: ARB_ONE_CHAIN_ID,
    contractAddress: AXAU.address,
    productStatus: 'LIVE',
    category: 'GOLD',
    rawBalance: axauRawBalance,
    formattedBalance: formatUnits(axauRawBalance, AXAU.decimals),
    estimatedUnitUsd: axauUnitUsd,
    estimatedUsdValue: axauUsdValue,
    allocationPct: null,
    oracleSource: axauOracleSource,
    riskDisclosureLabel: 'Axiom-issued gold rail — see /axau-disclosure',
    warnings: axauPositionWarnings,
  };

  // ── KAG position ──────────────────────────────────────────────────────────
  const kagMeta = getKagAssetMetadata();
  let kagPosition: RealAssetPosition;

  if (kagRes.status === 'fulfilled') {
    const k = kagRes.value;
    kagPosition = {
      symbol: 'KAG',
      name: kagMeta.name,
      issuer: kagMeta.issuer,
      axiomIssued: false,
      reserveModel: kagMeta.reserveModel,
      chain: kagMeta.primaryChain,
      chainId: kagMeta.primaryChainId,
      contractAddress: kagMeta.contractAddress,
      productStatus: 'EXTERNAL_SUPPORTED',
      category: 'SILVER',
      rawBalance: k.rawBalance,
      formattedBalance: k.formattedBalance,
      estimatedUnitUsd: k.kagUsdPerGram,
      estimatedUsdValue: k.estimatedUsdValue,
      allocationPct: null,
      oracleSource: k.oracleSource,
      riskDisclosureLabel: 'External — KMS Labs / Kinesis',
      warnings: k.warnings ?? [],
    };
    if (k.warnings && k.warnings.length > 0) warnings.push(...k.warnings);
  } else {
    warnings.push(`KAG balance read failed: ${kagRes.reason?.message ?? 'unknown error'}`);
    kagPosition = {
      symbol: 'KAG',
      name: kagMeta.name,
      issuer: kagMeta.issuer,
      axiomIssued: false,
      reserveModel: kagMeta.reserveModel,
      chain: kagMeta.primaryChain,
      chainId: kagMeta.primaryChainId,
      contractAddress: kagMeta.contractAddress,
      productStatus: 'EXTERNAL_SUPPORTED',
      category: 'SILVER',
      rawBalance: '0',
      formattedBalance: '0',
      estimatedUnitUsd: null,
      estimatedUsdValue: null,
      allocationPct: null,
      oracleSource: 'unavailable',
      riskDisclosureLabel: 'External — KMS Labs / Kinesis',
      warnings: ['KAG balance read failed; value treated as null.'],
    };
  }

  const positions: RealAssetPosition[] = [axusdPosition, axauPosition, kagPosition];

  // ── Totals & allocations ──────────────────────────────────────────────────
  const valued = positions.filter((p) => p.estimatedUsdValue !== null);
  const totalUsdValue = valued.length === positions.length
    ? valued.reduce((s, p) => s + (p.estimatedUsdValue as number), 0)
    : null;

  const sumBy = (predicate: (p: RealAssetPosition) => boolean): number | null => {
    const subset = positions.filter(predicate);
    if (subset.some((p) => p.estimatedUsdValue === null)) return null;
    return subset.reduce((s, p) => s + (p.estimatedUsdValue as number), 0);
  };

  const stableUsd = sumBy((p) => p.category === 'STABLE');
  const commodityUsd = sumBy((p) => p.category !== 'STABLE');
  const goldUsd = sumBy((p) => p.category === 'GOLD');
  const silverUsd = sumBy((p) => p.category === 'SILVER');
  const axiomIssuedUsd = sumBy((p) => p.axiomIssued);
  const externalUsd = sumBy((p) => !p.axiomIssued);

  // Compute per-position allocation percentages (0–100), or null if total unknown.
  for (const p of positions) {
    if (totalUsdValue !== null && totalUsdValue > 0 && p.estimatedUsdValue !== null) {
      p.allocationPct = (p.estimatedUsdValue / totalUsdValue) * 100;
    } else if (totalUsdValue === 0) {
      p.allocationPct = 0;
    } else {
      p.allocationPct = null;
    }
  }

  const pct = (part: number | null, whole: number | null): number | null => {
    if (part === null || whole === null) return null;
    if (whole === 0) return 0;
    return (part / whole) * 100;
  };

  const goldVsSilverDenom =
    goldUsd !== null && silverUsd !== null ? goldUsd + silverUsd : null;

  return {
    walletAddress,
    positions,
    totals: {
      totalUsdValue,
      stableUsdValue: stableUsd,
      commodityUsdValue: commodityUsd,
      goldUsdValue: goldUsd,
      silverUsdValue: silverUsd,
      axiomIssuedUsdValue: axiomIssuedUsd,
      externalUsdValue: externalUsd,
      commodityVsStable: {
        stablePct: pct(stableUsd, totalUsdValue),
        commodityPct: pct(commodityUsd, totalUsdValue),
      },
      goldVsSilver: {
        goldPct: pct(goldUsd, goldVsSilverDenom),
        silverPct: pct(silverUsd, goldVsSilverDenom),
      },
      axiomVsExternal: {
        axiomIssuedPct: pct(axiomIssuedUsd, totalUsdValue),
        externalPct: pct(externalUsd, totalUsdValue),
      },
    },
    warnings: Array.from(new Set(warnings)),
    disclosures: REAL_ASSETS_DISCLOSURES,
    fetchedAt,
  };
}
