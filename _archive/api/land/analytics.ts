import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { candidateId, action, userAgent } = req.body;

    if (!candidateId || !action) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    await pool.query(
      `INSERT INTO system_audit_logs (action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        `land_candidate_${action}`,
        'land_candidate',
        parseInt(candidateId, 10),
        JSON.stringify({
          action,
          userAgent: userAgent?.substring(0, 255),
          clientIp: typeof clientIp === 'string' ? clientIp : clientIp[0]
        })
      ]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return res.status(200).json({ success: true });
  }
}
