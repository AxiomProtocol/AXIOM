import type { NextApiRequest, NextApiResponse } from 'next';

interface OnrampPublicConfig {
  appId: string;
  configured: boolean;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<OnrampPublicConfig>
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const appId = process.env.COINBASE_PROJECT_ID ?? '';
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).json({ appId, configured: !!appId });
}
