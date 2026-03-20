/**
 * Server-side in-memory catalog cache for Cost Intelligence.
 *
 * Avoids repeated DB round-trips for catalog/category reads that change
 * infrequently. Uses a simple Map with TTL. Not distributed — each process
 * has its own cache (fine for Next.js serverless; survives warm instances).
 *
 * Pattern: wrap expensive provider calls with `catalogCache.wrap(key, fn)`.
 */

import { getCostIntelligenceConfig } from '../../../lib/config/costIntelligence';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<any>>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Fetch from cache or execute fn and cache the result */
  async wrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    this.set(key, fresh);
    return fresh;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; keys: string[] } {
    const now = Date.now();
    const liveKeys: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiresAt) liveKeys.push(key);
    }
    return { size: liveKeys.length, keys: liveKeys };
  }
}

function buildCatalogCache(): TtlCache {
  const config = getCostIntelligenceConfig();
  return new TtlCache(config.catalogCacheTtlMs);
}

export const catalogCache = buildCatalogCache();

export const CACHE_KEYS = {
  catalog: (providerKey: string, propertyType: string) => `catalog:${providerKey}:${propertyType}`,
  item: (providerKey: string, systemKey: string, condition: string) => `item:${providerKey}:${systemKey}:${condition}`,
  itemsBySystem: (providerKey: string, systemKey: string, propertyType: string) => `sys:${providerKey}:${systemKey}:${propertyType}`,
  regionalModifier: (providerKey: string, regionCode: string) => `region:${providerKey}:${regionCode}`,
} as const;
