import { NextApiRequest, NextApiResponse } from 'next';
import { sendWeeklyDigestToAll } from '../../../lib/server/weeklyDigest';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting weekly digest send...');
    const result = await sendWeeklyDigestToAll();
    console.log(`Weekly digest complete: ${result.sent} sent, ${result.failed} failed`);

    return res.status(200).json({
      success: true,
      message: 'Weekly digest sent',
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Weekly digest cron error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send weekly digest'
    });
  }
}
