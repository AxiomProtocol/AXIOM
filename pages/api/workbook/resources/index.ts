import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { resourceDirectoryItems } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { sectionKey } = req.query;
      
      let query = db
        .select()
        .from(resourceDirectoryItems)
        .where(eq(resourceDirectoryItems.active, true));

      if (sectionKey && typeof sectionKey === 'string') {
        query = db
          .select()
          .from(resourceDirectoryItems)
          .where(and(
            eq(resourceDirectoryItems.active, true),
            eq(resourceDirectoryItems.sectionKey, sectionKey)
          ));
      }

      const resources = await query;
      return res.status(200).json({ success: true, data: resources });
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
