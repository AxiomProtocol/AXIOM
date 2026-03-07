import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpBuyBoxes } from '../../../../shared/distressedFeedSchema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { wallet } = req.query;
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'wallet query parameter required' });
    }

    try {
      const boxes = await db.select()
        .from(dpBuyBoxes)
        .where(eq(dpBuyBoxes.userWallet, wallet.toLowerCase()))
        .orderBy(desc(dpBuyBoxes.createdAt));
      return res.json({ buyBoxes: boxes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to fetch buy boxes', detail: message });
    }
  }

  if (req.method === 'POST') {
    const {
      userWallet, name, targetCities, targetStates,
      minPrice, maxPrice, propertyTypes, distressTypes,
      minBedrooms, minSqft, maxPricePerSqft,
      minDscr, minCapRate, maxRiskLevel,
    } = req.body;

    if (!userWallet || !name) {
      return res.status(400).json({ error: 'userWallet and name are required' });
    }

    try {
      const [box] = await db.insert(dpBuyBoxes).values({
        userWallet: userWallet.toLowerCase(),
        name,
        targetCities: targetCities || [],
        targetStates: targetStates || [],
        minPrice: minPrice ? String(minPrice) : null,
        maxPrice: maxPrice ? String(maxPrice) : null,
        propertyTypes: propertyTypes || [],
        distressTypes: distressTypes || [],
        minBedrooms: minBedrooms || null,
        minSqft: minSqft || null,
        maxPricePerSqft: maxPricePerSqft ? String(maxPricePerSqft) : null,
        minDscr: minDscr ? String(minDscr) : null,
        minCapRate: minCapRate ? String(minCapRate) : null,
        maxRiskLevel: maxRiskLevel || null,
        active: true,
      }).returning();

      return res.status(201).json({ buyBox: box });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to create buy box', detail: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
