import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardLandLeads, stewardAssignments } from '../../../../shared/schema';
import { withSIWEAuth, AuthenticatedRequest } from '../../../../lib/middleware/siweAuth';
import { eq, and } from 'drizzle-orm';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const wallet = req.siweSession?.address?.toLowerCase();
  if (!wallet) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [steward] = await db.select()
    .from(stewardAssignments)
    .where(eq(stewardAssignments.wallet, wallet))
    .limit(1);

  if (!steward || !['active', 'probationary', 'admin'].includes(steward.status || '')) {
    return res.status(403).json({ error: 'Active steward status required' });
  }

  if (req.method === 'POST') {
    try {
      const {
        parcelAddress,
        county,
        acreage,
        ownerName,
        ownerContact,
        ownerOpennessLevel,
        accessTermsSummary,
        activationDurationPreferred,
        proposedUse,
        notes
      } = req.body;

      if (!parcelAddress) {
        return res.status(400).json({ error: 'parcelAddress is required' });
      }

      const [lead] = await db.insert(stewardLandLeads).values({
        regionId: steward.regionId,
        parcelAddress,
        county: county || null,
        acreage: acreage || null,
        proposedUse: proposedUse || null,
        stage: 'new',
        createdBy: wallet,
        metadata: {
          leadType: 'activated_land',
          ownerName: ownerName || null,
          ownerContact: ownerContact || null,
          ownerOpennessLevel: ownerOpennessLevel || 'curious',
          accessTermsSummary: accessTermsSummary || null,
          activationDurationPreferred: activationDurationPreferred || null,
          activationStage: 'intake',
          notes: notes || null
        }
      }).returning();

      return res.status(201).json({ success: true, lead });
    } catch (error) {
      console.error('Error creating activated land lead:', error);
      return res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withSIWEAuth(handler);
