import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: true,
    data: {
      subscription: {
        hasAccess: false,
        isActive: false,
        isPastDue: false,
        periodEnd: null,
      },
      usage: null,
    },
  });
}
