import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, properties, timestamp, page } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, properties, { timestamp, page });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
}
