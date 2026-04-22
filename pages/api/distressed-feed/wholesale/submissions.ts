import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpWholesalerSubmissions } from '../../../../shared/distressedFeedSchema';
import { isAgentGovAuthorized } from '../../../../lib/agent-gov/auth';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAgentGovAuthorized(req)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { status } = req.query;
    let query = db.select().from(dpWholesalerSubmissions).orderBy(desc(dpWholesalerSubmissions.createdAt));

    if (status) {
      const rows = await db.select()
        .from(dpWholesalerSubmissions)
        .where(eq(dpWholesalerSubmissions.status, String(status) as any))
        .orderBy(desc(dpWholesalerSubmissions.createdAt));
      return res.json({ submissions: rows });
    }

    const rows = await query;
    return res.json({ submissions: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch submissions', detail: message });
  }
}
