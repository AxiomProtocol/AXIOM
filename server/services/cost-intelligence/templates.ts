import { pool } from '../../../lib/db';
import type { EstimateTemplate, ScopeItem, PropertyType } from '../../../lib/cost-intelligence/types';

const SYSTEM_TEMPLATES: Omit<EstimateTemplate, 'id'>[] = [
  {
    templateName: 'Light Cosmetic Rehab',
    templateSlug: 'light-cosmetic',
    description: 'Paint, clean, minor repairs, appliance touch-up. Suitable for tenant-ready turns.',
    propertyType: 'both',
    rehabCategory: 'cosmetic',
    isSystem: true,
    scopeItems: [
      { trade: 'Painting', itemName: 'Interior paint full', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Flooring', itemName: 'Flooring clean or refinish', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Carpentry/Finishes', itemName: 'Kitchen light update', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.10 },
      { trade: 'Plumbing/Finishes', itemName: 'Bathroom light update', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.10 },
      { trade: 'Mechanical/Appliances', itemName: 'Appliances clean and service', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.03, contingencyFactor: 0.08 },
    ],
  },
  {
    templateName: 'Unit Turn',
    templateSlug: 'unit-turn',
    description: 'Standard unit turn for multifamily — clean, paint, patch, appliance check.',
    propertyType: 'multifamily',
    rehabCategory: 'unit_turn',
    isSystem: true,
    scopeItems: [
      { trade: 'Painting', itemName: 'Interior paint', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'General', itemName: 'Deep clean haul-out', quantity: 1, unit: 'per_unit', repairOrReplace: 'clean', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.02, contingencyFactor: 0.05 },
      { trade: 'Flooring', itemName: 'Carpet clean or vinyl patch', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Mechanical/Appliances', itemName: 'Appliance service and check', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.03, contingencyFactor: 0.08 },
    ],
  },
  {
    templateName: 'Medium Value-Add Rehab',
    templateSlug: 'medium-value-add',
    description: 'Kitchen and bath updates, new flooring, appliances, HVAC service. Target: rent premium.',
    propertyType: 'both',
    rehabCategory: 'value_add',
    isSystem: true,
    scopeItems: [
      { trade: 'Carpentry/Finishes', itemName: 'Kitchen medium rehab', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.07, contingencyFactor: 0.10 },
      { trade: 'Plumbing/Finishes', itemName: 'Bathroom medium rehab', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.07, contingencyFactor: 0.10 },
      { trade: 'Flooring', itemName: 'LVP flooring install', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.08 },
      { trade: 'Painting', itemName: 'Interior paint full', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'light_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Mechanical/Appliances', itemName: 'Appliances replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.10 },
      { trade: 'Mechanical/HVAC', itemName: 'HVAC service and component replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.12 },
      { trade: 'Windows/Doors', itemName: 'Doors replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.08 },
    ],
  },
  {
    templateName: 'Heavy Gut Rehab',
    templateSlug: 'heavy-gut',
    description: 'Full systems replacement — plumbing, electrical, HVAC, kitchen, bath, flooring, roof. Complete reposition.',
    propertyType: 'both',
    rehabCategory: 'heavy_rehab',
    isSystem: true,
    scopeItems: [
      { trade: 'Carpentry/Finishes', itemName: 'Kitchen full gut', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.10, contingencyFactor: 0.15 },
      { trade: 'Plumbing/Finishes', itemName: 'Bathroom full gut', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.10, contingencyFactor: 0.15 },
      { trade: 'Flooring', itemName: 'Flooring full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.10, contingencyFactor: 0.10 },
      { trade: 'Plumbing', itemName: 'Plumbing full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Electrical', itemName: 'Electrical full rewire', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Mechanical/HVAC', itemName: 'HVAC full system replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Painting', itemName: 'Interior paint full', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: true, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Windows/Doors', itemName: 'Windows full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.10 },
      { trade: 'Exterior/Roofing', itemName: 'Roof full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: false, wasteFactor: 0.08, contingencyFactor: 0.15 },
    ],
  },
  {
    templateName: 'Kitchen Renovation',
    templateSlug: 'kitchen-renovation',
    description: 'Focused kitchen renovation — cabinets, countertops, appliances, sink.',
    propertyType: 'both',
    rehabCategory: 'kitchen',
    isSystem: true,
    scopeItems: [
      { trade: 'Carpentry/Finishes', itemName: 'Kitchen medium rehab', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: false, wasteFactor: 0.07, contingencyFactor: 0.12 },
      { trade: 'Mechanical/Appliances', itemName: 'Appliances full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.10 },
      { trade: 'Plumbing', itemName: 'Plumbing fixture replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.10 },
    ],
  },
  {
    templateName: 'Bathroom Renovation',
    templateSlug: 'bathroom-renovation',
    description: 'Full bathroom renovation — vanity, tile, fixtures, toilet.',
    propertyType: 'both',
    rehabCategory: 'bathroom',
    isSystem: true,
    scopeItems: [
      { trade: 'Plumbing/Finishes', itemName: 'Bathroom full gut', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: false, wasteFactor: 0.10, contingencyFactor: 0.12 },
      { trade: 'Plumbing', itemName: 'Plumbing fixture replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'medium_rehab', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.10 },
    ],
  },
  {
    templateName: 'Exterior Refresh',
    templateSlug: 'exterior-refresh',
    description: 'Exterior paint, landscape clean-up, minor siding and gutter work.',
    propertyType: 'both',
    rehabCategory: 'exterior',
    isSystem: true,
    scopeItems: [
      { trade: 'Exterior/Roofing', itemName: 'Exterior paint and caulk', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.08 },
      { trade: 'Site Work', itemName: 'Landscaping cleanup', quantity: 1, unit: 'flat', repairOrReplace: 'clean', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.03, contingencyFactor: 0.05 },
      { trade: 'Exterior/Roofing', itemName: 'Roof patch and repair', quantity: 1, unit: 'per_unit', repairOrReplace: 'repair', condition: 'light_rehab', appliesToAllUnits: false, wasteFactor: 0.08, contingencyFactor: 0.10 },
    ],
  },
  {
    templateName: 'Full Systems Replacement (MF)',
    templateSlug: 'full-systems-mf',
    description: 'Mechanical, electrical, plumbing, HVAC replacement across all units. Multifamily reposition.',
    propertyType: 'multifamily',
    rehabCategory: 'systems',
    isSystem: true,
    scopeItems: [
      { trade: 'Plumbing', itemName: 'Plumbing full replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Electrical', itemName: 'Electrical full rewire', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Mechanical/HVAC', itemName: 'HVAC full system replace', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: true, wasteFactor: 0.08, contingencyFactor: 0.15 },
      { trade: 'Finishes', itemName: 'Common area full renovation', quantity: 1, unit: 'per_unit', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: false, wasteFactor: 0.08, contingencyFactor: 0.12 },
      { trade: 'Site Work', itemName: 'Site parking resurface', quantity: 1, unit: 'flat', repairOrReplace: 'replace', condition: 'full_replace', appliesToAllUnits: false, wasteFactor: 0.05, contingencyFactor: 0.12 },
    ],
  },
];

export async function seedTemplatesIfEmpty() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*) FROM cost_estimate_templates');
    if (parseInt(rows[0].count) > 0) return;

    for (const t of SYSTEM_TEMPLATES) {
      await client.query(
        `INSERT INTO cost_estimate_templates (template_name, template_slug, description, property_type, rehab_category, scope_items_json, is_system)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (template_slug) DO NOTHING`,
        [t.templateName, t.templateSlug, t.description, t.propertyType, t.rehabCategory, JSON.stringify(t.scopeItems), t.isSystem],
      );
    }
  } finally {
    client.release();
  }
}

export async function getTemplates(propertyType?: PropertyType): Promise<EstimateTemplate[]> {
  await seedTemplatesIfEmpty();
  const client = await pool.connect();
  try {
    const condition = propertyType && propertyType !== 'both'
      ? `WHERE property_type = $1 OR property_type = 'both'`
      : '';
    const params = propertyType && propertyType !== 'both' ? [propertyType] : [];
    const { rows } = await client.query(
      `SELECT * FROM cost_estimate_templates ${condition} ORDER BY rehab_category, template_name`,
      params,
    );
    return rows.map((r) => ({
      id: r.id,
      templateName: r.template_name,
      templateSlug: r.template_slug,
      description: r.description,
      propertyType: r.property_type,
      rehabCategory: r.rehab_category,
      scopeItems: r.scope_items_json,
      isSystem: r.is_system,
    }));
  } finally {
    client.release();
  }
}
