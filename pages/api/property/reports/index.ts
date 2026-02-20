import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, wallet, page = '1', limit = '10' } = req.query;

    if (!email && !wallet) {
      return res.status(400).json({ error: 'email or wallet parameter required' });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const offset = (pageNum - 1) * limitNum;

    const condition = email
      ? eq(propertyReports.buyerEmail, email as string)
      : eq(propertyReports.buyerWallet, wallet as string);

    const reports = await db.select({
      id: propertyReports.id,
      createdAt: propertyReports.createdAt,
      tier: propertyReports.tier,
      status: propertyReports.status,
      addressRaw: propertyReports.addressRaw,
      city: propertyReports.city,
      state: propertyReports.state,
      valueMid: propertyReports.valueMid,
      rentMid: propertyReports.rentMid,
      confidenceScore: propertyReports.confidenceScore,
      dealGrade: propertyReports.dealGrade,
    })
      .from(propertyReports)
      .where(and(condition, eq(propertyReports.status, 'ready')))
      .orderBy(desc(propertyReports.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(propertyReports)
      .where(and(condition, eq(propertyReports.status, 'ready')));

    return res.status(200).json({
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Reports list error:', err.message);
    return res.status(500).json({ error: 'Could not fetch reports' });
  }
}
