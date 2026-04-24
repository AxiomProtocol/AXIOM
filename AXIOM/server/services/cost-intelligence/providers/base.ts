import type {
  CostProvider,
  CostCategory,
  CostItem,
  RegionalModifier,
  PropertyType,
  ConditionLevel,
} from '../../../../lib/cost-intelligence/types';

export abstract class BaseCostProvider implements CostProvider {
  abstract id: string;
  abstract name: string;
  abstract version: string;

  abstract isAvailable(): Promise<boolean>;
  abstract getCatalog(propertyType: PropertyType): Promise<CostCategory[]>;
  abstract searchItems(query: string, propertyType: PropertyType): Promise<CostItem[]>;
  abstract getItem(systemKey: string, conditionLevel: ConditionLevel): Promise<CostItem | null>;
  abstract getItemsBySystem(systemKey: string, propertyType: PropertyType): Promise<CostItem[]>;
  abstract getRegionalModifier(regionCode: string): Promise<RegionalModifier | null>;

  protected normalizeSystemKey(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  protected buildSystemLabel(key: string): string {
    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
