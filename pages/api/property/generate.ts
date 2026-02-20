import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { generateReport, TIER_CONFIG } from '../../../server/services/property/pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address, tier = 'free', sqft, bedrooms, bathrooms, yearBuilt, propertyType, email, wallet } = req.body;

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return res.status(400).json({ error: 'A valid property address is required' });
    }

    const validTier = tier as 'free' | 'base' | 'premium';
    if (!TIER_CONFIG[validTier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    if (validTier === 'free') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

      const recentCount = await db.select({ count: sql<number>`count(*)` })
        .from(propertyReports)
        .where(and(
          eq(propertyReports.tier, 'free'),
          eq(propertyReports.ipAddress, ip),
          gte(propertyReports.createdAt, thirtyDaysAgo),
        ));

      if (recentCount[0]?.count >= TIER_CONFIG.free.maxPerMonth) {
        return res.status(429).json({
          error: `Free tier limited to ${TIER_CONFIG.free.maxPerMonth} reports per month. Upgrade to Base or Premium for more.`,
          upgradeRequired: true,
        });
      }
    }

    if (validTier !== 'free') {
      return res.status(400).json({
        error: 'Paid reports require checkout first. Use /api/property/create-checkout.',
        requiresCheckout: true,
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    const [report] = await db.insert(propertyReports).values({
      addressRaw: address.trim(),
      tier: validTier,
      status: 'generating',
      sqft: sqft ? parseInt(sqft) : null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? bathrooms.toString() : null,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
      propertyType: propertyType || null,
      buyerEmail: email || null,
      buyerWallet: wallet || null,
      ipAddress: ip,
    }).returning();

    const result = await generateReport(report.id);

    return res.status(200).json({
      reportId: report.id,
      status: 'ready',
      summary: {
        address: address.trim(),
        valueMid: result.value.mid,
        rentMid: result.rent.mid,
        confidenceScore: result.confidence.overall,
        dealGrade: result.dealGrade,
        riskCount: result.riskFlags.length,
      },
    });
  } catch (err: any) {
    console.error('Property report generation error:', err.message);
    return res.status(500).json({ error: 'Report generation failed. Please try again.' });
  }
}
