import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { TIER_CONFIG } from '../../../server/services/property/pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(propertyReports)
      .where(and(
        eq(propertyReports.tier, 'free'),
        eq(propertyReports.ipAddress, ip),
        gte(propertyReports.createdAt, thirtyDaysAgo),
      ));

    return res.status(200).json({
      used: Number(result?.count || 0),
      limit: TIER_CONFIG.free.maxPerMonth,
    });
  } catch (err: any) {
    console.error('Usage check error:', err.message);
    return res.status(200).json({ used: 0, limit: 3 });
  }
}
