import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      phone,
      company,
      propertyType,
      acquisitionStructure,
      capitalNeed,
      exitStrategy,
      timeline,
      dealValue,
      partnerRole,
      recommendedPrimary,
      recommendedSecondary,
      recommendedProtection,
      compliancePath,
      estimatedTerms,
      dealDescription,
      propertyAddress,
    } = req.body;

    if (!name || !email || !propertyType || !acquisitionStructure || !capitalNeed || !exitStrategy || !timeline || !dealValue || !partnerRole) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await db.execute(sql`
      INSERT INTO partner_deal_submissions (
        name, email, phone, company,
        property_type, acquisition_structure, capital_need, exit_strategy,
        timeline, deal_value, partner_role,
        recommended_primary, recommended_secondary, recommended_protection,
        compliance_path, estimated_terms, deal_description, property_address,
        status, created_at, updated_at
      ) VALUES (
        ${name}, ${email}, ${phone || null}, ${company || null},
        ${propertyType}, ${acquisitionStructure}, ${capitalNeed}, ${exitStrategy},
        ${timeline}, ${dealValue}, ${partnerRole},
        ${recommendedPrimary || null}, 
        ${recommendedSecondary ? JSON.stringify(recommendedSecondary) : null}::jsonb,
        ${recommendedProtection ? JSON.stringify(recommendedProtection) : null}::jsonb,
        ${compliancePath || null}, 
        ${estimatedTerms ? JSON.stringify(estimatedTerms) : null}::jsonb,
        ${dealDescription || null}, ${propertyAddress || null},
        'new', NOW(), NOW()
      )
      RETURNING id
    `);

    const id = result.rows[0]?.id;

    return res.status(201).json({
      success: true,
      message: 'Deal submitted successfully',
      id,
    });
  } catch (error) {
    console.error('Partner deal submission error:', error);
    return res.status(500).json({ error: 'Failed to submit deal' });
  }
}
