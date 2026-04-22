import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { estimateId } = req.query as { estimateId: string };

  if (!estimateId) return res.status(400).json({ error: 'estimateId required' });

  try {
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT id, estimate_id, version, triggered_by, snapshot_json, created_at
           FROM cost_estimate_versions
           WHERE estimate_id = $1
           ORDER BY version DESC
           LIMIT 50`,
          [estimateId],
        );

        const versions = rows.map(r => ({
          id: r.id,
          estimateId: r.estimate_id,
          version: r.version,
          triggeredBy: r.triggered_by,
          snapshotJson: r.snapshot_json,
          createdAt: r.created_at,
        }));

        return res.json({ versions });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
