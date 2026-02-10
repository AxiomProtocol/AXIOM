import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM founder_ops_log ORDER BY created_at DESC LIMIT 100`
      );
      return res.status(200).json({ success: true, entries: result.rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    if (!isAuthorized(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized — x-scan-key required for write operations' });
    }

    const { week, phase, category, title, description, txHash, product, amount, status, failureReason, fixApplied, protocolChange } = req.body;

    if (!week || !phase || !category || !title || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields: week, phase, category, title, description' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO founder_ops_log (week, phase, category, title, description, tx_hash, product, amount, status, failure_reason, fix_applied, protocol_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [week, phase, category, title, description, txHash || null, product || null, amount || null, status || 'completed', failureReason || null, fixApplied || null, protocolChange || null]
      );
      return res.status(201).json({ success: true, entry: result.rows[0] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
