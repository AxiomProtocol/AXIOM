import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Portal slug required' });
  }

  try {
    const result = await pool.query(
      `SELECT portal_name, company_name, logo_url, primary_color, secondary_color,
              welcome_message, contact_email, contact_phone, company_website
       FROM partner_portal_config 
       WHERE portal_slug = $1 AND is_active = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    return res.status(200).json({ portal: result.rows[0] });
  } catch (error) {
    console.error('Error fetching portal:', error);
    return res.status(500).json({ error: 'Failed to fetch portal' });
  }
}
