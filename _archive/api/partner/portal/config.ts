import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' });
    }

    try {
      const result = await pool.query(
        'SELECT * FROM partner_portal_config WHERE partner_email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Portal not found', exists: false });
      }

      return res.status(200).json({ portal: result.rows[0] });
    } catch (error) {
      console.error('Error fetching portal config:', error);
      return res.status(500).json({ error: 'Failed to fetch portal config' });
    }
  }

  if (req.method === 'POST') {
    const {
      partner_email,
      portal_name,
      portal_slug,
      logo_url,
      primary_color,
      secondary_color,
      welcome_message,
      contact_email,
      contact_phone,
      company_name,
      company_website,
    } = req.body;

    if (!partner_email) {
      return res.status(400).json({ error: 'Partner email required' });
    }

    const slug = portal_slug || portal_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `portal-${Date.now()}`;

    try {
      const existingSlug = await pool.query(
        'SELECT id FROM partner_portal_config WHERE portal_slug = $1 AND partner_email != $2',
        [slug, partner_email]
      );
      
      if (existingSlug.rows.length > 0) {
        return res.status(400).json({ error: 'Portal URL already taken' });
      }

      const existing = await pool.query(
        'SELECT id FROM partner_portal_config WHERE partner_email = $1',
        [partner_email]
      );

      if (existing.rows.length > 0) {
        const result = await pool.query(
          `UPDATE partner_portal_config SET
            portal_name = COALESCE($2, portal_name),
            portal_slug = COALESCE($3, portal_slug),
            logo_url = COALESCE($4, logo_url),
            primary_color = COALESCE($5, primary_color),
            secondary_color = COALESCE($6, secondary_color),
            welcome_message = COALESCE($7, welcome_message),
            contact_email = COALESCE($8, contact_email),
            contact_phone = COALESCE($9, contact_phone),
            company_name = COALESCE($10, company_name),
            company_website = COALESCE($11, company_website),
            updated_at = NOW()
          WHERE partner_email = $1
          RETURNING *`,
          [partner_email, portal_name, slug, logo_url, primary_color, secondary_color, 
           welcome_message, contact_email, contact_phone, company_name, company_website]
        );
        return res.status(200).json({ portal: result.rows[0], updated: true });
      } else {
        const result = await pool.query(
          `INSERT INTO partner_portal_config 
            (partner_email, portal_name, portal_slug, logo_url, primary_color, secondary_color, 
             welcome_message, contact_email, contact_phone, company_name, company_website)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [partner_email, portal_name || 'My Investor Portal', slug, logo_url, 
           primary_color || '#D4AF37', secondary_color || '#10B981',
           welcome_message || 'Welcome to our investor portal.', contact_email || partner_email,
           contact_phone, company_name, company_website]
        );
        return res.status(201).json({ portal: result.rows[0], created: true });
      }
    } catch (error) {
      console.error('Error saving portal config:', error);
      return res.status(500).json({ error: 'Failed to save portal config' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
