import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodeAddress, extractAddressComponents, buildNormalizedAddress } from '@/lib/re/geocoder';
import {
  isAttomConfigured,
  fetchAttomExpandedProfile,
  fetchAttomSalesHistory,
  fetchAttomTaxHistory,
} from '@/lib/re/attom';
import {
  isRentcastConfigured,
  fetchRentEstimate,
  fetchValueEstimate,
  fetchRentcastProperty,
} from '@/lib/re/rentcast';

function nowIso(): string {
  return new Date().toISOString();
}

type SourceName = 'nominatim' | 'attom' | 'rentcast';
const VALID_SOURCES: SourceName[] = ['nominatim', 'attom', 'rentcast'];

interface IngestResult {
  source: SourceName;
  status: 'ok' | 'skipped' | 'error';
  message: string;
  records_written: number;
}

async function ensureSource(
  name: string,
  type: string,
  baseUrl: string
): Promise<string> {
  const result = await db.query(
    `INSERT INTO re_sources (name, type, base_url, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (name) DO UPDATE SET base_url = EXCLUDED.base_url, updated_at = NOW()
     RETURNING id`,
    [name, type, baseUrl]
  );
  return result.rows[0].id as string;
}

async function startIngestRun(sourceId: string, meta: Record<string, unknown>): Promise<string> {
  const result = await db.query(
    `INSERT INTO re_ingest_runs (source_id, status, started_at, meta)
     VALUES ($1, 'running', NOW(), $2)
     RETURNING id`,
    [sourceId, JSON.stringify(meta)]
  );
  return result.rows[0].id as string;
}

async function finishIngestRun(
  runId: string,
  status: 'completed' | 'failed' | 'partial',
  processed: number,
  failed: number
): Promise<void> {
  await db.query(
    `UPDATE re_ingest_runs
     SET status = $1, finished_at = NOW(), records_processed = $2, records_failed = $3
     WHERE id = $4`,
    [status, processed, failed, runId]
  );
}

async function logRecordError(
  runId: string,
  errorType: string,
  errorMessage: string,
  rawPayload: unknown
): Promise<void> {
  await db.query(
    `INSERT INTO re_record_errors (ingest_run_id, error_type, error_message, raw_payload)
     VALUES ($1, $2, $3, $4)`,
    [runId, errorType, errorMessage, JSON.stringify(rawPayload)]
  );
}

async function ingestNominatim(propertyId: string, addressRaw: string): Promise<IngestResult> {
  const sourceId = await ensureSource(
    'nominatim',
    'geocoder',
    'https://nominatim.openstreetmap.org'
  );
  const runId = await startIngestRun(sourceId, { property_id: propertyId });

  try {
    const geo = await geocodeAddress(addressRaw);

    if (!geo) {
      await finishIngestRun(runId, 'failed', 0, 1);
      await logRecordError(runId, 'geocode_no_result', 'Nominatim returned no results', { address: addressRaw });
      return { source: 'nominatim', status: 'error', message: 'No geocode result', records_written: 0 };
    }

    const components = extractAddressComponents(geo);
    const normalized = buildNormalizedAddress(geo);

    await db.query(
      `UPDATE re_properties SET
         lat = $1, lon = $2,
         location_point = ST_SetSRID(ST_MakePoint($3, $4), 4326),
         address_normalized = $5,
         street_number = COALESCE(street_number, $6),
         street_name = COALESCE(street_name, $7),
         city = COALESCE(city, $8),
         state = COALESCE(state, $9),
         zip = COALESCE(zip, $10),
         county = COALESCE(county, $11),
         updated_at = NOW()
       WHERE id = $12`,
      [
        parseFloat(geo.lat),
        parseFloat(geo.lon),
        parseFloat(geo.lon),
        parseFloat(geo.lat),
        normalized,
        components.street_number,
        components.street_name,
        components.city,
        components.state,
        components.zip,
        components.county,
        propertyId,
      ]
    );

    await finishIngestRun(runId, 'completed', 1, 0);
    return {
      source: 'nominatim',
      status: 'ok',
      message: `Geocoded: ${geo.display_name}`,
      records_written: 1,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await finishIngestRun(runId, 'failed', 0, 1);
    await logRecordError(runId, 'geocode_error', msg, { address: addressRaw });
    return { source: 'nominatim', status: 'error', message: msg, records_written: 0 };
  }
}

async function ingestAttom(
  propertyId: string,
  addressRaw: string,
  city: string | null,
  state: string | null,
  zip: string | null
): Promise<IngestResult> {
  if (!isAttomConfigured()) {
    return {
      source: 'attom',
      status: 'skipped',
      message: 'ATTOM_API_KEY not configured',
      records_written: 0,
    };
  }

  const sourceId = await ensureSource(
    'attom',
    'property_data',
    'https://api.attomdata.com'
  );
  const runId = await startIngestRun(sourceId, { property_id: propertyId });

  let processed = 0;
  let failed = 0;

  try {
    const address1Parts = addressRaw.split(',')[0].trim();
    const address2 = [city, state, zip].filter(Boolean).join(', ');
    const address1 = address1Parts || addressRaw;

    const profile = await fetchAttomExpandedProfile(address1, address2);

    if (profile) {
      const loc = profile.location || profile.address;
      const building = profile.building;
      const lot = profile.lot;
      const assessment = profile.assessment;
      const summary = profile.summary;

      await db.query(
        `UPDATE re_properties SET
           external_id = COALESCE(external_id, $1),
           apn = COALESCE(apn, $2),
           fips = COALESCE(fips, $3),
           property_type = COALESCE(property_type, $4),
           year_built = COALESCE(year_built, $5),
           sqft = COALESCE(sqft, $6),
           lot_sqft = COALESCE(lot_sqft, $7),
           bedrooms = COALESCE(bedrooms, $8),
           bathrooms = COALESCE(bathrooms, $9),
           zoning = COALESCE(zoning, $10),
           updated_at = NOW()
         WHERE id = $11`,
        [
          String(profile.identifier?.attomId || ''),
          profile.identifier?.apn || null,
          profile.identifier?.fips || null,
          summary?.propType || null,
          building?.summary?.yearBuilt || summary?.yearBuilt || null,
          building?.size?.universalSize || null,
          lot?.lotsize2 || null,
          building?.rooms?.beds || null,
          building?.rooms?.bathsTotal || null,
          lot?.zoningHigh || null,
          propertyId,
        ]
      );
      processed++;

      if (assessment?.tax?.taxAmt && assessment?.tax?.taxYear) {
        const taxYear = typeof assessment.tax.taxYear === 'string'
          ? parseInt(assessment.tax.taxYear, 10)
          : assessment.tax.taxYear;

        await db.query(
          `INSERT INTO re_taxes (property_id, tax_year, assessed_total, assessed_land,
             assessed_improvement, market_value, tax_amount, source_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (property_id, tax_year) DO NOTHING`,
          [
            propertyId,
            taxYear,
            assessment.assessed?.assdTtlValue || null,
            assessment.assessed?.assdLandValue || null,
            assessment.assessed?.assdImprValue || null,
            assessment.market?.mktTtlValue || null,
            assessment.tax.taxAmt || null,
            sourceId,
          ]
        );
        processed++;
      }

      if (profile.avm?.amount?.value) {
        await db.query(
          `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
           VALUES ($1, 'avm_value', $2, NOW(), $3, 0.7)
           ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
          [propertyId, profile.avm.amount.value, sourceId]
        );
        if (profile.avm.amount.high && profile.avm.amount.low) {
          await db.query(
            `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
             VALUES ($1, 'avm_high', $2, NOW(), $3, 0.7)
             ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
            [propertyId, profile.avm.amount.high, sourceId]
          );
          await db.query(
            `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
             VALUES ($1, 'avm_low', $2, NOW(), $3, 0.7)
             ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
            [propertyId, profile.avm.amount.low, sourceId]
          );
        }
        processed++;
      }
    }

    const salesHistory = await fetchAttomSalesHistory(address1, address2);
    for (const sale of salesHistory) {
      if (!sale.saleTransDate) continue;
      try {
        await db.query(
          `INSERT INTO re_sales (property_id, sale_date, sale_price, price_per_sqft,
             buyer, seller, deed_type, document_number, is_arms_length, source_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (property_id, sale_date) DO NOTHING`,
          [
            propertyId,
            sale.saleTransDate,
            sale.amount?.saleAmt || null,
            sale.amount?.pricePerSqft || null,
            sale.buyer1FullName || null,
            sale.seller1FullName || null,
            sale.amount?.saleDocType || null,
            sale.saleDocNum || null,
            sale.multi?.isArmsLength ?? true,
            sourceId,
          ]
        );
        processed++;
      } catch {
        failed++;
      }
    }

    const taxHistory = await fetchAttomTaxHistory(address1, address2);
    for (const tax of taxHistory) {
      if (!tax.assessedYear) continue;
      try {
        await db.query(
          `INSERT INTO re_taxes (property_id, tax_year, assessed_total, assessed_land,
             assessed_improvement, market_value, tax_amount, tax_rate, source_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (property_id, tax_year) DO NOTHING`,
          [
            propertyId,
            tax.assessedYear,
            tax.assessed?.assdTtlValue || null,
            tax.assessed?.assdLandValue || null,
            tax.assessed?.assdImprValue || null,
            tax.market?.mktTtlValue || null,
            tax.tax?.taxAmt || null,
            tax.calcTaxRate || null,
            sourceId,
          ]
        );
        processed++;
      } catch {
        failed++;
      }
    }

    const finalStatus = failed === 0 ? 'completed' : 'partial';
    await finishIngestRun(runId, finalStatus, processed, failed);

    return {
      source: 'attom',
      status: 'ok',
      message: `Fetched profile, ${salesHistory.length} sale(s), ${taxHistory.length} tax record(s)`,
      records_written: processed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await finishIngestRun(runId, 'failed', processed, failed + 1);
    await logRecordError(runId, 'attom_error', msg, { property_id: propertyId });
    return { source: 'attom', status: 'error', message: msg, records_written: processed };
  }
}

async function ingestRentcast(
  propertyId: string,
  addressRaw: string,
  propertyType: string | null,
  sqft: number | null,
  bedrooms: number | null,
  bathrooms: number | null
): Promise<IngestResult> {
  if (!isRentcastConfigured()) {
    return {
      source: 'rentcast',
      status: 'skipped',
      message: 'RENTCAST_API_KEY not configured',
      records_written: 0,
    };
  }

  const sourceId = await ensureSource(
    'rentcast',
    'rental_data',
    'https://api.rentcast.io'
  );
  const runId = await startIngestRun(sourceId, { property_id: propertyId });

  let processed = 0;
  let failed = 0;

  try {
    const params = {
      address: addressRaw,
      propertyType: propertyType || undefined,
      squareFootage: sqft || undefined,
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
    };

    const [rentEst, valEst, propDetail] = await Promise.all([
      fetchRentEstimate(params),
      fetchValueEstimate(params),
      fetchRentcastProperty(addressRaw),
    ]);

    if (rentEst?.rent) {
      await db.query(
        `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
         VALUES ($1, 'rent_estimate', $2, NOW(), $3, 0.7)
         ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
        [propertyId, rentEst.rent, sourceId]
      );
      if (rentEst.rentRangeLow) {
        await db.query(
          `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
           VALUES ($1, 'rent_estimate_low', $2, NOW(), $3, 0.7)
           ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
          [propertyId, rentEst.rentRangeLow, sourceId]
        );
      }
      if (rentEst.rentRangeHigh) {
        await db.query(
          `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
           VALUES ($1, 'rent_estimate_high', $2, NOW(), $3, 0.7)
           ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
          [propertyId, rentEst.rentRangeHigh, sourceId]
        );
      }
      processed += 3;
    }

    if (valEst?.price) {
      await db.query(
        `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
         VALUES ($1, 'market_value_estimate', $2, NOW(), $3, 0.7)
         ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
        [propertyId, valEst.price, sourceId]
      );
      processed++;
    }

    if (propDetail) {
      if (propDetail.assessedValue) {
        await db.query(
          `INSERT INTO re_property_facts (property_id, fact_type, fact_numeric, as_of, source_id, confidence)
           VALUES ($1, 'assessed_value', $2, NOW(), $3, 0.8)
           ON CONFLICT (property_id, fact_type, source_id) DO NOTHING`,
          [propertyId, propDetail.assessedValue, sourceId]
        );
        processed++;
      }
      if (propDetail.taxAmount && propDetail.taxYear) {
        await db.query(
          `INSERT INTO re_taxes (property_id, tax_year, assessed_total, assessed_land,
             assessed_improvement, tax_amount, source_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (property_id, tax_year) DO NOTHING`,
          [
            propertyId,
            propDetail.taxYear,
            propDetail.assessedValue || null,
            propDetail.assessedLandValue || null,
            propDetail.assessedImprovementValue || null,
            propDetail.taxAmount,
            sourceId,
          ]
        );
        processed++;
      }
      if (propDetail.lastSaleDate && propDetail.lastSalePrice) {
        await db.query(
          `INSERT INTO re_sales (property_id, sale_date, sale_price, source_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (property_id, sale_date) DO NOTHING`,
          [propertyId, propDetail.lastSaleDate, propDetail.lastSalePrice, sourceId]
        );
        processed++;
      }
    }

    await finishIngestRun(runId, 'completed', processed, failed);

    return {
      source: 'rentcast',
      status: 'ok',
      message: `Fetched rent estimate${rentEst?.rent ? ` ($${rentEst.rent}/mo)` : ''}, value estimate${valEst?.price ? ` ($${valEst.price})` : ''}`,
      records_written: processed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await finishIngestRun(runId, 'failed', processed, failed + 1);
    await logRecordError(runId, 'rentcast_error', msg, { property_id: propertyId });
    return { source: 'rentcast', status: 'error', message: msg, records_written: processed };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { property_id, sources } = body as {
      property_id?: string;
      sources?: string[];
    };

    if (!property_id) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['user_input'], confidence: 0, warnings: [] },
          error: { code: 'MISSING_PARAMS', message: 'property_id is required' },
        },
        { status: 400 }
      );
    }

    const propResult = await db.query(
      `SELECT id, address_raw, address_normalized, city, state, zip,
              property_type, sqft, bedrooms, bathrooms, lat, lon
       FROM re_properties WHERE id = $1`,
      [property_id]
    );

    if (propResult.rows.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: { as_of: nowIso(), sources_used: ['internal_db'], confidence: 0, warnings: [] },
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        },
        { status: 404 }
      );
    }

    const prop = propResult.rows[0];
    const requestedSources: SourceName[] = Array.isArray(sources)
      ? (sources.filter((s) => VALID_SOURCES.includes(s as SourceName)) as SourceName[])
      : [...VALID_SOURCES];

    const results: IngestResult[] = [];
    const warnings: string[] = [];

    for (const source of requestedSources) {
      let result: IngestResult;

      if (source === 'nominatim') {
        result = await ingestNominatim(prop.id, prop.address_raw);
      } else if (source === 'attom') {
        result = await ingestAttom(
          prop.id,
          prop.address_raw,
          prop.city,
          prop.state,
          prop.zip
        );
      } else {
        result = await ingestRentcast(
          prop.id,
          prop.address_normalized || prop.address_raw,
          prop.property_type,
          prop.sqft ? parseInt(prop.sqft, 10) : null,
          prop.bedrooms ? parseInt(prop.bedrooms, 10) : null,
          prop.bathrooms ? parseFloat(prop.bathrooms) : null
        );
      }

      results.push(result);
      if (result.status === 'skipped') {
        warnings.push(`${source}: ${result.message}`);
      }
    }

    const refreshed = await db.query(
      `SELECT id, address_normalized, lat, lon FROM re_properties WHERE id = $1`,
      [property_id]
    );
    const refreshedProp = refreshed.rows[0];
    const hasGeocode = refreshedProp?.lat !== null;
    const totalWritten = results.reduce((sum, r) => sum + r.records_written, 0);

    const sourcesUsed = results
      .filter((r) => r.status === 'ok')
      .map((r) => r.source) as string[];

    const confidence = hasGeocode && totalWritten > 2 ? 1.0 : hasGeocode ? 0.7 : 0.4;

    return NextResponse.json({
      data: {
        property_id,
        results,
        total_records_written: totalWritten,
        geocoded: hasGeocode,
        address_normalized: refreshedProp?.address_normalized || null,
      },
      meta: {
        as_of: nowIso(),
        sources_used: sourcesUsed.length > 0 ? sourcesUsed : ['internal_db'],
        confidence,
        warnings,
      },
    });
  } catch (error) {
    console.error('Error in ingest endpoint:', error);
    return NextResponse.json(
      {
        data: null,
        meta: { as_of: nowIso(), sources_used: [], confidence: 0, warnings: ['Internal server error'] },
        error: { code: 'INTERNAL_ERROR', message: 'Failed to run data ingest' },
      },
      { status: 500 }
    );
  }
}
