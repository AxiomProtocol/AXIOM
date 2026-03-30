import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { claimId, adminWallet } = req.body as { claimId?: string; adminWallet?: string };

  if (!claimId || typeof claimId !== 'string') {
    return res.status(400).json({ error: 'claimId required' });
  }

  const operator = adminWallet ?? 'compliance-operator';

  try {
    const result = await ERC3643Service.revokeClaim(claimId, operator);
    return res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
