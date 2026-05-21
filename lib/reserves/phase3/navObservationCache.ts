/**
 * lib/reserves/phase3/navObservationCache.ts
 *
 * Phase 4 — In-memory NAV observation cache with per-source TTLs.
 *
 * Prevents hammering external APIs on every request. The TreasuryNAVOracleService
 * reads from this cache; the NavPollingService writes to it on schedule.
 *
 * TTLs by source type:
 *   CHAINLINK:          5 minutes  (on-chain, fast heartbeat)
 *   ISSUER_NAV_API:     60 minutes (daily NAV issuers, publish once/day)
 *   CUSTODIAN_ATTESTATION: 6 hours (BitGo attestation, slow-changing)
 *   FIXED_PEG:          never expires
 *   INTERNAL_ACCOUNTING: 1 hour
 */

import type { NAVObservation } from './types';

const CACHE_TTL_MS: Record<string, number> = {
  CHAINLINK:              5 * 60 * 1000,
  ISSUER_NAV_API:         60 * 60 * 1000,
  CUSTODIAN_ATTESTATION:  6 * 60 * 60 * 1000,
  ERC4626_CONVERT_TO_ASSETS: 60 * 60 * 1000,
  FIXED_PEG:              365 * 24 * 60 * 60 * 1000,
  INTERNAL_ACCOUNTING:    60 * 60 * 1000,
  MANUAL_OPERATOR_INPUT:  24 * 60 * 60 * 1000,
  FALLBACK_COMPOSITE:     15 * 60 * 1000,
  DEX_TWAP:               5 * 60 * 1000,
};

interface CacheEntry {
  observation: NAVObservation;
  cachedAt: number;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry>();

export function setObservationCache(assetId: string, observation: NAVObservation): void {
  const ttlMs = CACHE_TTL_MS[observation.sourceType] ?? 60 * 60 * 1000;
  const now = Date.now();
  _cache.set(assetId, {
    observation,
    cachedAt: now,
    expiresAt: now + ttlMs,
  });
}

export function getObservationFromCache(assetId: string): NAVObservation | null {
  const entry = _cache.get(assetId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Keep stale cache for fallback — TreasuryNAVOracleService will mark as stale
    return entry.observation;
  }
  return entry.observation;
}

export function isCacheEntryFresh(assetId: string): boolean {
  const entry = _cache.get(assetId);
  if (!entry) return false;
  return Date.now() <= entry.expiresAt;
}

export function getCacheEntry(assetId: string): CacheEntry | null {
  return _cache.get(assetId) ?? null;
}

export function clearCache(): void {
  _cache.clear();
}

export function getCacheStats(): {
  entries: number;
  fresh: number;
  stale: number;
  assets: Array<{ assetId: string; sourceType: string; cachedAt: string; expiresAt: string; isFresh: boolean }>;
} {
  const now = Date.now();
  const assets = Array.from(_cache.entries()).map(([assetId, entry]) => ({
    assetId,
    sourceType: entry.observation.sourceType,
    cachedAt: new Date(entry.cachedAt).toISOString(),
    expiresAt: new Date(entry.expiresAt).toISOString(),
    isFresh: now <= entry.expiresAt,
  }));
  return {
    entries: _cache.size,
    fresh: assets.filter(a => a.isFresh).length,
    stale: assets.filter(a => !a.isFresh).length,
    assets,
  };
}
