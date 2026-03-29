import { db } from '../../server/db';
import { dpListings } from '../../shared/distressedFeedSchema';
import { sql, eq, and } from 'drizzle-orm';
import type { NormalizedListing, SourceResult, IngestionResult } from './types';
import { fetchHudListings } from './sources/hud';
import { fetchFannieListings } from './sources/fannie';
import { fetchFreddieListings } from './sources/freddie';
import { fetchUsdaListings } from './sources/usda';
import { fetchTaxLienListings } from './sources/tax-liens';
import { fetchSheriffSaleListings } from './sources/sheriff-sales';
import { fetchAttomListings } from './sources/attom';
import { fetchGeorgiaCourthouseListings } from './sources/courthouse-georgia';
import { fetchFloridaCourthouseListings } from './sources/courthouse-florida';
import { fetchTexasCourthouseListings } from './sources/courthouse-texas';
import { fetchArizonaCourthouseListings } from './sources/courthouse-arizona';
import { fetchMichiganCourthouseListings } from './sources/courthouse-michigan';

const TARGET_STATES = ['GA', 'TX', 'NC', 'MS', 'AL', 'TN', 'SC', 'FL', 'AZ', 'MI'];

async function upsertListing(listing: NormalizedListing): Promise<'inserted' | 'updated' | 'skipped'> {
  const existing = await db.select({ id: dpListings.id })
    .from(dpListings)
    .where(and(
      eq(dpListings.source, listing.source),
      eq(dpListings.sourceId, listing.sourceId),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(dpListings)
      .set({
        listPrice: String(listing.listPrice),
        estimatedValue: listing.estimatedValue ? String(listing.estimatedValue) : null,
        discountPct: listing.discountPct ? String(listing.discountPct) : null,
        status: 'active',
        updatedAt: new Date(),
        description: listing.description || undefined,
        photos: listing.photos,
        auctionDate: listing.auctionDate || undefined,
        expiresAt: listing.expiresAt || undefined,
        metadata: listing.metadata || null,
      })
      .where(eq(dpListings.id, existing[0].id));
    return 'updated';
  }

  try {
    await db.insert(dpListings).values({
      source: listing.source,
      sourceId: listing.sourceId,
      address: listing.address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      county: listing.county || null,
      lat: listing.lat ? String(listing.lat) : null,
      lon: listing.lon ? String(listing.lon) : null,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms || null,
      bathrooms: listing.bathrooms ? String(listing.bathrooms) : null,
      sqft: listing.sqft || null,
      lotSqft: listing.lotSqft || null,
      yearBuilt: listing.yearBuilt || null,
      listPrice: String(listing.listPrice),
      estimatedValue: listing.estimatedValue ? String(listing.estimatedValue) : null,
      discountPct: listing.discountPct ? String(listing.discountPct) : null,
      distressType: listing.distressType,
      sourceUrl: listing.sourceUrl || null,
      photos: listing.photos,
      description: listing.description || null,
      status: 'active',
      auctionDate: listing.auctionDate || null,
      expiresAt: listing.expiresAt || null,
      metadata: listing.metadata || null,
    });
    return 'inserted';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return 'skipped';
    }
    throw err;
  }
}

export async function runIngestion(states?: string[]): Promise<IngestionResult> {
  const targetStates = states || TARGET_STATES;
  const sourceResults: SourceResult[] = [];
  const errors: string[] = [];
  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  const taxLienStates = targetStates.filter(s => ['GA', 'TX', 'NC'].includes(s));
  const sheriffStates = targetStates.filter(s => ['GA', 'TX', 'NC'].includes(s));

  const sources = [
    { name: 'HUD', fn: () => fetchHudListings(targetStates) },
    { name: 'Fannie Mae', fn: () => fetchFannieListings(targetStates) },
    { name: 'Freddie Mac', fn: () => fetchFreddieListings(targetStates) },
    { name: 'USDA', fn: () => fetchUsdaListings(targetStates) },
    { name: 'ATTOM Pre-Foreclosure', fn: () => fetchAttomListings(targetStates) },
    ...(taxLienStates.length > 0 ? [{ name: 'Tax Liens', fn: () => fetchTaxLienListings(taxLienStates).then(r => ({ source: r.source, listings: r.listings, errors: r.errors, fetchedAt: r.fetchedAt } as SourceResult)) }] : []),
    ...(sheriffStates.length > 0 ? [{ name: 'Sheriff Sales', fn: () => fetchSheriffSaleListings(sheriffStates).then(r => ({ source: r.source, listings: r.listings, errors: r.errors, fetchedAt: r.fetchedAt } as SourceResult)) }] : []),
    // Courthouse scraper network — public government record sources
    ...(targetStates.includes('GA') ? [{ name: 'Courthouse GA', fn: () => fetchGeorgiaCourthouseListings() }] : []),
    ...(targetStates.includes('FL') ? [{ name: 'Courthouse FL', fn: () => fetchFloridaCourthouseListings() }] : []),
    ...(targetStates.includes('TX') ? [{ name: 'Courthouse TX', fn: () => fetchTexasCourthouseListings() }] : []),
    ...(targetStates.includes('AZ') ? [{ name: 'Courthouse AZ', fn: () => fetchArizonaCourthouseListings() }] : []),
    ...(targetStates.includes('MI') ? [{ name: 'Courthouse MI', fn: () => fetchMichiganCourthouseListings() }] : []),
  ];

  for (const source of sources) {
    try {
      const result = await source.fn();
      sourceResults.push(result);
      totalFetched += result.listings.length;
      errors.push(...result.errors);

      for (const listing of result.listings) {
        try {
          const outcome = await upsertListing(listing);
          if (outcome === 'inserted') totalInserted++;
          else if (outcome === 'updated') totalUpdated++;
          else totalSkipped++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${source.name} upsert error: ${msg}`);
          totalSkipped++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source.name} source error: ${msg}`);
    }
  }

  await db.update(dpListings)
    .set({ status: 'expired' })
    .where(
      sql`${dpListings.status} = 'active' AND ${dpListings.updatedAt} < NOW() - INTERVAL '30 days'`
    );

  return {
    totalFetched,
    totalInserted,
    totalUpdated,
    totalSkipped,
    sourceResults,
    errors,
    completedAt: new Date(),
  };
}

export async function getFeedStats(): Promise<{
  totalActive: number;
  totalExpired: number;
  bySource: Record<string, number>;
  byDistressType: Record<string, number>;
  byState: Record<string, number>;
  lastIngestion: string | null;
}> {
  const activeCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(dpListings)
    .where(eq(dpListings.status, 'active'));

  const expiredCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(dpListings)
    .where(eq(dpListings.status, 'expired'));

  const bySource = await db.select({
    source: dpListings.source,
    count: sql<number>`count(*)::int`,
  })
    .from(dpListings)
    .where(eq(dpListings.status, 'active'))
    .groupBy(dpListings.source);

  const byDistressType = await db.select({
    distressType: dpListings.distressType,
    count: sql<number>`count(*)::int`,
  })
    .from(dpListings)
    .where(eq(dpListings.status, 'active'))
    .groupBy(dpListings.distressType);

  const byState = await db.select({
    state: dpListings.state,
    count: sql<number>`count(*)::int`,
  })
    .from(dpListings)
    .where(eq(dpListings.status, 'active'))
    .groupBy(dpListings.state);

  const lastListing = await db.select({ ingestedAt: dpListings.ingestedAt })
    .from(dpListings)
    .orderBy(sql`${dpListings.ingestedAt} DESC`)
    .limit(1);

  return {
    totalActive: activeCount[0]?.count ?? 0,
    totalExpired: expiredCount[0]?.count ?? 0,
    bySource: Object.fromEntries(bySource.map(r => [r.source, r.count])),
    byDistressType: Object.fromEntries(byDistressType.map(r => [r.distressType, r.count])),
    byState: Object.fromEntries(byState.map(r => [r.state, r.count])),
    lastIngestion: lastListing[0]?.ingestedAt?.toISOString() || null,
  };
}
