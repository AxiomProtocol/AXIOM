import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { sendWorkbookWelcomeEmail } from '../../../lib/email/resend';

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

    const cleanEmail = email.toLowerCase().trim();
    const cleanFirstName = firstName?.trim() || 'Friend';
    const cleanSource = source || 'reclaim-landing';

    // Check if email already exists
    const existingResult = await pool.query(
      'SELECT id FROM workbook_leads WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (existingResult.rows.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Already subscribed',
        isExisting: true 
      });
    }

    // Insert new lead using raw SQL for reliability
    await pool.query(
      `INSERT INTO workbook_leads (email, first_name, source, status, created_at) 
       VALUES ($1, $2, $3, 'active', NOW())`,
      [cleanEmail, cleanFirstName, cleanSource]
    );

    // Send welcome email with checklist
    try {
      await sendWorkbookWelcomeEmail(cleanEmail, cleanFirstName);
      
      // Update last_email_sent_at
      await pool.query(
        'UPDATE workbook_leads SET last_email_sent_at = NOW() WHERE email = $1',
        [cleanEmail]
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails - lead is already saved
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed' 
    });

  } catch (error: any) {
    console.error('Lead capture error:', error);
    
    // Handle unique constraint violation (email already exists)
    if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
      return res.status(200).json({ 
        success: true, 
        message: 'Already subscribed',
        isExisting: true 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to save. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}
