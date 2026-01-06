import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from 'drizzle-orm';
import { db } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { sectionKey } = req.query;
      
      let resources;
      if (sectionKey && typeof sectionKey === 'string') {
        resources = await db.execute(sql`
          SELECT id, section_key as "sectionKey", title, url, notes, active, created_at as "createdAt"
          FROM resource_directory_items 
          WHERE active = true AND section_key = ${sectionKey}
          ORDER BY title
        `);
      } else {
        resources = await db.execute(sql`
          SELECT id, section_key as "sectionKey", title, url, notes, active, created_at as "createdAt"
          FROM resource_directory_items 
          WHERE active = true
          ORDER BY section_key, title
        `);
      }

      return res.status(200).json({ success: true, data: resources.rows || resources });
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
