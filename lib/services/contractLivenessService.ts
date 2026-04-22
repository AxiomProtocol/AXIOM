/**
 * Contract Liveness Service
 *
 * Lightweight on-chain bytecode check for Arbitrum One contracts. Used by
 * HomepageTruthService to back "live" status claims with positive on-chain
 * evidence rather than relying on route presence alone.
 *
 * - Uses raw JSON-RPC against the Alchemy endpoint (no extra deps).
 * - Caches results in-process for 5 minutes.
 * - Fails CLOSED: any RPC error returns `false`. Truth resolver downgrades
 *   the status row in that case.
 */

const ARBITRUM_RPC =
  (process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : null) ||
  (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    : null) ||
  'https://arb1.arbitrum.io/rpc';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  hasCode: boolean;
  byteLength: number;
  checkedAt: number;
}

const cache = new Map<string, CacheEntry>();

export interface LivenessResult {
  address: string;
  hasCode: boolean;
  byteLength: number;
  verifiedFrom: string;
  checkedAt: string;
}

async function rpcGetCode(address: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [address, 'latest'],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = await res.json();
    if (json?.error) throw new Error(`RPC error: ${json.error.message ?? 'unknown'}`);
    return typeof json?.result === 'string' ? json.result : '0x';
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkContractLiveness(address: string): Promise<LivenessResult> {
  const key = address.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return {
      address,
      hasCode: cached.hasCode,
      byteLength: cached.byteLength,
      verifiedFrom: 'eth_getCode:arbitrum-one (cached)',
      checkedAt: new Date(cached.checkedAt).toISOString(),
    };
  }

  try {
    const code = await rpcGetCode(address);
    const stripped = code.startsWith('0x') ? code.slice(2) : code;
    const byteLength = stripped.length / 2;
    const hasCode = byteLength > 0 && code !== '0x';
    const entry: CacheEntry = { hasCode, byteLength, checkedAt: Date.now() };
    cache.set(key, entry);
    return {
      address,
      hasCode,
      byteLength,
      verifiedFrom: 'eth_getCode:arbitrum-one',
      checkedAt: new Date(entry.checkedAt).toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[contractLiveness] check failed for', address, message);
    // Fail closed — caller should treat as not-live.
    return {
      address,
      hasCode: false,
      byteLength: 0,
      verifiedFrom: `eth_getCode:arbitrum-one (failed: ${message})`,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function checkMany(addresses: Record<string, string>): Promise<Record<string, LivenessResult>> {
  const entries = await Promise.all(
    Object.entries(addresses).map(async ([k, addr]) => [k, await checkContractLiveness(addr)] as const)
  );
  return Object.fromEntries(entries);
}

// Canonical Arbitrum One addresses used in homepage liveness checks.
// These mirror the values in lib/services/AXAUContractService.ts and
// lib/services/AXUSDTransactionService.ts. Single source of truth for
// homepage-level on-chain evidence.
export const HOMEPAGE_LIVENESS_TARGETS = {
  axusd: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
  axau: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
  psm: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922',
} as const;
