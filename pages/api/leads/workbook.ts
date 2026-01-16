import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { workbookLeads } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const existingLead = await db
      .select()
      .from(workbookLeads)
      .where(eq(workbookLeads.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingLead.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Already subscribed',
        isExisting: true 
      });
    }

    await db.insert(workbookLeads).values({
      email: email.toLowerCase().trim(),
      firstName: firstName?.trim() || null,
      source: source || 'reclaim-landing',
      status: 'active',
      createdAt: new Date(),
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed' 
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    return res.status(500).json({ error: 'Failed to save. Please try again.' });
  }
}
