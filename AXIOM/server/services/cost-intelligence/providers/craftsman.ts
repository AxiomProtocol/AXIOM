import { BaseCostProvider } from './base';
import { pool } from '../../../../lib/db';
import { getCostIntelligenceConfig } from '../../../../lib/config/costIntelligence';
import type {
  CostCategory,
  CostItem,
  RegionalModifier,
  PropertyType,
  ConditionLevel,
  CostUnit,
} from '../../../../lib/cost-intelligence/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CraftsmanLocalProvider  — reads rehab_cost_benchmarks from the Axiom DB
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTTP error type
// ---------------------------------------------------------------------------

export class CraftsmanApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly attempt?: number,
  ) {
    super(message);
    this.name = 'CraftsmanApiError';
  }
}

// ---------------------------------------------------------------------------
// Mock fixtures — used when HTTP provider is active but in dev mode without a
// real API key (starts with "mock_" prefix).
// ---------------------------------------------------------------------------

const MOCK_ITEMS: CostItem[] = [
  { id: 'mock-1', systemKey: 'kitchen', systemLabel: 'Kitchen', conditionLevel: 'medium_rehab', description: 'Kitchen medium rehab (mock)', costUnit: 'per_unit', costLow: 4500, costMid: 7000, costHigh: 11000, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-2', systemKey: 'bathroom', systemLabel: 'Bathroom', conditionLevel: 'medium_rehab', description: 'Bathroom medium rehab (mock)', costUnit: 'per_unit', costLow: 3000, costMid: 5500, costHigh: 9000, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-3', systemKey: 'flooring', systemLabel: 'Flooring', conditionLevel: 'medium_rehab', description: 'Flooring replace (mock)', costUnit: 'per_sqft', costLow: 4, costMid: 6, costHigh: 9, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-4', systemKey: 'hvac', systemLabel: 'Hvac', conditionLevel: 'full_replace', description: 'HVAC full replace (mock)', costUnit: 'per_unit', costLow: 5000, costMid: 7500, costHigh: 12000, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-5', systemKey: 'paint', systemLabel: 'Paint', conditionLevel: 'light_rehab', description: 'Interior paint (mock)', costUnit: 'per_unit', costLow: 900, costMid: 1400, costHigh: 2200, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-6', systemKey: 'electrical', systemLabel: 'Electrical', conditionLevel: 'full_replace', description: 'Electrical rewire (mock)', costUnit: 'per_unit', costLow: 4000, costMid: 6000, costHigh: 9000, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-7', systemKey: 'plumbing', systemLabel: 'Plumbing', conditionLevel: 'full_replace', description: 'Plumbing full replace (mock)', costUnit: 'per_unit', costLow: 3500, costMid: 5500, costHigh: 9000, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
  { id: 'mock-8', systemKey: 'roof', systemLabel: 'Roof', conditionLevel: 'full_replace', description: 'Roof replacement (mock)', costUnit: 'per_sqft', costLow: 4, costMid: 6, costHigh: 10, propertyType: 'both', region: 'NATIONAL', source: 'craftsman_mock', confidence: 0.70 },
];

const MOCK_MODIFIER: RegionalModifier = {
  regionCode: 'NATIONAL',
  regionName: 'National Average',
  laborFactor: 1.0,
  materialFactor: 1.0,
  overallFactor: 1.0,
  metroAreas: [],
  states: [],
  source: 'craftsman_mock',
};

// ---------------------------------------------------------------------------
// CraftsmanHttpProvider — real Craftsman NEC API with retry/timeout/mock
// ---------------------------------------------------------------------------

export class CraftsmanHttpProvider extends BaseCostProvider {
  id = 'craftsman_http';
  name = 'Craftsman National Construction Estimator (API)';
  version = '2024';

  private get config() { return getCostIntelligenceConfig().craftsman; }
  private get isMockMode() { return this.config.apiKey.startsWith('mock_'); }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  // ── internal HTTP helpers ────────────────────────────────────────────────

  private async fetchWithRetry(path: string, params: Record<string, string> = {}): Promise<any> {
    const { baseUrl, apiKey, timeoutMs, maxRetries, retryDelayMs } = this.config;
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'X-Client': 'axiom-cost-intelligence/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new CraftsmanApiError(
            `Craftsman API error ${response.status}: ${body.slice(0, 200)}`,
            response.status,
            attempt,
          );
        }

        return await response.json();

      } catch (err: any) {
        clearTimeout(timer);

        if (err.name === 'AbortError') {
          lastError = new CraftsmanApiError(`Craftsman API timeout after ${timeoutMs}ms (attempt ${attempt})`, 408, attempt);
        } else {
          lastError = err;
        }

        const isRetryable = err instanceof CraftsmanApiError
          ? (err.statusCode ? err.statusCode >= 500 || err.statusCode === 429 : true)
          : true;

        if (!isRetryable || attempt === maxRetries) break;

        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        console.warn(`[CraftsmanHttp] Retry ${attempt}/${maxRetries} for ${path}`);
      }
    }

    throw lastError ?? new CraftsmanApiError(`Craftsman API failed for ${path}`);
  }

  // ── normalize API response shapes → Axiom types ─────────────────────────

  private normalizeItem(raw: any): CostItem {
    return {
      id: String(raw.id || raw.item_id || ''),
      systemKey: this.normalizeSystemKey(raw.system || raw.category || ''),
      systemLabel: raw.system_label || raw.label || raw.name || '',
      conditionLevel: (raw.condition_level || raw.condition || 'medium_rehab') as ConditionLevel,
      description: raw.description || raw.notes || '',
      costUnit: (raw.cost_unit || raw.unit || 'per_unit') as CostUnit,
      costLow: Number(raw.cost_low || raw.low || 0),
      costMid: Number(raw.cost_mid || raw.mid || raw.base || 0),
      costHigh: Number(raw.cost_high || raw.high || 0),
      propertyType: (raw.property_type || 'both') as PropertyType,
      region: raw.region || 'NATIONAL',
      source: 'craftsman_http',
      notes: raw.notes || undefined,
      confidence: Number(raw.confidence || 0.85),
    };
  }

  private normalizeModifier(raw: any): RegionalModifier {
    return {
      regionCode: raw.region_code || raw.code || '',
      regionName: raw.region_name || raw.name || '',
      laborFactor: Number(raw.labor_factor ?? 1.0),
      materialFactor: Number(raw.material_factor ?? 1.0),
      overallFactor: Number(raw.overall_factor ?? raw.factor ?? 1.0),
      metroAreas: Array.isArray(raw.metro_areas) ? raw.metro_areas : [],
      states: Array.isArray(raw.states) ? raw.states : [],
      source: 'craftsman_http',
    };
  }

  // ── public interface ─────────────────────────────────────────────────────

  async getCatalog(propertyType: PropertyType): Promise<CostCategory[]> {
    if (this.isMockMode) {
      const systemMap: Record<string, CostItem[]> = {};
      for (const item of MOCK_ITEMS) {
        if (!systemMap[item.systemKey]) systemMap[item.systemKey] = [];
        systemMap[item.systemKey].push(item);
      }
      return Object.entries(systemMap).map(([key, items]) => ({
        key,
        label: this.buildSystemLabel(key),
        trade: SYSTEM_TRADE_MAP[key] || 'General',
        propertyTypes: ['both'] as PropertyType[],
        items,
      }));
    }

    const data = await this.fetchWithRetry('/v1/catalog', { property_type: propertyType });
    const items: CostItem[] = (data.items || data.data || []).map((r: any) => this.normalizeItem(r));
    const systemMap: Record<string, CostItem[]> = {};
    for (const item of items) {
      if (!systemMap[item.systemKey]) systemMap[item.systemKey] = [];
      systemMap[item.systemKey].push(item);
    }
    return Object.entries(systemMap).map(([key, catItems]) => ({
      key,
      label: this.buildSystemLabel(key),
      trade: SYSTEM_TRADE_MAP[key] || 'General',
      propertyTypes: [propertyType],
      items: catItems,
    }));
  }

  async searchItems(query: string, propertyType: PropertyType): Promise<CostItem[]> {
    if (this.isMockMode) {
      const q = query.toLowerCase();
      return MOCK_ITEMS.filter(i =>
        i.systemKey.includes(q) || i.description.toLowerCase().includes(q)
      );
    }

    const data = await this.fetchWithRetry('/v1/search', { q: query, property_type: propertyType });
    return (data.results || data.items || []).map((r: any) => this.normalizeItem(r));
  }

  async getItem(systemKey: string, conditionLevel: ConditionLevel): Promise<CostItem | null> {
    if (this.isMockMode) {
      return MOCK_ITEMS.find(i => i.systemKey === systemKey && i.conditionLevel === conditionLevel) || null;
    }

    try {
      const data = await this.fetchWithRetry('/v1/items/detail', {
        system: systemKey,
        condition: conditionLevel,
      });
      return data.item ? this.normalizeItem(data.item) : null;
    } catch (err: any) {
      if (err instanceof CraftsmanApiError && err.statusCode === 404) return null;
      throw err;
    }
  }

  async getItemsBySystem(systemKey: string, propertyType: PropertyType): Promise<CostItem[]> {
    if (this.isMockMode) {
      return MOCK_ITEMS.filter(i => i.systemKey === systemKey);
    }

    const data = await this.fetchWithRetry('/v1/items', {
      system: systemKey,
      property_type: propertyType,
    });
    return (data.items || []).map((r: any) => this.normalizeItem(r));
  }

  async getRegionalModifier(regionCode: string): Promise<RegionalModifier | null> {
    if (this.isMockMode) {
      return { ...MOCK_MODIFIER, regionCode };
    }

    try {
      const data = await this.fetchWithRetry('/v1/regional-modifiers', { region_code: regionCode });
      return data.modifier ? this.normalizeModifier(data.modifier) : null;
    } catch (err: any) {
      if (err instanceof CraftsmanApiError && err.statusCode === 404) return null;
      throw err;
    }
  }
}
