import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notifications = [
      {
        id: 'notif_001',
        type: 'payment',
        title: 'Payment Due Soon',
        message: 'Your contribution to Atlanta Builders Circle is due in 3 days. Amount: $100',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: 'notif_002',
        type: 'milestone',
        title: 'Milestone Achieved!',
        message: 'Congratulations! Your group completed 3 consecutive cycles. +50 Trust Points',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: 'notif_003',
        type: 'update',
        title: 'New Investment Opportunity',
        message: 'A new real estate pool is now available for Capital Mode groups.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: 'notif_004',
        type: 'reminder',
        title: 'Group Meeting Tomorrow',
        message: 'Tech Sisters Network monthly check-in is scheduled for tomorrow at 7 PM EST.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        id: 'notif_005',
        type: 'graduation',
        title: 'Graduation Progress Update',
        message: 'Your group is now at 85% graduation progress. Keep it up!',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
      }
    ];

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error: unknown) {
    console.error('Notification list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
