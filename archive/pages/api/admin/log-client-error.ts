import type { NextApiRequest, NextApiResponse } from 'next';
import { logError } from '../../../lib/errorLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { statusCode, message, url, userAgent, timestamp, componentStack } = req.body;

    logError(message || 'Client-side error', {
      path: url,
      statusCode: statusCode || 500,
      userAgent,
      additionalInfo: {
        source: 'client',
        componentStack,
        reportedAt: timestamp,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log error' });
  }
}
