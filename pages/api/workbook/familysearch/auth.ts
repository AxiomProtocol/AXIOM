import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthorizationUrl, isConfigured, saveOAuthState } from '../../../../lib/workbook/familysearch';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ 
      error: 'FamilySearch integration not configured',
      message: 'FamilySearch integration is coming soon'
    });
  }

  const stateToken = uuidv4();
  await saveOAuthState(userId, stateToken);
  
  const authUrl = getAuthorizationUrl(stateToken);
  
  res.redirect(authUrl);
}
