import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import { AXAU_ADDRESSES } from "../../../lib/services/AXAUContractService";

/**
 * GET /api/axau/identity-check?wallet=0x...
 *
 * Calls AXAUTokenLite3643.isVerified(wallet) read-only via provider.
 * Returns {verified: boolean, wallet: string (checksummed), contractAddress: string}
 *
 * Module-level TTL cache (30s, max 500 entries, lazy eviction).
 * Cache key = checksummed EIP-55 address to prevent case-based misses.
 */

const IDENTITY_ABI = [
  "function isVerified(address account) view returns (bool)",
] as const;

const CACHE_TTL_MS  = 30_000;
const CACHE_MAX     = 500;
const CACHE_EVICT   = 100;

interface CacheEntry {
  verified:  boolean;
  cachedAt:  number;
}

// Insertion-order Map — oldest entries are iterated first (used for eviction)
const _cache = new Map<string, CacheEntry>();

function cacheGet(key: string): boolean | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.verified;
}

function cacheSet(key: string, verified: boolean): void {
  if (_cache.size >= CACHE_MAX) {
    // Lazy eviction: delete the oldest CACHE_EVICT entries
    let count = 0;
    for (const k of _cache.keys()) {
      _cache.delete(k);
      if (++count >= CACHE_EVICT) break;
    }
  }
  _cache.set(key, { verified, cachedAt: Date.now() });
}

function getProvider(): ethers.JsonRpcProvider {
  const key = process.env.ALCHEMY_API_KEY ?? "";
  const url  = key
    ? `https://arb-mainnet.g.alchemy.com/v2/${key}`
    : process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
  return new ethers.JsonRpcProvider(url);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "wallet query parameter required" });
  }

  if (!ethers.isAddress(wallet)) {
    return res.status(422).json({ error: "Invalid Ethereum address" });
  }

  // Normalize to checksummed EIP-55 address (prevents case-based cache misses)
  const normalizedWallet = ethers.getAddress(wallet);

  // Check cache first
  const cached = cacheGet(normalizedWallet);
  if (cached !== null) {
    return res.status(200).json({
      verified:        cached,
      wallet:          normalizedWallet,
      contractAddress: AXAU_ADDRESSES.AXAUTokenLite3643,
    });
  }

  try {
    const provider = getProvider();
    const token    = new ethers.Contract(
      AXAU_ADDRESSES.AXAUTokenLite3643,
      IDENTITY_ABI,
      provider,
    );

    const verified: boolean = await token.isVerified(normalizedWallet);

    cacheSet(normalizedWallet, verified);

    return res.status(200).json({
      verified,
      wallet:          normalizedWallet,
      contractAddress: AXAU_ADDRESSES.AXAUTokenLite3643,
    });
  } catch (err: unknown) {
    console.error("[axau/identity-check]", err instanceof Error ? err.message : String(err));
    // On-chain / RPC failure → 503 (service dependency unavailable), not 500
    return res.status(503).json({ error: "Identity check temporarily unavailable" });
  }
}
