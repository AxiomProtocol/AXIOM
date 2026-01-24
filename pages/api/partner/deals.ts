import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { partnerDealSubmissions } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const deals = await db.select()
      .from(partnerDealSubmissions)
      .where(eq(partnerDealSubmissions.email, email.toLowerCase()))
      .orderBy(desc(partnerDealSubmissions.createdAt));

    if (deals.length === 0) {
      return res.status(404).json({ error: 'No deals found for this email' });
    }

    const formattedDeals = deals.map(deal => ({
      id: deal.id,
      propertyType: deal.propertyType,
      acquisitionStructure: deal.acquisitionStructure,
      capitalNeed: deal.capitalNeed,
      exitStrategy: deal.exitStrategy,
      timeline: deal.timeline,
      dealValue: deal.dealValue,
      partnerRole: deal.partnerRole,
      recommendedPrimary: deal.recommendedPrimary,
      recommendedSecondary: deal.recommendedSecondary || [],
      recommendedProtection: deal.recommendedProtection || [],
      compliancePath: deal.compliancePath,
      estimatedTerms: deal.estimatedTerms,
      status: deal.status,
      propertyAddress: deal.propertyAddress,
      dealDescription: deal.dealDescription,
      createdAt: deal.createdAt,
    }));

    return res.status(200).json({ deals: formattedDeals });
  } catch (error) {
    console.error('Partner deals fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}
