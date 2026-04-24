import { CraftsmanLocalProvider, CraftsmanHttpProvider } from './craftsman';
import { catalogCache, CACHE_KEYS } from '../cache';
import { validateCostIntelligenceConfig } from '../../../../lib/config/costIntelligence';
import type { CostProvider, PropertyType, ConditionLevel } from '../../../../lib/cost-intelligence/types';

validateCostIntelligenceConfig();

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const _providers: Map<string, CostProvider> = new Map();

function registerProvider(p: CostProvider) {
  _providers.set(p.id, p);
}

registerProvider(new CraftsmanLocalProvider());
registerProvider(new CraftsmanHttpProvider());

export function getProvider(id: string): CostProvider {
  const p = _providers.get(id);
  if (!p) throw new Error(`Unknown cost provider: ${id}`);
  return p;
}

export async function getActiveProvider(): Promise<CostProvider> {
  const http = _providers.get('craftsman_http')!;
  if (await http.isAvailable()) return http;
  return _providers.get('craftsman_local')!;
}

export function listProviders(): { id: string; name: string; version: string }[] {
  return [..._providers.values()].map((p) => ({ id: p.id, name: p.name, version: p.version }));
}

// ---------------------------------------------------------------------------
// Cache-wrapped helpers (use these instead of calling provider methods directly)
// ---------------------------------------------------------------------------

export async function getCatalogCached(propertyType: PropertyType) {
  const provider = await getActiveProvider();
  const key = CACHE_KEYS.catalog(provider.id, propertyType);
  return catalogCache.wrap(key, () => provider.getCatalog(propertyType));
}

export async function getItemCached(systemKey: string, conditionLevel: ConditionLevel) {
  const provider = await getActiveProvider();
  const key = CACHE_KEYS.item(provider.id, systemKey, conditionLevel);
  return catalogCache.wrap(key, () => provider.getItem(systemKey, conditionLevel));
}

export async function getItemsBySystemCached(systemKey: string, propertyType: PropertyType) {
  const provider = await getActiveProvider();
  const key = CACHE_KEYS.itemsBySystem(provider.id, systemKey, propertyType);
  return catalogCache.wrap(key, () => provider.getItemsBySystem(systemKey, propertyType));
}

export async function getRegionalModifierCached(regionCode: string) {
  const provider = await getActiveProvider();
  const key = CACHE_KEYS.regionalModifier(provider.id, regionCode);
  return catalogCache.wrap(key, () => provider.getRegionalModifier(regionCode));
}

export function invalidateCatalogCache(): void {
  catalogCache.clear();
}

export { CraftsmanLocalProvider, CraftsmanHttpProvider };
