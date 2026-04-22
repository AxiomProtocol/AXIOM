import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const modules = await ERC3643Service.getComplianceModules();
    return res.status(200).json({ success: true, data: modules });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
