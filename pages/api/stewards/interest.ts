import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

async function isAdminAuthenticated(req: NextApiRequest): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SETUP_SECRET;
  
  if (authHeader && adminSecret) {
    const token = authHeader.replace('Bearer ', '');
    if (token === adminSecret) {
      return true;
    }
  }
  
  const sessionCookie = req.cookies?.['admin_session'];
  if (sessionCookie) {
    try {
      const result = await pool.query(
        'SELECT id FROM admin_sessions WHERE session_token = $1 AND expires_at > NOW()',
        [sessionCookie]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }
  
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, email, phone, region, city, state, motivation, source, referredBy } = req.body;

      if (!name || !email || !region) {
        return res.status(400).json({ success: false, error: 'Name, email, and region are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existing = await pool.query(
        'SELECT id FROM steward_interest_signups WHERE email = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        return res.status(200).json({ 
          success: true, 
          message: 'You have already expressed interest. We will be in touch soon!',
          alreadyExists: true
        });
      }

      const result = await pool.query(
        `INSERT INTO steward_interest_signups 
         (name, email, phone, region, city, state, motivation, source, referred_by, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', $10)
         RETURNING id`,
        [
          name.trim(),
          normalizedEmail,
          phone?.trim() || null,
          region.trim(),
          city?.trim() || null,
          state?.trim() || null,
          motivation?.trim() || null,
          source?.trim() || null,
          referredBy?.trim() || null,
          JSON.stringify({ userAgent: req.headers['user-agent'], timestamp: new Date().toISOString() })
        ]
      );

      return res.status(201).json({ 
        success: true, 
        message: 'Thank you for your interest! We will contact you soon.',
        id: result.rows[0].id
      });
    } catch (error) {
      console.error('Steward interest signup error:', error);
      return res.status(500).json({ success: false, error: 'Failed to submit interest' });
    }
  }

  if (req.method === 'GET') {
    const isAdmin = await isAdminAuthenticated(req);
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized - admin access required' });
    }

    try {
      const signupsResult = await pool.query(
        'SELECT * FROM steward_interest_signups ORDER BY created_at DESC'
      );

      const statsResult = await pool.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'new')::int as "newCount",
          COUNT(*) FILTER (WHERE status = 'contacted')::int as "contactedCount",
          COUNT(*) FILTER (WHERE converted_to_applicant = true)::int as "convertedCount"
        FROM steward_interest_signups
      `);

      const byRegionResult = await pool.query(`
        SELECT region, COUNT(*)::int as count 
        FROM steward_interest_signups 
        GROUP BY region 
        ORDER BY count DESC
      `);

      return res.status(200).json({
        success: true,
        signups: signupsResult.rows,
        stats: statsResult.rows[0],
        byRegion: byRegionResult.rows
      });
    } catch (error) {
      console.error('Fetch steward interests error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch interests' });
    }
  }

  if (req.method === 'PATCH') {
    const isAdmin = await isAdminAuthenticated(req);
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized - admin access required' });
    }

    try {
      const { id, status, notes, convertedToApplicant } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramCount = 1;

      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
        if (status === 'contacted') {
          updates.push('contacted_at = NOW()');
        }
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(notes);
      }
      if (convertedToApplicant !== undefined) {
        updates.push(`converted_to_applicant = $${paramCount++}`);
        values.push(convertedToApplicant);
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE steward_interest_signups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return res.status(200).json({ success: true, signup: result.rows[0] });
    } catch (error) {
      console.error('Update steward interest error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update interest' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
