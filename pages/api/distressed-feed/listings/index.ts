import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpListings } from '../../../../shared/distressedFeedSchema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      state, city, distress_type, min_price, max_price,
      property_type, min_bedrooms, min_sqft,
      sort_by = 'newest', page = '1', limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(dpListings.status, 'active')];

    if (state) conditions.push(eq(dpListings.state, String(state).toUpperCase()));
    if (city) conditions.push(sql`LOWER(${dpListings.city}) = LOWER(${String(city)})`);
    if (distress_type) conditions.push(eq(dpListings.distressType, String(distress_type) as any));
    if (property_type) conditions.push(eq(dpListings.propertyType, String(property_type)));
    if (min_price) conditions.push(gte(dpListings.listPrice, String(min_price)));
    if (max_price) conditions.push(lte(dpListings.listPrice, String(max_price)));
    if (min_bedrooms) conditions.push(gte(dpListings.bedrooms, parseInt(String(min_bedrooms), 10)));
    if (min_sqft) conditions.push(gte(dpListings.sqft, parseInt(String(min_sqft), 10)));

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    let orderBy;
    switch (String(sort_by)) {
      case 'price_asc': orderBy = asc(dpListings.listPrice); break;
      case 'price_desc': orderBy = desc(dpListings.listPrice); break;
      case 'discount_desc': orderBy = desc(dpListings.discountPct); break;
      case 'auction_date': orderBy = asc(dpListings.auctionDate); break;
      default: orderBy = desc(dpListings.ingestedAt);
    }

    const [listings, countResult] = await Promise.all([
      db.select().from(dpListings).where(whereClause).orderBy(orderBy).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(dpListings).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return res.json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch listings', detail: message });
  }
}
