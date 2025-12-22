import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { charterId, userId } = req.query;

      if (!charterId) {
        return res.status(400).json({ error: 'charterId is required' });
      }

      let query = `
        SELECT 
          a.*,
          u.wallet_address,
          c.version as current_charter_version
        FROM susu_charter_acceptances a
        JOIN users u ON a.user_id = u.id
        JOIN susu_charters c ON a.charter_id = c.id
        WHERE a.charter_id = $1
      `;

      const params: any[] = [parseInt(charterId as string)];

      if (userId) {
        query += ' AND a.user_id = $2';
        params.push(parseInt(userId as string));
      }

      query += ' ORDER BY a.accepted_at DESC';

      const { rows } = await pool.query(query, params);

      res.status(200).json({
        success: true,
        acceptances: rows
      });
    } catch (error: any) {
      console.error('Error fetching charter acceptances:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch acceptances' });
    }
  } else if (req.method === 'POST') {
    try {
      const { charterId, userId, walletSignature } = req.body;

      if (!charterId || !userId) {
        return res.status(400).json({ error: 'charterId and userId are required' });
      }

      const { rows: charterRows } = await pool.query(`
        SELECT version FROM susu_charters WHERE id = $1
      `, [parseInt(charterId)]);

      if (charterRows.length === 0) {
        return res.status(404).json({ error: 'Charter not found' });
      }

      const charterVersion = charterRows[0].version;

      const { rows: existingRows } = await pool.query(`
        SELECT id FROM susu_charter_acceptances
        WHERE charter_id = $1 AND user_id = $2 AND charter_version = $3
      `, [parseInt(charterId), parseInt(userId), charterVersion]);

      if (existingRows.length > 0) {
        return res.status(409).json({ 
          error: 'User has already accepted this charter version',
          acceptanceId: existingRows[0].id
        });
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                        req.socket.remoteAddress || 
                        'unknown';

      const { rows } = await pool.query(`
        INSERT INTO susu_charter_acceptances (
          charter_id, user_id, charter_version, wallet_signature, ip_address
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        parseInt(charterId),
        parseInt(userId),
        charterVersion,
        walletSignature || null,
        ipAddress
      ]);

      res.status(201).json({
        success: true,
        acceptance: rows[0]
      });
    } catch (error: any) {
      console.error('Error accepting charter:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to accept charter' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
