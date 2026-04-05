import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const circleConfigured = Boolean(process.env.CIRCLE_COMPLIANCE_API_KEY);

  try {
    const { getPool } = await import('../../../lib/server/db');
    const pool = getPool();

    const [recentResult, deniedResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT wallet_address, chain, result, risk_score, risk_categories, screened_at
         FROM circle_screening_results
         ORDER BY screened_at DESC LIMIT 20`
      ),
      pool.query(
        `SELECT wallet_address, chain, risk_score, risk_categories, screened_at
         FROM circle_screening_results
         WHERE result = 'DENIED'
         ORDER BY screened_at DESC LIMIT 10`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE result = 'APPROVED') AS approved_count,
           COUNT(*) FILTER (WHERE result = 'DENIED') AS denied_count,
           COUNT(*) FILTER (WHERE result = 'REVIEW') AS review_count,
           COUNT(*) AS total_count
         FROM circle_screening_results`
      ),
    ]);

    const stats = statsResult.rows[0] ?? {};

    return res.status(200).json({
      success: true,
      data: {
        circleConfigured,
        stats: {
          total: Number(stats.total_count ?? 0),
          approved: Number(stats.approved_count ?? 0),
          denied: Number(stats.denied_count ?? 0),
          review: Number(stats.review_count ?? 0),
        },
        recent: recentResult.rows,
        denied: deniedResult.rows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
