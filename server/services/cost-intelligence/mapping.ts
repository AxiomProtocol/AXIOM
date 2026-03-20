import type { ScopeItem, CostItem, MappingResult, ConditionLevel, PropertyType } from '../../../lib/cost-intelligence/types';
import { getActiveProvider } from './providers/index';

const CONDITION_KEYWORDS: Record<ConditionLevel, string[]> = {
  light_rehab: ['light', 'minor', 'cosmetic', 'clean', 'patch', 'touch', 'refresh'],
  medium_rehab: ['medium', 'moderate', 'partial', 'update', 'replace', 'standard'],
  full_replace: ['full', 'gut', 'complete', 'total', 'all new', 'demolish', 'rebuild', 'heavy'],
};

const SYSTEM_SYNONYMS: Record<string, string[]> = {
  kitchen: ['kitchen', 'cabinets', 'countertops', 'counter top', 'cabinet'],
  bathroom: ['bathroom', 'bath', 'tub', 'shower', 'vanity', 'toilet', 'restroom'],
  flooring: ['floor', 'flooring', 'carpet', 'tile', 'hardwood', 'vinyl', 'lvp', 'lvt', 'laminate'],
  appliances: ['appliances', 'appliance', 'fridge', 'refrigerator', 'stove', 'range', 'dishwasher', 'microwave', 'washer', 'dryer'],
  hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'heat pump', 'ductwork'],
  windows: ['window', 'windows', 'glass', 'glazing'],
  paint: ['paint', 'painting', 'drywall', 'texture', 'primer', 'wall'],
  plumbing: ['plumbing', 'pipe', 'pipes', 'water heater', 'drain', 'supply line', 'faucet'],
  electrical: ['electrical', 'electric', 'wiring', 'panel', 'circuit', 'outlet', 'switch', 'light fixture'],
  doors: ['door', 'doors', 'entry door', 'interior door', 'exterior door', 'hardware'],
  exterior: ['exterior', 'siding', 'fascia', 'soffit', 'trim', 'cladding'],
  roof: ['roof', 'roofing', 'shingles', 'flashing', 'gutter'],
  foundation: ['foundation', 'crawlspace', 'basement', 'slab', 'waterproof'],
  garage: ['garage', 'garage door', 'carport'],
  landscaping: ['landscape', 'landscaping', 'lawn', 'grass', 'sod', 'mulch', 'irrigation', 'yard'],
  common_area: ['common area', 'lobby', 'hallway', 'corridor', 'common'],
  laundry_room: ['laundry', 'washer', 'dryer'],
  site_parking: ['parking', 'lot', 'asphalt', 'concrete', 'driveway', 'curb'],
  other: ['other', 'misc', 'general', 'cleanup', 'haul', 'demolition'],
};

export async function mapScopeItemToBenchmark(
  scopeItem: ScopeItem,
  propertyType: PropertyType,
): Promise<MappingResult> {
  const provider = await getActiveProvider();

  const systemKey = inferSystemKey(scopeItem.itemName, scopeItem.trade, scopeItem.areaLabel);
  const conditionLevel = inferConditionLevel(scopeItem);

  let costItem: CostItem | null = null;
  let confidence = 0;
  let matchReason = '';
  let alternatives: CostItem[] = [];

  if (systemKey && conditionLevel) {
    costItem = await provider.getItem(systemKey, conditionLevel);
    if (costItem) {
      confidence = 0.88;
      matchReason = `System '${systemKey}' matched from item name; condition '${conditionLevel}' inferred from scope.`;
    }
  }

  if (!costItem && systemKey) {
    const allItems = await provider.getItemsBySystem(systemKey, propertyType);
    alternatives = allItems;
    if (allItems.length > 0) {
      const sorted = [...allItems].sort((a, b) => {
        const order: Record<string, number> = { light_rehab: 1, medium_rehab: 2, full_replace: 3 };
        return order[a.conditionLevel] - order[b.conditionLevel];
      });
      costItem = sorted[1] || sorted[0];
      confidence = 0.65;
      matchReason = `System '${systemKey}' matched; condition level assumed medium from item pool.`;
    }
  }

  if (!costItem) {
    const searchResults = await provider.searchItems(scopeItem.itemName, propertyType);
    alternatives = searchResults;
    if (searchResults.length > 0) {
      costItem = searchResults[0];
      confidence = 0.45;
      matchReason = `Keyword search match on '${scopeItem.itemName}'.`;
    }
  }

  if (!costItem) {
    confidence = 0;
    matchReason = 'No matching cost item found. Manual mapping required.';
  }

  return {
    scopeItemId: scopeItem.id || '',
    costItem,
    confidence,
    method: scopeItem.mappingMethod || 'auto',
    matchReason,
    alternatives: alternatives.filter((a) => a.id !== costItem?.id).slice(0, 3),
  };
}

export function inferSystemKey(itemName: string, trade?: string, areaLabel?: string): string | null {
  const haystack = `${itemName} ${trade || ''} ${areaLabel || ''}`.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [system, synonyms] of Object.entries(SYSTEM_SYNONYMS)) {
    for (const syn of synonyms) {
      if (haystack.includes(syn)) {
        const score = syn.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = system;
        }
      }
    }
  }

  return bestMatch;
}

export function inferConditionLevel(scopeItem: ScopeItem): ConditionLevel | null {
  if (scopeItem.condition && ['light_rehab', 'medium_rehab', 'full_replace'].includes(scopeItem.condition)) {
    return scopeItem.condition as ConditionLevel;
  }

  const text = `${scopeItem.itemName} ${scopeItem.scopeNote || ''} ${scopeItem.repairOrReplace}`.toLowerCase();

  for (const [level, keywords] of Object.entries(CONDITION_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return level as ConditionLevel;
    }
  }

  if (scopeItem.severity) {
    if (scopeItem.severity === 'low') return 'light_rehab';
    if (scopeItem.severity === 'medium') return 'medium_rehab';
    if (scopeItem.severity === 'high' || scopeItem.severity === 'critical') return 'full_replace';
  }

  return 'medium_rehab';
}

export function computeMappingConfidence(results: MappingResult[]): number {
  if (!results.length) return 0;
  const mapped = results.filter((r) => r.costItem !== null);
  const completeness = mapped.length / results.length;
  const avgConf = mapped.length
    ? mapped.reduce((s, r) => s + r.confidence, 0) / mapped.length
    : 0;
  return Math.round((completeness * 0.5 + avgConf * 0.5) * 100) / 100;
}
