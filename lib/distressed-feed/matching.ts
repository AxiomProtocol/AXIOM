import { db } from '../../server/db';
import { dpListings, dpBuyBoxes, dpMatches } from '../../shared/distressedFeedSchema';
import { eq, sql, and } from 'drizzle-orm';
import type { DpListing, DpBuyBox } from '../../shared/distressedFeedSchema';

function computeMatchScore(listing: DpListing, buyBox: DpBuyBox): number {
  let score = 0;
  let totalChecks = 0;

  const targetStates = (buyBox.targetStates as string[]) || [];
  if (targetStates.length > 0) {
    totalChecks++;
    if (targetStates.map(s => s.toUpperCase()).includes(listing.state.toUpperCase())) score++;
  }

  const targetCities = (buyBox.targetCities as string[]) || [];
  if (targetCities.length > 0) {
    totalChecks++;
    if (targetCities.map(c => c.toLowerCase()).includes(listing.city.toLowerCase())) score += 1;
  }

  const listPrice = Number(listing.listPrice || 0);
  if (buyBox.minPrice || buyBox.maxPrice) {
    totalChecks++;
    const minOk = !buyBox.minPrice || listPrice >= Number(buyBox.minPrice);
    const maxOk = !buyBox.maxPrice || listPrice <= Number(buyBox.maxPrice);
    if (minOk && maxOk) score++;
  }

  const propertyTypes = (buyBox.propertyTypes as string[]) || [];
  if (propertyTypes.length > 0) {
    totalChecks++;
    if (propertyTypes.includes(listing.propertyType || 'single_family')) score++;
  }

  const distressTypes = (buyBox.distressTypes as string[]) || [];
  if (distressTypes.length > 0) {
    totalChecks++;
    if (distressTypes.includes(listing.distressType)) score++;
  }

  if (buyBox.minBedrooms && listing.bedrooms) {
    totalChecks++;
    if (listing.bedrooms >= buyBox.minBedrooms) score++;
  }

  if (buyBox.minSqft && listing.sqft) {
    totalChecks++;
    if (listing.sqft >= buyBox.minSqft) score++;
  }

  if (buyBox.maxPricePerSqft && listing.sqft && listing.sqft > 0) {
    totalChecks++;
    const pricePerSqft = listPrice / listing.sqft;
    if (pricePerSqft <= Number(buyBox.maxPricePerSqft)) score++;
  }

  if (totalChecks === 0) return 50;
  return Math.round((score / totalChecks) * 100);
}

export async function matchListingsToBuyBoxes(minScore: number = 60): Promise<{
  totalMatches: number;
  newMatches: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let totalMatches = 0;
  let newMatches = 0;

  const activeBoxes = await db.select()
    .from(dpBuyBoxes)
    .where(eq(dpBuyBoxes.active, true));

  if (activeBoxes.length === 0) {
    return { totalMatches: 0, newMatches: 0, errors: ['No active buy boxes'] };
  }

  const activeListings = await db.select()
    .from(dpListings)
    .where(eq(dpListings.status, 'active'));

  for (const listing of activeListings) {
    for (const buyBox of activeBoxes) {
      const score = computeMatchScore(listing, buyBox);
      if (score < minScore) continue;

      totalMatches++;

      try {
        const existing = await db.select({ id: dpMatches.id })
          .from(dpMatches)
          .where(and(
            eq(dpMatches.listingId, listing.id),
            eq(dpMatches.buyBoxId, buyBox.id),
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(dpMatches).values({
            listingId: listing.id,
            buyBoxId: buyBox.id,
            matchScore: String(score),
          });
          newMatches++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('duplicate key')) {
          errors.push(`Match error: ${msg}`);
        }
      }
    }
  }

  return { totalMatches, newMatches, errors };
}

export async function getMatchesForBuyBox(buyBoxId: string): Promise<{
  matches: Array<DpListing & { matchScore: number }>;
}> {
  const rows = await db.select({
    listing: dpListings,
    matchScore: dpMatches.matchScore,
  })
    .from(dpMatches)
    .innerJoin(dpListings, eq(dpMatches.listingId, dpListings.id))
    .where(eq(dpMatches.buyBoxId, buyBoxId))
    .orderBy(sql`${dpMatches.matchScore} DESC`);

  return {
    matches: rows.map(r => ({
      ...r.listing,
      matchScore: Number(r.matchScore),
    })),
  };
}
