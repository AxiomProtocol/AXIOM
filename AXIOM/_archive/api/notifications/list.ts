import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { userNotifications, users } from '../../../shared/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, limit = '20' } = req.query;

  try {
    if (userId && typeof userId === 'string') {
      const userIdNum = parseInt(userId, 10);
      
      if (isNaN(userIdNum) || userIdNum <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid userId parameter - must be a positive integer'
        });
      }
      
      const dbNotifications = await db
        .select({
          id: userNotifications.id,
          title: userNotifications.title,
          message: userNotifications.message,
          type: userNotifications.type,
          isRead: userNotifications.isRead,
          actionUrl: userNotifications.actionUrl,
          createdAt: userNotifications.createdAt
        })
        .from(userNotifications)
        .where(eq(userNotifications.userId, userIdNum))
        .orderBy(desc(userNotifications.createdAt))
        .limit(parseInt(limit as string, 10));

      if (dbNotifications.length > 0) {
        const [unreadStats] = await db
          .select({
            count: count(userNotifications.id)
          })
          .from(userNotifications)
          .where(and(
            eq(userNotifications.userId, userIdNum),
            eq(userNotifications.isRead, false)
          ));

        return res.status(200).json({
          success: true,
          notifications: dbNotifications.map(n => ({
            id: `notif_${n.id}`,
            type: n.type || 'general',
            title: n.title,
            message: n.message,
            read: n.isRead,
            actionUrl: n.actionUrl,
            createdAt: n.createdAt?.toISOString()
          })),
          unreadCount: unreadStats?.count || 0,
          dataSource: 'database'
        });
      }
    }

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
      unreadCount: notifications.filter(n => !n.read).length,
      dataSource: 'sample'
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
