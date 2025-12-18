import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { leads } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      email,
      firstName,
      lastName,
      source,
      utmSource,
      utmMedium,
      utmCampaign,
      calculatorData
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingLead = await db.select().from(leads).where(eq(leads.email, email.toLowerCase())).limit(1);
    
    if (existingLead.length > 0) {
      await db.update(leads)
        .set({
          calculatorData: calculatorData || existingLead[0].calculatorData,
          updatedAt: new Date()
        })
        .where(eq(leads.email, email.toLowerCase()));
      
      return res.status(200).json({ 
        message: 'Lead updated',
        isExisting: true 
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] as string || 
                      req.headers['x-real-ip'] as string || 
                      req.socket?.remoteAddress || 
                      '';

    const [newLead] = await db.insert(leads).values({
      email: email.toLowerCase(),
      firstName: firstName || null,
      lastName: lastName || null,
      source: source || 'other',
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      calculatorData: calculatorData || null,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null,
      isSubscribed: true,
      isConverted: false
    }).returning();

    return res.status(201).json({ 
      message: 'Lead captured successfully',
      leadId: newLead.id 
    });

  } catch (error: any) {
    console.error('Lead capture error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    
    return res.status(500).json({ message: 'Failed to capture lead' });
  }
}
