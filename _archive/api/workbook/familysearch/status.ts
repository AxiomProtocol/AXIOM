import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasFamilySearchKey = !!process.env.FAMILYSEARCH_CLIENT_ID;

  return res.status(200).json({
    configured: hasFamilySearchKey,
    connected: false,
    message: hasFamilySearchKey 
      ? 'FamilySearch is configured. Click connect to authenticate.'
      : 'FamilySearch API key not configured. Using AI-powered search instead.',
  });
}
