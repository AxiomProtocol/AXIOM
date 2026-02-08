import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardLandLeads, stewardAssignments } from '../../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (req.method === 'GET') {
    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0) {
        return res.status(403).json({ error: 'Not a steward' });
      }

      const regionId = assignments[0].regionId;
      if (!regionId) {
        return res.status(200).json({ leads: [] });
      }

      const leads = await db
        .select()
        .from(stewardLandLeads)
        .where(eq(stewardLandLeads.regionId, regionId))
        .orderBy(desc(stewardLandLeads.createdAt))
        .catch(() => []);

      return res.status(200).json({ leads });
    } catch (error) {
      console.error('Land leads fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch land leads' });
    }
  }

  if (req.method === 'POST') {
    const { parcelAddress, county, acreage, askingPrice, zoning, listingLink, proposedUse } = req.body;

    if (!parcelAddress) {
      return res.status(400).json({ error: 'Parcel address required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !assignments[0].regionId) {
        return res.status(403).json({ error: 'Not assigned to a region' });
      }

      const [lead] = await db
        .insert(stewardLandLeads)
        .values({
          regionId: assignments[0].regionId,
          parcelAddress,
          county,
          acreage: acreage ? String(acreage) : null,
          askingPrice: askingPrice ? String(askingPrice) : null,
          zoning,
          link: listingLink,
          proposedUse,
          stage: 'new',
          createdBy: wallet.toLowerCase()
        })
        .returning();

      return res.status(201).json({ lead });
    } catch (error) {
      console.error('Land lead create error:', error);
      return res.status(500).json({ error: 'Failed to create land lead' });
    }
  }

  if (req.method === 'PATCH') {
    const { leadId, stage } = req.body;

    if (!leadId || !stage) {
      return res.status(400).json({ error: 'Lead ID and stage required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !['probationary', 'active'].includes(assignments[0].status || '')) {
        return res.status(403).json({ error: 'Unauthorized: Not an active steward' });
      }

      const regionId = assignments[0].regionId;
      const lead = await db
        .select()
        .from(stewardLandLeads)
        .where(eq(stewardLandLeads.id, leadId))
        .limit(1);

      if (lead.length === 0 || (regionId && lead[0].regionId !== regionId)) {
        return res.status(403).json({ error: 'Unauthorized: Lead not in your region' });
      }

      const [updated] = await db
        .update(stewardLandLeads)
        .set({ stage, updatedAt: new Date() })
        .where(eq(stewardLandLeads.id, leadId))
        .returning();

      return res.status(200).json({ lead: updated });
    } catch (error) {
      console.error('Land lead update error:', error);
      return res.status(500).json({ error: 'Failed to update land lead' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
