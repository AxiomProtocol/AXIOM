import { db } from '../../db';
import {
  reProperties,
  reSales,
  reTaxes,
  rePropertyFacts,
  reSources,
  reIngestRuns,
} from '../../../shared/realEstateSchema';
import { eq, and } from 'drizzle-orm';

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

interface RentCastProperty {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  assessorID: string;
  legalDescription: string;
  subdivision: string;
  zoning: string;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  hoa?: { fee?: number };
  features?: {
    architectureType?: string;
    cooling?: boolean;
    coolingType?: string;
    exteriorType?: string;
    fireplace?: boolean;
    floorCount?: number;
    foundationType?: string;
    garage?: boolean;
    garageSpaces?: number;
    garageType?: string;
    heating?: boolean;
    heatingType?: string;
    pool?: boolean;
    poolType?: string;
    roofType?: string;
    roomCount?: number;
    unitCount?: number;
  };
  taxAssessments?: Record<string, {
    year: number;
    value: number;
    land: number;
    improvements: number;
  }>;
  propertyTaxes?: Record<string, {
    year: number;
    total: number;
  }>;
  history?: Record<string, {
    date: string;
    price: number;
    event?: string;
  }>;
  owner?: {
    names?: string[];
    mailingAddress?: {
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  ownerOccupied?: boolean;
}

function getApiKey(): string {
  const key = process.env.RENTCAST_API_KEY;
  if (!key) {
    throw new Error('RENTCAST_API_KEY is not configured');
  }
  return key;
}

async function rentcastGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${RENTCAST_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-Api-Key': getApiKey(),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RentCast API ${response.status}: ${body}`);
  }

  return response.json();
}

export async function lookupProperty(address: string): Promise<RentCastProperty[]> {
  return rentcastGet('/properties', { address });
}

export async function lookupPropertyByZip(zipCode: string, limit = 50): Promise<RentCastProperty[]> {
  return rentcastGet('/properties', { zipCode, limit: String(limit) });
}

function mapPropertyType(rcType: string | undefined): string | null {
  if (!rcType) return null;
  const map: Record<string, string> = {
    'Single Family': 'single_family',
    'Multi-Family': 'multi_family',
    'Condo': 'condo',
    'Townhouse': 'townhouse',
    'Manufactured': 'manufactured',
    'Apartment': 'apartment',
    'Land': 'land',
  };
  return map[rcType] || rcType.toLowerCase().replace(/\s+/g, '_');
}

async function getOrCreateSource(): Promise<string> {
  const existing = await db.select()
    .from(reSources)
    .where(eq(reSources.name, 'rentcast'))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [src] = await db.insert(reSources).values({
    name: 'rentcast',
    type: 'api',
    baseUrl: RENTCAST_BASE,
    credentialRef: 'RENTCAST_API_KEY',
    rateLimit: 50,
    isActive: true,
  }).returning();

  return src.id;
}

export async function enrichProperty(propertyId: string): Promise<{
  enriched: boolean;
  fields_updated: string[];
  sales_added: number;
  taxes_added: number;
  facts_added: number;
  error?: string;
}> {
  const [property] = await db.select()
    .from(reProperties)
    .where(eq(reProperties.id, propertyId))
    .limit(1);

  if (!property) {
    return { enriched: false, fields_updated: [], sales_added: 0, taxes_added: 0, facts_added: 0, error: 'Property not found' };
  }

  const sourceId = await getOrCreateSource();

  const [run] = await db.insert(reIngestRuns).values({
    sourceId,
    status: 'running',
    startedAt: new Date(),
    meta: { propertyId, trigger: 'enrich' },
  }).returning();

  try {
    const address = property.addressRaw;
    const results = await lookupProperty(address);

    if (!results || results.length === 0) {
      await db.update(reIngestRuns)
        .set({ status: 'completed', finishedAt: new Date(), recordsProcessed: 0, meta: { propertyId, trigger: 'enrich', result: 'no_match' } })
        .where(eq(reIngestRuns.id, run.id));
      return { enriched: false, fields_updated: [], sales_added: 0, taxes_added: 0, facts_added: 0, error: 'No matching property found in RentCast' };
    }

    const rc = results[0];
    const fieldsUpdated: string[] = [];

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (rc.formattedAddress) { updates.addressRaw = rc.formattedAddress; fieldsUpdated.push('addressRaw'); }
    if (rc.city) { updates.city = rc.city; fieldsUpdated.push('city'); }
    if (rc.state) { updates.state = rc.state; fieldsUpdated.push('state'); }
    if (rc.zipCode) { updates.zip = rc.zipCode; fieldsUpdated.push('zip'); }
    if (rc.county) { updates.county = rc.county; fieldsUpdated.push('county'); }
    if (rc.countyFips && rc.stateFips) { updates.fips = rc.stateFips + rc.countyFips; fieldsUpdated.push('fips'); }
    if (rc.assessorID) { updates.apn = rc.assessorID; fieldsUpdated.push('apn'); }
    if (rc.latitude) { updates.lat = String(rc.latitude); fieldsUpdated.push('lat'); }
    if (rc.longitude) { updates.lon = String(rc.longitude); fieldsUpdated.push('lon'); }
    if (rc.propertyType) { updates.propertyType = mapPropertyType(rc.propertyType); fieldsUpdated.push('propertyType'); }
    if (rc.yearBuilt) { updates.yearBuilt = rc.yearBuilt; fieldsUpdated.push('yearBuilt'); }
    if (rc.squareFootage) { updates.sqft = rc.squareFootage; fieldsUpdated.push('sqft'); }
    if (rc.lotSize) { updates.lotSqft = rc.lotSize; fieldsUpdated.push('lotSqft'); }
    if (rc.bedrooms != null) { updates.bedrooms = rc.bedrooms; fieldsUpdated.push('bedrooms'); }
    if (rc.bathrooms != null) { updates.bathrooms = String(rc.bathrooms); fieldsUpdated.push('bathrooms'); }
    if (rc.zoning) { updates.zoning = rc.zoning; fieldsUpdated.push('zoning'); }
    if (rc.id) { updates.externalId = rc.id; fieldsUpdated.push('externalId'); }
    updates.sourceId = sourceId;

    const features = rc.features;
    if (features) {
      if (features.floorCount) { updates.stories = features.floorCount; fieldsUpdated.push('stories'); }
      if (features.garage && features.garageSpaces) { updates.garage = `${features.garageType || 'Garage'} (${features.garageSpaces})`; fieldsUpdated.push('garage'); }
      if (features.pool != null) { updates.pool = features.pool; fieldsUpdated.push('pool'); }
    }

    updates.meta = {
      ...(property.meta as any || {}),
      rentcast: {
        enrichedAt: new Date().toISOString(),
        externalId: rc.id,
        hoa: rc.hoa,
        features: rc.features,
        legalDescription: rc.legalDescription,
        subdivision: rc.subdivision,
        ownerOccupied: rc.ownerOccupied,
      },
    };

    await db.update(reProperties).set(updates).where(eq(reProperties.id, propertyId));

    let salesAdded = 0;
    if (rc.history && Object.keys(rc.history).length > 0) {
      for (const [year, sale] of Object.entries(rc.history)) {
        if (!sale.date || !sale.price) continue;
        const saleDate = sale.date.split('T')[0];
        const existing = await db.select({ id: reSales.id })
          .from(reSales)
          .where(and(
            eq(reSales.propertyId, propertyId),
            eq(reSales.saleDate, saleDate),
          ))
          .limit(1);

        if (existing.length === 0) {
          const pricePerSqft = rc.squareFootage && rc.squareFootage > 0
            ? String(Math.round((sale.price / rc.squareFootage) * 100) / 100)
            : null;

          await db.insert(reSales).values({
            propertyId,
            saleDate,
            salePrice: String(sale.price),
            pricePerSqft,
            sourceId,
            meta: { event: sale.event || 'sale', rentcastYear: year },
          });
          salesAdded++;
        }
      }
    }

    if (rc.lastSaleDate && rc.lastSalePrice) {
      const lastDate = rc.lastSaleDate.split('T')[0];
      const existingLast = await db.select({ id: reSales.id })
        .from(reSales)
        .where(and(
          eq(reSales.propertyId, propertyId),
          eq(reSales.saleDate, lastDate),
        ))
        .limit(1);

      if (existingLast.length === 0) {
        const pricePerSqft = rc.squareFootage && rc.squareFootage > 0
          ? String(Math.round((rc.lastSalePrice / rc.squareFootage) * 100) / 100)
          : null;

        await db.insert(reSales).values({
          propertyId,
          saleDate: lastDate,
          salePrice: String(rc.lastSalePrice),
          pricePerSqft,
          sourceId,
          meta: { event: 'last_sale' },
        });
        salesAdded++;
      }
    }

    let taxesAdded = 0;
    if (rc.taxAssessments && Object.keys(rc.taxAssessments).length > 0) {
      for (const [year, assessment] of Object.entries(rc.taxAssessments)) {
        const taxYear = parseInt(year);
        if (isNaN(taxYear)) continue;

        const existing = await db.select({ id: reTaxes.id })
          .from(reTaxes)
          .where(and(
            eq(reTaxes.propertyId, propertyId),
            eq(reTaxes.taxYear, taxYear),
          ))
          .limit(1);

        if (existing.length === 0) {
          const taxEntry = rc.propertyTaxes?.[year];
          await db.insert(reTaxes).values({
            propertyId,
            taxYear,
            assessedTotal: assessment.value ? String(assessment.value) : null,
            assessedLand: assessment.land ? String(assessment.land) : null,
            assessedImprovement: assessment.improvements ? String(assessment.improvements) : null,
            taxAmount: taxEntry?.total ? String(taxEntry.total) : null,
            sourceId,
          });
          taxesAdded++;
        }
      }
    }

    let factsAdded = 0;
    const factEntries: { type: string; value: string; numeric?: number }[] = [];

    if (features) {
      if (features.architectureType) factEntries.push({ type: 'architecture_type', value: features.architectureType });
      if (features.coolingType) factEntries.push({ type: 'cooling_type', value: features.coolingType });
      if (features.heatingType) factEntries.push({ type: 'heating_type', value: features.heatingType });
      if (features.roofType) factEntries.push({ type: 'roof_type', value: features.roofType });
      if (features.exteriorType) factEntries.push({ type: 'exterior_type', value: features.exteriorType });
      if (features.foundationType) factEntries.push({ type: 'foundation_type', value: features.foundationType });
      if (features.roomCount) factEntries.push({ type: 'room_count', value: String(features.roomCount), numeric: features.roomCount });
      if (features.unitCount) factEntries.push({ type: 'unit_count', value: String(features.unitCount), numeric: features.unitCount });
      if (features.poolType) factEntries.push({ type: 'pool_type', value: features.poolType });
      if (features.garageSpaces) factEntries.push({ type: 'garage_spaces', value: String(features.garageSpaces), numeric: features.garageSpaces });
    }
    if (rc.hoa?.fee) factEntries.push({ type: 'hoa_fee_monthly', value: String(rc.hoa.fee), numeric: rc.hoa.fee });
    if (rc.legalDescription) factEntries.push({ type: 'legal_description', value: rc.legalDescription });
    if (rc.subdivision) factEntries.push({ type: 'subdivision', value: rc.subdivision });

    for (const fact of factEntries) {
      const existing = await db.select({ id: rePropertyFacts.id })
        .from(rePropertyFacts)
        .where(and(
          eq(rePropertyFacts.propertyId, propertyId),
          eq(rePropertyFacts.factType, fact.type),
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rePropertyFacts).values({
          propertyId,
          factType: fact.type,
          factValue: fact.value,
          factNumeric: fact.numeric ? String(fact.numeric) : null,
          sourceId,
          confidence: '0.9',
          asOf: new Date().toISOString().split('T')[0],
        });
        factsAdded++;
      }
    }

    await db.update(reIngestRuns)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        recordsProcessed: fieldsUpdated.length + salesAdded + taxesAdded + factsAdded,
        meta: { propertyId, trigger: 'enrich', fieldsUpdated, salesAdded, taxesAdded, factsAdded },
      })
      .where(eq(reIngestRuns.id, run.id));

    return { enriched: true, fields_updated: fieldsUpdated, sales_added: salesAdded, taxes_added: taxesAdded, facts_added: factsAdded };

  } catch (err: any) {
    await db.update(reIngestRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        recordsFailed: 1,
        meta: { propertyId, trigger: 'enrich', error: err.message },
      })
      .where(eq(reIngestRuns.id, run.id));

    throw err;
  }
}
