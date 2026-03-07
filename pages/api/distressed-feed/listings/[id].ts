import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpListings } from '../../../../shared/distressedFeedSchema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Listing ID required' });
  }

  try {
    const rows = await db.select().from(dpListings).where(eq(dpListings.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    return res.json({ listing: rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch listing', detail: message });
  }
}
