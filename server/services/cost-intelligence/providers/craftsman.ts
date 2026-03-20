import { BaseCostProvider } from './base';
import { pool } from '../../../../lib/db';
import type {
  CostCategory,
  CostItem,
  RegionalModifier,
  PropertyType,
  ConditionLevel,
  CostUnit,
} from '../../../../lib/cost-intelligence/types';

const SYSTEM_TRADE_MAP: Record<string, string> = {
  kitchen: 'Carpentry/Finishes',
  bathroom: 'Plumbing/Finishes',
  flooring: 'Flooring',
  appliances: 'Mechanical/Appliances',
  hvac: 'Mechanical/HVAC',
  windows: 'Windows/Doors',
  paint: 'Painting',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  doors: 'Windows/Doors',
  exterior: 'Exterior/Roofing',
  roof: 'Exterior/Roofing',
  foundation: 'Structural',
  garage: 'Structural',
  landscaping: 'Site Work',
  common_area: 'Finishes',
  laundry_room: 'Mechanical/Plumbing',
  site_parking: 'Site Work',
  other: 'General',
};

function rowToCostItem(row: any): CostItem {
  return {
    id: row.id,
    systemKey: row.system,
    systemLabel: row.system
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    conditionLevel: row.condition_level as ConditionLevel,
    description: row.notes || `${row.system} ${row.condition_level.replace(/_/g, ' ')}`,
    costUnit: row.cost_unit as CostUnit,
    costLow: parseFloat(row.cost_low),
    costMid: parseFloat(row.cost_mid),
    costHigh: parseFloat(row.cost_high),
    propertyType: row.property_type as PropertyType,
    region: row.region,
    source: row.source,
    notes: row.notes,
    confidence: 0.82,
  };
}

export class CraftsmanLocalProvider extends BaseCostProvider {
  id = 'craftsman_local';
  name = 'Craftsman National Construction Estimator (Local)';
  version = '2024';

  async isAvailable(): Promise<boolean> {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query('SELECT COUNT(*) FROM rehab_cost_benchmarks LIMIT 1');
        return parseInt(rows[0].count) > 0;
      } finally {
        client.release();
      }
    } catch {
      return false;
    }
  }

  async getCatalog(propertyType: PropertyType): Promise<CostCategory[]> {
    const client = await pool.connect();
    try {
      const ptFilter = propertyType === 'both'
        ? `property_type IN ('both','sfr','multifamily')`
        : `(property_type = $1 OR property_type = 'both')`;
      const params = propertyType === 'both' ? [] : [propertyType];

      const { rows } = await client.query(
        `SELECT * FROM rehab_cost_benchmarks WHERE ${ptFilter} ORDER BY system, condition_level`,
        params,
      );

      const systemMap: Record<string, CostItem[]> = {};
      for (const row of rows) {
        if (!systemMap[row.system]) systemMap[row.system] = [];
        systemMap[row.system].push(rowToCostItem(row));
      }

      return Object.entries(systemMap).map(([key, items]) => ({
        key,
        label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        trade: SYSTEM_TRADE_MAP[key] || 'General',
        propertyTypes: ['both', 'sfr', 'multifamily'] as PropertyType[],
        items,
      }));
    } finally {
      client.release();
    }
  }

  async searchItems(query: string, propertyType: PropertyType): Promise<CostItem[]> {
    const client = await pool.connect();
    try {
      const q = `%${query.toLowerCase()}%`;
      const { rows } = await client.query(
        `SELECT * FROM rehab_cost_benchmarks
         WHERE (property_type = $1 OR property_type = 'both')
           AND (LOWER(system) LIKE $2 OR LOWER(notes) LIKE $2)
         ORDER BY system, condition_level
         LIMIT 30`,
        [propertyType === 'both' ? 'both' : propertyType, q],
      );
      return rows.map(rowToCostItem);
    } finally {
      client.release();
    }
  }

  async getItem(systemKey: string, conditionLevel: ConditionLevel): Promise<CostItem | null> {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM rehab_cost_benchmarks
         WHERE system = $1 AND condition_level = $2
         ORDER BY property_type DESC LIMIT 1`,
        [systemKey, conditionLevel],
      );
      return rows[0] ? rowToCostItem(rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getItemsBySystem(systemKey: string, propertyType: PropertyType): Promise<CostItem[]> {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM rehab_cost_benchmarks
         WHERE system = $1 AND (property_type = $2 OR property_type = 'both')
         ORDER BY condition_level`,
        [systemKey, propertyType],
      );
      return rows.map(rowToCostItem);
    } finally {
      client.release();
    }
  }

  async getRegionalModifier(regionCode: string): Promise<RegionalModifier | null> {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT * FROM regional_cost_modifiers WHERE region_code = $1 LIMIT 1`,
        [regionCode],
      );
      if (!rows[0]) return null;
      const r = rows[0];
      return {
        regionCode: r.region_code,
        regionName: r.region_name,
        laborFactor: parseFloat(r.labor_factor),
        materialFactor: parseFloat(r.material_factor),
        overallFactor: parseFloat(r.overall_factor),
        metroAreas: r.metro_areas || [],
        states: r.states || [],
        source: r.source,
      };
    } finally {
      client.release();
    }
  }
}

export class CraftsmanHttpProvider extends BaseCostProvider {
  id = 'craftsman_http';
  name = 'Craftsman National Construction Estimator (API)';
  version = '2024';

  private baseUrl = process.env.CRAFTSMAN_API_BASE_URL || '';
  private apiKey = process.env.CRAFTSMAN_API_KEY || '';

  async isAvailable(): Promise<boolean> {
    return !!(this.baseUrl && this.apiKey);
  }

  async getCatalog(propertyType: PropertyType): Promise<CostCategory[]> {
    throw new Error('CraftsmanHttpProvider: CRAFTSMAN_API_KEY and CRAFTSMAN_API_BASE_URL not configured');
  }

  async searchItems(query: string, propertyType: PropertyType): Promise<CostItem[]> {
    throw new Error('CraftsmanHttpProvider: not configured');
  }

  async getItem(systemKey: string, conditionLevel: ConditionLevel): Promise<CostItem | null> {
    throw new Error('CraftsmanHttpProvider: not configured');
  }

  async getItemsBySystem(systemKey: string, propertyType: PropertyType): Promise<CostItem[]> {
    throw new Error('CraftsmanHttpProvider: not configured');
  }

  async getRegionalModifier(regionCode: string): Promise<RegionalModifier | null> {
    throw new Error('CraftsmanHttpProvider: not configured');
  }
}
