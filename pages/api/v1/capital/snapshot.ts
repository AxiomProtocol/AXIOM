import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../lib/capital/apiAuth';
import { createSnapshot } from '../../../../lib/capital/snapshotEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await createSnapshot();
    return res.status(201).json({
      data: result,
      meta: buildMeta(result.sourcesUsed, result.warnings),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  }
}
