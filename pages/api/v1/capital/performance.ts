import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../lib/capital/apiAuth';
import { getPerformanceMetrics } from '../../../../lib/capital/queryService';

const VALID_PERIODS = ['day', 'week', 'month', 'year'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const period = (req.query.period as string) || 'month';
    if (!VALID_PERIODS.includes(period as any)) {
      return res.status(400).json({ error: 'Invalid period. Use day, week, month, or year.' });
    }
    const anchor = req.query.anchor as string | undefined;

    const metrics = await getPerformanceMetrics(period as any, anchor);
    return res.status(200).json({
      data: metrics,
      meta: buildMeta(['POSITIONS', 'FEES', 'MARKS'], metrics.warnings),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  }
}
