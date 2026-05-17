/**
 * lib/defi/navi/service.ts
 *
 * Read-only Navi Protocol market data service — Sui.
 * Uses Navi public REST API. Null-on-failure error policy.
 * Cache: 60 s in-process.
 */

const NAVI_API_BASE = 'https://api-defi.naviprotocol.io';
const CACHE_TTL = 60_000;

export interface NaviPoolEntry {
  coinType: string;
  symbol: string;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
  utilizationPct: number;
  supplyApyPct: number;
  borrowApyPct: number;
}

export interface NaviMarket {
  protocol: 'navi';
  chain: 'sui';
  chainType: 'non_evm';
  pools: NaviPoolEntry[];
  totalTvlUsd: number;
  fetchedAt: string;
}

function normalizePool(raw: Record<string, unknown>): NaviPoolEntry | null {
  try {
    const supply  = Number(raw['total_supply'] ?? raw['totalSupply'] ?? 0);
    const borrow  = Number(raw['total_borrow'] ?? raw['totalBorrow'] ?? 0);
    const avail   = Math.max(0, supply - borrow);
    const util    = supply > 0 ? (borrow / supply) * 100 : 0;
    const supApy  = Number(raw['supply_apy'] ?? raw['supplyApy'] ?? raw['supply_rate'] ?? 0) * 100;
    const borApy  = Number(raw['borrow_apy'] ?? raw['borrowApy'] ?? raw['borrow_rate'] ?? 0) * 100;
    const symbol  = String(raw['symbol'] ?? raw['coin_type'] ?? 'UNKNOWN').split('::').pop() ?? 'UNKNOWN';
    const coinType = String(raw['coin_type'] ?? raw['coinType'] ?? '');
    return {
      coinType,
      symbol,
      totalSupply: parseFloat(supply.toFixed(4)),
      totalBorrow: parseFloat(borrow.toFixed(4)),
      availableLiquidity: parseFloat(avail.toFixed(4)),
      utilizationPct: parseFloat(util.toFixed(2)),
      supplyApyPct: parseFloat(supApy.toFixed(4)),
      borrowApyPct: parseFloat(borApy.toFixed(4)),
    };
  } catch {
    return null;
  }
}

let _cache: { data: NaviMarket; ts: number } | null = null;

export async function getNaviMarket(): Promise<NaviMarket | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const res = await fetch(`${NAVI_API_BASE}/api/pool-info`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Navi API ${res.status}`);
    const json = await res.json() as unknown;

    let rawPools: Record<string, unknown>[] = [];
    if (Array.isArray(json)) {
      rawPools = json as Record<string, unknown>[];
    } else if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      const candidate = obj['data'] ?? obj['pools'] ?? obj['result'] ?? obj;
      rawPools = Array.isArray(candidate) ? candidate as Record<string, unknown>[] : [];
    }

    const pools = rawPools
      .map(normalizePool)
      .filter((p): p is NaviPoolEntry => p !== null);

    const totalTvlUsd = pools.reduce((s, p) => s + p.totalSupply, 0);
    const result: NaviMarket = {
      protocol: 'navi',
      chain: 'sui',
      chainType: 'non_evm',
      pools,
      totalTvlUsd,
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
