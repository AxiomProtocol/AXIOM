import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { generatePasswordToken, sendPartnerWelcomeEmail } from '../../../server/services/partner-email';

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

    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.execute(sql`
      INSERT INTO partner_deal_submissions (
        name, email, phone, company,
        property_type, acquisition_structure, capital_need, exit_strategy,
        timeline, deal_value, partner_role,
        recommended_primary, recommended_secondary, recommended_protection,
        compliance_path, estimated_terms, deal_description, property_address,
        status, created_at, updated_at
      ) VALUES (
        ${name}, ${normalizedEmail}, ${phone || null}, ${company || null},
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

    const dealId = result.rows[0]?.id;

    const existingAuth = await db.execute(sql`
      SELECT id, password_hash FROM partner_auth WHERE email = ${normalizedEmail}
    `);

    let passwordToken: string | null = null;
    let isNewAccount = false;

    if (existingAuth.rows.length === 0) {
      passwordToken = generatePasswordToken();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await db.execute(sql`
        INSERT INTO partner_auth (email, password_reset_token, password_reset_expires, created_at, updated_at)
        VALUES (${normalizedEmail}, ${passwordToken}, ${tokenExpires.toISOString()}::timestamp, NOW(), NOW())
      `);
      isNewAccount = true;
    } else if (!existingAuth.rows[0].password_hash) {
      passwordToken = generatePasswordToken();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await db.execute(sql`
        UPDATE partner_auth 
        SET password_reset_token = ${passwordToken}, 
            password_reset_expires = ${tokenExpires.toISOString()}::timestamp,
            updated_at = NOW()
        WHERE email = ${normalizedEmail}
      `);
      isNewAccount = true;
    }

    if (passwordToken) {
      try {
        await sendPartnerWelcomeEmail(normalizedEmail, name, passwordToken, dealId);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Deal submitted successfully',
      id: dealId,
      isNewAccount,
    });
  } catch (error) {
    console.error('Partner deal submission error:', error);
    return res.status(500).json({ error: 'Failed to submit deal' });
  }
}
