import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthorizationUrl, isConfigured } from '../../../../lib/workbook/familysearch';
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
      message: 'Please add FAMILYSEARCH_CLIENT_ID to enable this feature'
    });
  }

  const state = `${userId}:${uuidv4()}`;
  const authUrl = getAuthorizationUrl(state);
  
  res.redirect(authUrl);
}
