import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../lib/capital/apiAuth';
import { getStatements } from '../../../../lib/capital/queryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data = await getStatements();
    return res.status(200).json({
      data,
      meta: buildMeta(['SNAPSHOTS', 'SNAPSHOT_LINES'], []),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  }
}
