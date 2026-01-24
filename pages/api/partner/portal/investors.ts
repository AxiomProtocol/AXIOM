import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';
import { sendPartnerEmail } from '../../../../server/services/partner-email';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { partner_email } = req.query;
    
    if (!partner_email || typeof partner_email !== 'string') {
      return res.status(400).json({ error: 'Partner email required' });
    }

    try {
      const portal = await pool.query(
        'SELECT id FROM partner_portal_config WHERE partner_email = $1',
        [partner_email]
      );
      
      if (portal.rows.length === 0) {
        return res.status(404).json({ error: 'Portal not found' });
      }

      const result = await pool.query(
        `SELECT id, email, name, phone, accreditation_status, kyc_status, 
                last_login, created_at
         FROM portal_investors 
         WHERE portal_id = $1 
         ORDER BY created_at DESC`,
        [portal.rows[0].id]
      );

      return res.status(200).json({ investors: result.rows });
    } catch (error) {
      console.error('Error fetching investors:', error);
      return res.status(500).json({ error: 'Failed to fetch investors' });
    }
  }

  if (req.method === 'POST') {
    const { partner_email, investor_email, investor_name, investor_phone } = req.body;

    if (!partner_email || !investor_email) {
      return res.status(400).json({ error: 'Partner email and investor email required' });
    }

    try {
      const portal = await pool.query(
        'SELECT id, portal_slug, portal_name, company_name FROM partner_portal_config WHERE partner_email = $1',
        [partner_email]
      );
      
      if (portal.rows.length === 0) {
        return res.status(404).json({ error: 'Portal not found. Create your portal first.' });
      }

      const portalData = portal.rows[0];
      
      const existing = await pool.query(
        'SELECT id FROM portal_investors WHERE portal_id = $1 AND email = $2',
        [portalData.id, investor_email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Investor already exists in your portal' });
      }

      const token = generateToken();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `INSERT INTO portal_investors 
          (portal_id, email, name, phone, password_reset_token, password_reset_expires)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name`,
        [portalData.id, investor_email, investor_name, investor_phone, token, expires]
      );

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const setupUrl = `${baseUrl}/investor/${portalData.portal_slug}/setup?token=${token}`;

      await sendPartnerEmail({
        to: investor_email,
        subject: `You've been invited to ${portalData.company_name || portalData.portal_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D4AF37;">Welcome to ${portalData.company_name || portalData.portal_name}</h2>
            <p>You've been invited to join the investor portal.</p>
            <p>Click the button below to set up your account and access your investment dashboard:</p>
            <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; background: #D4AF37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
              Set Up Your Account
            </a>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you have questions, contact us at ${partner_email}.</p>
          </div>
        `,
      });

      return res.status(201).json({ 
        investor: result.rows[0], 
        invited: true,
        message: 'Investor invited successfully' 
      });
    } catch (error) {
      console.error('Error inviting investor:', error);
      return res.status(500).json({ error: 'Failed to invite investor' });
    }
  }

  if (req.method === 'DELETE') {
    const { partner_email, investor_id } = req.body;

    if (!partner_email || !investor_id) {
      return res.status(400).json({ error: 'Partner email and investor ID required' });
    }

    try {
      const portal = await pool.query(
        'SELECT id FROM partner_portal_config WHERE partner_email = $1',
        [partner_email]
      );
      
      if (portal.rows.length === 0) {
        return res.status(404).json({ error: 'Portal not found' });
      }

      await pool.query(
        'DELETE FROM portal_investors WHERE id = $1 AND portal_id = $2',
        [investor_id, portal.rows[0].id]
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing investor:', error);
      return res.status(500).json({ error: 'Failed to remove investor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
