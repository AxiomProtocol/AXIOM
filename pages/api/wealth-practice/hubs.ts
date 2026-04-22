import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      let result;
      try {
        result = await pool.query(
          `SELECT * FROM susu_interest_hubs WHERE is_active = true ORDER BY member_count DESC`
        );
      } catch (colErr: any) {
        if (colErr.message?.includes('column') && colErr.message?.includes('does not exist')) {
          result = await pool.query(
            `SELECT *, 0 as member_count FROM susu_interest_hubs ORDER BY created_at DESC`
          );
        } else {
          throw colErr;
        }
      }

      return res.status(200).json({
        success: true,
        hubs: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('Wealth Practice hubs error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch interest hubs',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { hubName, description, city, region, regionType, interest } = req.body;

      if (!hubName || !hubName.trim()) {
        return res.status(400).json({ success: false, error: 'Hub name is required' });
      }
      if (!city || !city.trim()) {
        return res.status(400).json({ success: false, error: 'City is required' });
      }
      if (!region || !region.trim()) {
        return res.status(400).json({ success: false, error: 'Region/state is required' });
      }

      const hubId = `hub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const regionDisplay = `${city.trim()}, ${region.trim()}`;
      const rType = regionType || 'metro';
      const desc = interest
        ? `${(description || '').trim()} | Interest: ${interest.trim()}`.trim().replace(/^\| /, '')
        : (description || '').trim();

      const result = await pool.query(
        `INSERT INTO susu_interest_hubs (hub_id, hub_name, description, region_id, region_display, region_type, member_count, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 0, true)
         RETURNING *`,
        [hubId, hubName.trim(), desc || null, `${city.trim().toLowerCase().replace(/\s+/g, '-')}_${region.trim().toLowerCase().replace(/\s+/g, '-')}`, regionDisplay, rType]
      );

      return res.status(201).json({
        success: true,
        hub: result.rows[0],
      });
    } catch (error: any) {
      console.error('Create hub error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create interest hub',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
