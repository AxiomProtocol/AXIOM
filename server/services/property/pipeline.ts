import { db } from '../../db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq } from 'drizzle-orm';
import { geocodeAddress } from './geocoder';
import { fetchCensusData, fetchHpiData, fetchRentCastPropertyData, fetchRentCastData, fetchWalkScore } from './dataProviders';
import { runEstimation, type EstimationResult } from './estimationEngine';

export const TIER_CONFIG: Record<string, { label: string; priceCents: number; maxPerMonth: number; dataSources: string[] }> = {
  free: { label: 'Free Report', priceCents: 0, maxPerMonth: 3, dataSources: ['census', 'fhfa', 'osm'] },
  base: { label: 'Base Report', priceCents: 499, maxPerMonth: 50, dataSources: ['census', 'fhfa', 'osm', 'rentcast-property'] },
  premium: { label: 'Premium Report', priceCents: 1499, maxPerMonth: 100, dataSources: ['census', 'fhfa', 'osm', 'rentcast-property', 'rentcast', 'walkscore'] },
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
      dataSources: result.dataSources,
      fullReport: result as any,
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
