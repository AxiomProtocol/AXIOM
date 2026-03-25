import { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet } from '../../../utils/auth';
import { treasuryService } from '../../../services/treasuryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { session } = req;

  // Require admin privileges after SIWE auth
  if (!isAdminWallet(session.address)) {
    return res.status(403).json({ code: 'TREASURY_PRIVILEGE_REQUIRED', message: 'User does not have the required privileges' });
  }

  // Existing behavior continues here
  if (req.method === 'GET') {
    try {
      const pendingTreasury = await treasuryService.getPendingTreasury();
      return res.status(200).json(pendingTreasury);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching pending treasury', error });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}