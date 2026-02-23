import type { NextApiRequest, NextApiResponse } from 'next';
import { isCapitalAuthorized, buildMeta } from '../../../../lib/capital/apiAuth';
import { getSnapshots, getSnapshotDetail } from '../../../../lib/capital/queryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isCapitalAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const id = req.query.id as string | undefined;
    if (id) {
      const detail = await getSnapshotDetail(id);
      if (!detail) return res.status(404).json({ error: 'Snapshot not found' });
      return res.status(200).json({
        data: detail,
        meta: buildMeta(['SNAPSHOTS'], []),
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const data = await getSnapshots(page, pageSize);
    return res.status(200).json({
      data,
      meta: buildMeta(['SNAPSHOTS'], []),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      meta: buildMeta([], [err.message], 'LOW'),
    });
  }
}
