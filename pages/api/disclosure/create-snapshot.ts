import type { NextApiRequest, NextApiResponse } from 'next';
import { disclosureSnapshotService } from '../../../lib/services/DisclosureSnapshotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type = 'treasury' } = req.body ?? {};
  const validTypes = ['treasury', 'reserve', 'solvency', 'system_state'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await disclosureSnapshotService.createSnapshot(type);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    return res.status(201).json({ success: true, data: result.snapshot });
  } catch (err: any) {
    console.error('[api/disclosure/create-snapshot]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to create snapshot' });
  }
}
