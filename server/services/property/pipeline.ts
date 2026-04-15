import { db } from '../../db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq } from 'drizzle-orm';
import { geocodeAddress } from './geocoder';
import { fetchCensusData, fetchHpiData, fetchRentCastPropertyData, fetchRentCastData, fetchWalkScore } from './dataProviders';
import { runEstimation, type EstimationResult } from './estimationEngine';
import { getEstimate, getSalesComps, isRepliersConfigured } from '../../../lib/re/repliers';

export const TIER_CONFIG: Record<string, { label: string; priceCents: number; maxPerMonth: number; dataSources: string[] }> = {
  free: { label: 'Free Report', priceCents: 0, maxPerMonth: 3, dataSources: ['census', 'fhfa', 'osm'] },
  base: { label: 'Base Report', priceCents: 499, maxPerMonth: 50, dataSources: ['census', 'fhfa', 'osm', 'rentcast-property', 'repliers-avm', 'repliers-comps'] },
  premium: { label: 'Premium Report', priceCents: 1499, maxPerMonth: 100, dataSources: ['census', 'fhfa', 'osm', 'rentcast-property', 'rentcast', 'walkscore', 'repliers-avm', 'repliers-comps'] },
};

export async function generateReport(reportId: string): Promise<EstimationResult> {
  const [report] = await db.select().from(propertyReports).where(eq(propertyReports.id, reportId)).limit(1);
  if (!report) throw new Error('Report not found');

  await db.update(propertyReports).set({ status: 'generating', updatedAt: new Date() }).where(eq(propertyReports.id, reportId));

  try {
    const geo = await geocodeAddress(report.addressRaw, reportId);
    if (!geo) {
      await db.update(propertyReports).set({ status: 'failed', errorMessage: 'Could not geocode address. Please check the address and try again.', updatedAt: new Date() }).where(eq(propertyReports.id, reportId));
      throw new Error('Geocoding failed');
    }

    const tier = report.tier;
    const cfg = TIER_CONFIG[tier];

    const [census, hpi] = await Promise.all([
      fetchCensusData(geo.state, geo.county, reportId),
      fetchHpiData(geo.state, reportId),
    ]);

    let rcProperty = null;
    let rentcast = null;
    let walkScore = null;

    if (cfg.dataSources.includes('rentcast-property')) {
      rcProperty = await fetchRentCastPropertyData(report.addressRaw, reportId);
    }

    if (cfg.dataSources.includes('rentcast')) {
      rentcast = await fetchRentCastData(report.addressRaw, reportId);
    }

    if (cfg.dataSources.includes('walkscore')) {
      walkScore = await fetchWalkScore(geo.lat, geo.lon, report.addressRaw, reportId);
    }

    let repliersAvm: { price: number | null; priceMin: number | null; priceMax: number | null; confidence: number | null; isTestMode: boolean } | null = null;
    let repliersComps: Array<Record<string, unknown>> | null = null;
    let repliersIsTestMode = false;

    if (cfg.dataSources.includes('repliers-avm') && isRepliersConfigured()) {
      try {
        const avmResult = await getEstimate({
          city: geo.city || undefined,
          state: geo.state || undefined,
          zip: geo.zip || undefined,
          beds: report.bedrooms || undefined,
          baths: report.bathrooms ? parseFloat(report.bathrooms) : undefined,
          sqft: report.sqft || undefined,
        });
        if (avmResult.data) {
          repliersAvm = {
            price: avmResult.data.price ?? null,
            priceMin: avmResult.data.priceMin ?? null,
            priceMax: avmResult.data.priceMax ?? null,
            confidence: avmResult.data.confidence ?? null,
            isTestMode: avmResult.isTestMode,
          };
          repliersIsTestMode = avmResult.isTestMode;
        }
      } catch (avmErr: any) {
        console.warn('[pipeline] Repliers AVM failed (non-blocking):', avmErr.message);
      }
    }

    if (cfg.dataSources.includes('repliers-comps') && isRepliersConfigured()) {
      try {
        const compsResult = await getSalesComps({
          city: geo.city || undefined,
          state: geo.state || undefined,
          zip: geo.zip || undefined,
          minBeds: report.bedrooms ? Math.max(1, report.bedrooms - 1) : undefined,
          resultsPerPage: 8,
        });
        if (compsResult.data?.listings?.length) {
          repliersComps = compsResult.data.listings.map((l) => {
            const addr = l.address || {};
            const sqftRaw = l.details?.sqft;
            const sqftNum = sqftRaw ? parseInt(sqftRaw.replace(/[^0-9]/g, ''), 10) || null : null;
            const price = l.soldPrice || l.listPrice || 0;
            return {
              mlsNumber: l.mlsNumber || null,
              address: [addr.streetNumber, addr.streetName, addr.streetSuffix].filter(Boolean).join(' '),
              city: addr.city || '',
              state: addr.state || '',
              zip: addr.zip || '',
              listPrice: l.listPrice || null,
              soldPrice: l.soldPrice || null,
              beds: l.details?.numBedrooms ?? null,
              baths: l.details?.numBathrooms ?? null,
              sqft: sqftNum,
              pricePerSqft: price && sqftNum ? Math.round(price / sqftNum) : null,
              daysOnMarket: l.daysOnMarket ?? null,
              soldDate: l.soldDate || null,
              status: l.status || null,
            };
          });
          repliersIsTestMode = compsResult.isTestMode;
        }
      } catch (compsErr: any) {
        console.warn('[pipeline] Repliers comps failed (non-blocking):', compsErr.message);
      }
    }

    const result = runEstimation({
      geo,
      census,
      hpi,
      rcProperty,
      rentcast,
      walkScore,
      tier,
      userSqft: report.sqft || undefined,
      userBedrooms: report.bedrooms || undefined,
      userBathrooms: report.bathrooms ? parseFloat(report.bathrooms) : undefined,
      userYearBuilt: report.yearBuilt || undefined,
      userPropertyType: report.propertyType || undefined,
    });

    const enrichedFullReport: Record<string, unknown> = {
      ...result as unknown as Record<string, unknown>,
    };
    if (repliersAvm) enrichedFullReport.repliersAvm = repliersAvm;
    if (repliersComps) enrichedFullReport.repliersComps = repliersComps;
    if (repliersAvm || repliersComps) enrichedFullReport.repliersIsTestMode = repliersIsTestMode;

    const updatedDataSources = [...result.dataSources];
    if (repliersAvm) updatedDataSources.push('Repliers MLS AVM');
    if (repliersComps) updatedDataSources.push('Repliers MLS Comps');

    await db.update(propertyReports).set({
      status: 'ready',
      updatedAt: new Date(),
      addressNormalized: geo.addressNormalized,
      city: geo.city,
      state: geo.state,
      zip: geo.zip,
      lat: geo.lat.toString(),
      lon: geo.lon.toString(),
      fips: geo.fips,
      propertyType: result.propertyDetails.propertyType,
      bedrooms: result.propertyDetails.bedrooms,
      bathrooms: result.propertyDetails.bathrooms.toString(),
      sqft: result.propertyDetails.sqft,
      yearBuilt: result.propertyDetails.yearBuilt,
      lotSqft: result.propertyDetails.lotSqft,
      valueLow: result.value.low.toString(),
      valueMid: result.value.mid.toString(),
      valueHigh: result.value.high.toString(),
      rentLow: result.rent.low.toString(),
      rentMid: result.rent.mid.toString(),
      rentHigh: result.rent.high.toString(),
      rehabLow: result.rehab.low.toString(),
      rehabMid: result.rehab.mid.toString(),
      rehabHigh: result.rehab.high.toString(),
      confidenceScore: result.confidence.overall,
      dealGrade: result.dealGrade,
      riskFlags: result.riskFlags,
      neighborhoodContext: result.neighborhoodContext,
      rehabItems: result.rehab.items,
      compsUsed: result.rent.methodology.includes('RentCast') ? (rentcast?.comparables || []) : [],
      dataSources: updatedDataSources,
      fullReport: enrichedFullReport as any,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }).where(eq(propertyReports.id, reportId));

    return result;
  } catch (err: any) {
    if (err.message !== 'Geocoding failed') {
      await db.update(propertyReports).set({
        status: 'failed',
        errorMessage: err.message || 'Report generation failed',
        updatedAt: new Date(),
      }).where(eq(propertyReports.id, reportId));
    }
    throw err;
  }
}
