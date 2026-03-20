import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../../server/services/secondary/auth';
import { getBeneficialOwnershipRegistry } from '../../../../../server/services/secondary/positions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!session.roles.includes('issuer') && !session.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Issuer role required' });
  }

  const { seriesId } = req.query as { seriesId: string };

  try {
    const registry = await getBeneficialOwnershipRegistry(seriesId);
    return res.status(200).json({ success: true, registry, count: registry.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
