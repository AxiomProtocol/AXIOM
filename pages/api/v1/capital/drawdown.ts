import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../lib/capital/apiAuth';
import { getDrawdownState } from '../../../../lib/capital/queryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const period = (req.query.period as string) || 'month';
    if (!['day', 'week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const data = await getDrawdownState(period as any);
    return res.status(200).json({
      data,
      meta: buildMeta(['POSITIONS'], []),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  }
}
