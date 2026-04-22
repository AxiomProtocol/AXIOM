import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

async function fetchATTOMData(propertyId: string) {
  const apiKey = process.env.ATTOM_API_KEY;
  if (!apiKey || !propertyId) return null;

  try {
    const response = await fetch(
      `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?attomid=${propertyId}`,
      {
        headers: { 'apikey': apiKey, 'Accept': 'application/json' }
      }
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('ATTOM API error:', error);
  }
  return null;
}

async function fetchWalkScore(lat: number, lng: number, address: string) {
  const apiKey = process.env.WALKSCORE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.walkscore.com/score?format=json&lat=${lat}&lon=${lng}&address=${encodeURIComponent(address)}&wsapikey=${apiKey}`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Walk Score API error:', error);
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;
  const userId = req.headers['x-user-id'];

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM due_diligence_reports WHERE id = $1`,
        [reportId]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Report fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  } else if (req.method === 'PUT') {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { action, data } = req.body;

    try {
      if (action === 'update_section') {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          updates.push(`${snakeKey} = $${paramIndex}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }

        updates.push(`updated_at = NOW()`);
        values.push(reportId);

        await pool.query(`
          UPDATE due_diligence_reports SET ${updates.join(', ')} WHERE id = $${paramIndex}
        `, values);

        res.status(200).json({ success: true, message: 'Report updated' });
      } else if (action === 'fetch_attom') {
        const reportResult = await pool.query(
          `SELECT land_option_id FROM due_diligence_reports WHERE id = $1`,
          [reportId]
        );
        
        const landOptionResult = await pool.query(
          `SELECT parcel_id, location FROM land_options WHERE id = $1`,
          [reportResult.rows[0]?.land_option_id]
        );

        const attomData = await fetchATTOMData(landOptionResult.rows[0]?.parcel_id);

        if (attomData) {
          await pool.query(`
            UPDATE due_diligence_reports 
            SET attom_data = $1, attom_property_id = $2, updated_at = NOW()
            WHERE id = $3
          `, [JSON.stringify(attomData), landOptionResult.rows[0]?.parcel_id, reportId]);
        }

        res.status(200).json({ success: true, data: attomData });
      } else if (action === 'approve') {
        await pool.query(`
          UPDATE due_diligence_reports 
          SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [userId, reportId]);

        res.status(200).json({ success: true, message: 'Report approved' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Report update error:', error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
