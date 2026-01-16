import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  if (req.method === 'POST') {
    return res.status(401).json({
      error: 'Subscription required to create cases',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
