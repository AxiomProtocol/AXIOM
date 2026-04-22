import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';
import { DEPLOYER_EOA } from '../../../../src/config/adminRoles';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { claimId } = req.body as { claimId?: string };

  if (!claimId || typeof claimId !== 'string') {
    return res.status(400).json({ error: 'claimId required' });
  }

  const operator = DEPLOYER_EOA;

  try {
    const result = await ERC3643Service.revokeClaim(claimId, operator);
    return res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
