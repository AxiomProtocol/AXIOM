import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { dpWholesalerSubmissions, dpListings } from '../../../../../shared/distressedFeedSchema';
import { isAgentGovAuthorized } from '../../../../../lib/agent-gov/auth';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAgentGovAuthorized(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Submission ID required' });
  }

  const { action, reviewerNotes } = req.body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  try {
    const rows = await db.select()
      .from(dpWholesalerSubmissions)
      .where(eq(dpWholesalerSubmissions.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = rows[0];

    if (action === 'reject') {
      const [updated] = await db.update(dpWholesalerSubmissions)
        .set({
          status: 'rejected',
          reviewedAt: new Date(),
          reviewerNotes: reviewerNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(dpWholesalerSubmissions.id, id))
        .returning();

      return res.json({ submission: updated, action: 'rejected' });
    }

    const [listing] = await db.insert(dpListings).values({
      source: 'wholesaler',
      sourceId: `ws-${submission.id}`,
      address: submission.propertyAddress,
      city: submission.city,
      state: submission.state,
      zip: submission.zip,
      propertyType: submission.propertyType || 'single_family',
      bedrooms: submission.bedrooms || null,
      bathrooms: submission.bathrooms || null,
      sqft: submission.sqft || null,
      yearBuilt: submission.yearBuilt || null,
      listPrice: submission.askingPrice,
      estimatedValue: submission.arv || null,
      discountPct: submission.arv && Number(submission.arv) > 0
        ? String(Math.round(((Number(submission.arv) - Number(submission.askingPrice)) / Number(submission.arv)) * 100 * 100) / 100)
        : null,
      distressType: 'wholesale',
      photos: submission.photos as string[] || [],
      description: submission.description || `Wholesale deal in ${submission.city}, ${submission.state}. Rehab estimate: $${submission.rehabEstimate || 'TBD'}.`,
      status: 'active',
    }).returning();

    const [updated] = await db.update(dpWholesalerSubmissions)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewerNotes: reviewerNotes || null,
        listingId: listing.id,
        updatedAt: new Date(),
      })
      .where(eq(dpWholesalerSubmissions.id, id))
      .returning();

    return res.json({ submission: updated, listing, action: 'approved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to review submission', detail: message });
  }
}
