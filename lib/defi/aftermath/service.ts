/**
 * lib/defi/aftermath/service.ts
 *
 * Read-only Aftermath Finance pool data service — Sui.
 * Uses Aftermath public REST API. Null-on-failure error policy.
 * Cache: 60 s in-process.
 */

const AFTERMATH_API_BASE = 'https://aftermath.finance/api';
const CACHE_TTL = 60_000;

export interface AftermathPoolEntry {
  poolId: string;
  name: string;
  tvlUsd: number;
  volume24hUsd: number;
  feeAprPct: number;
  tokens: string[];
}

export interface AftermathPools {
  protocol: 'aftermath';
  chain: 'sui';
  chainType: 'non_evm';
  pools: AftermathPoolEntry[];
  totalTvlUsd: number;
  totalVolume24hUsd: number;
  fetchedAt: string;
}

function normalizePool(raw: Record<string, unknown>, id: string): AftermathPoolEntry | null {
  try {
    const tvl    = Number(raw['tvl'] ?? raw['tvlUsd'] ?? raw['total_value_locked'] ?? 0);
    const vol    = Number(raw['volume24h'] ?? raw['volume_24h'] ?? raw['volumeUsd24h'] ?? 0);
    const fee    = Number(raw['feeApr'] ?? raw['fee_apr'] ?? raw['apr'] ?? 0) * 100;
    const name   = String(raw['name'] ?? raw['pool_name'] ?? raw['lpCoinType'] ?? id).split('::').pop() ?? id;
    const coins  = (raw['coins'] ?? raw['tokens'] ?? raw['coinTypes'] ?? []);
    const tokens = Array.isArray(coins)
      ? (coins as unknown[]).map(c => String(c).split('::').pop() ?? String(c))
      : [];
    return {
      poolId: id,
      name,
      tvlUsd:       parseFloat(tvl.toFixed(2)),
      volume24hUsd: parseFloat(vol.toFixed(2)),
      feeAprPct:    parseFloat(fee.toFixed(4)),
      tokens,
    };
  } catch {
    return null;
  }
}

let _cache: { data: AftermathPools; ts: number } | null = null;

export async function getAftermathPools(): Promise<AftermathPools | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const res = await fetch(`${AFTERMATH_API_BASE}/pools`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Aftermath API ${res.status}`);
    const json = await res.json() as unknown;

    let pools: AftermathPoolEntry[] = [];

    if (Array.isArray(json)) {
      pools = (json as Record<string, unknown>[])
        .map((p, i) => normalizePool(p, String(p['poolId'] ?? p['id'] ?? i)))
        .filter((p): p is AftermathPoolEntry => p !== null);
    } else if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      const entries = obj['pools'] ?? obj['data'] ?? obj;
      if (typeof entries === 'object' && !Array.isArray(entries)) {
        pools = Object.entries(entries as Record<string, unknown>)
          .map(([id, raw]) => normalizePool(raw as Record<string, unknown>, id))
          .filter((p): p is AftermathPoolEntry => p !== null);
      } else if (Array.isArray(entries)) {
        pools = (entries as Record<string, unknown>[])
          .map((p, i) => normalizePool(p, String(p['poolId'] ?? p['id'] ?? i)))
          .filter((p): p is AftermathPoolEntry => p !== null);
      }
    }

    const sorted = pools.sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 20);
    const result: AftermathPools = {
      protocol: 'aftermath',
      chain: 'sui',
      chainType: 'non_evm',
      pools: sorted,
      totalTvlUsd:       sorted.reduce((s, p) => s + p.tvlUsd, 0),
      totalVolume24hUsd: sorted.reduce((s, p) => s + p.volume24hUsd, 0),
      fetchedAt: new Date().toISOString(),
    };
    _cache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return null;
  }
}
