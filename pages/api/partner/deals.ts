import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

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

    const result = await db.execute(sql`
      SELECT 
        id, property_type, acquisition_structure, capital_need,
        exit_strategy, timeline, deal_value, partner_role,
        recommended_primary, recommended_secondary, recommended_protection,
        compliance_path, estimated_terms, status, property_address,
        deal_description, created_at
      FROM partner_deal_submissions
      WHERE LOWER(email) = LOWER(${email})
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({ deals: [] });
    }

    const formattedDeals = result.rows.map((deal: any) => ({
      id: deal.id,
      propertyType: deal.property_type,
      acquisitionStructure: deal.acquisition_structure,
      capitalNeed: deal.capital_need,
      exitStrategy: deal.exit_strategy,
      timeline: deal.timeline,
      dealValue: deal.deal_value,
      partnerRole: deal.partner_role,
      recommendedPrimary: deal.recommended_primary,
      recommendedSecondary: deal.recommended_secondary || [],
      recommendedProtection: deal.recommended_protection || [],
      compliancePath: deal.compliance_path,
      estimatedTerms: deal.estimated_terms,
      status: deal.status,
      propertyAddress: deal.property_address,
      dealDescription: deal.deal_description,
      createdAt: deal.created_at,
    }));

    return res.status(200).json({ deals: formattedDeals });
  } catch (error) {
    console.error('Partner deals fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}
