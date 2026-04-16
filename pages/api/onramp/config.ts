import type { NextApiRequest, NextApiResponse } from 'next';
import { isCdpOnrampConfigured } from '../../../lib/onramp/sessionService';

interface OnrampPublicConfig {
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

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ configured: isCdpOnrampConfigured() });
}
