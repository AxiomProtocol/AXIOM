import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';
import { getFamilySearchToken, isConfigured } from '../../../../lib/workbook/familysearch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const configured = isConfigured();
  if (!configured) {
    return res.status(200).json({ 
      configured: false,
      connected: false,
      message: 'FamilySearch integration not yet configured'
    });
  }

  const token = await getFamilySearchToken(userId);
  
  return res.status(200).json({
    configured: true,
    connected: !!token,
  });
}
