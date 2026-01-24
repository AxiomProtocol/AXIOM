import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { partnerDealSubmissions } from '../../../shared/schema';

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

    const [submission] = await db.insert(partnerDealSubmissions).values({
      name,
      email,
      phone: phone || null,
      company: company || null,
      propertyType,
      acquisitionStructure,
      capitalNeed,
      exitStrategy,
      timeline,
      dealValue,
      partnerRole,
      recommendedPrimary: recommendedPrimary || null,
      recommendedSecondary: recommendedSecondary || null,
      recommendedProtection: recommendedProtection || null,
      compliancePath: compliancePath || null,
      estimatedTerms: estimatedTerms || null,
      dealDescription: dealDescription || null,
      propertyAddress: propertyAddress || null,
    }).returning();

    return res.status(201).json({
      success: true,
      message: 'Deal submitted successfully',
      id: submission.id,
    });
  } catch (error) {
    console.error('Partner deal submission error:', error);
    return res.status(500).json({ error: 'Failed to submit deal' });
  }
}
