import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { sendWelcomeEmail } from '../../../lib/server/resendEmail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = await pool.connect();
  
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

    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                      req.headers['x-real-ip'] as string || 
                      req.socket?.remoteAddress || 
                      '';
    const cleanIp = typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null;

    const existingResult = await client.query(
      'SELECT id, calculator_data FROM leads WHERE email = $1',
      [normalizedEmail]
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      await client.query(
        `UPDATE leads 
         SET calculator_data = COALESCE($2, calculator_data),
             updated_at = NOW()
         WHERE id = $1`,
        [existing.id, calculatorData ? JSON.stringify(calculatorData) : null]
      );
      
      return res.status(200).json({ 
        message: 'Lead updated',
        isExisting: true 
      });
    }

    const validSources = ['equity_calculator', 'academy', 'keygrow', 'susu', 'whitepaper', 'newsletter', 'referral', 'tiktok', 'other'];
    const leadSource = validSources.includes(source) ? source : 'other';

    const result = await client.query(
      `INSERT INTO leads (email, first_name, last_name, source, utm_source, utm_medium, utm_campaign, calculator_data, ip_address, is_subscribed, is_converted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, NOW(), NOW())
       RETURNING id`,
      [normalizedEmail, firstName || null, lastName || null, leadSource, utmSource || null, utmMedium || null, utmCampaign || null, calculatorData ? JSON.stringify(calculatorData) : null, cleanIp]
    );

    sendWelcomeEmail(normalizedEmail).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return res.status(201).json({ 
      message: 'Lead captured successfully',
      leadId: result.rows[0].id 
    });

  } catch (error: any) {
    console.error('Lead capture error:', error);
    
    if (error.code === '23505') {
      return res.status(200).json({ 
        message: 'Already subscribed',
        isExisting: true 
      });
    }
    
    return res.status(500).json({ message: 'Failed to capture lead' });
  } finally {
    client.release();
  }
}
