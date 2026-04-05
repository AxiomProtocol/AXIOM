import type { NextApiRequest, NextApiResponse } from 'next';
import { disclosureSnapshotService } from '../../../lib/services/DisclosureSnapshotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { history } = req.query;

  try {
    if (history === 'true') {
      const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10), 50);
      const snapshots = await disclosureSnapshotService.getSnapshotHistory(limit);
      return res.status(200).json({ success: true, data: snapshots, count: snapshots.length });
    }

    const snapshot = await disclosureSnapshotService.getLatestSnapshot();
    if (!snapshot) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No disclosure snapshot found. POST /api/disclosure/create-snapshot to generate one.',
      });
    }

    return res.status(200).json({ success: true, data: snapshot });
  } catch (err: any) {
    console.error('[api/disclosure/system-snapshot]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch disclosure snapshot' });
  }
}
