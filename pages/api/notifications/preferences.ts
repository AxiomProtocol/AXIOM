import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface NotificationPreferences {
  email: {
    paymentReminders: boolean;
    milestones: boolean;
    graduations: boolean;
    weeklyDigest: boolean;
    groupUpdates: boolean;
    investmentOpportunities: boolean;
  };
  inApp: {
    paymentReminders: boolean;
    milestones: boolean;
    graduations: boolean;
    groupActivity: boolean;
    systemUpdates: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const defaultPreferences: NotificationPreferences = {
  email: {
    paymentReminders: true,
    milestones: true,
    graduations: true,
    weeklyDigest: true,
    groupUpdates: false,
    investmentOpportunities: true
  },
  inApp: {
    paymentReminders: true,
    milestones: true,
    graduations: true,
    groupActivity: true,
    systemUpdates: true
  },
  frequency: 'immediate',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT preferences FROM user_notification_preferences
        WHERE user_id = $1
      `, [userId]);

      if (result.rows[0]?.preferences) {
        return res.status(200).json({
          success: true,
          preferences: result.rows[0].preferences,
          dataSource: 'database'
        });
      }

      return res.status(200).json({
        success: true,
        preferences: defaultPreferences,
        dataSource: 'default'
      });
    } catch (error) {
      console.log('Returning default preferences:', error);
      return res.status(200).json({
        success: true,
        preferences: defaultPreferences,
        dataSource: 'default'
      });
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const { preferences } = req.body;

      if (!preferences) {
        return res.status(400).json({ error: 'Preferences object is required' });
      }

      const mergedPreferences = {
        email: { ...defaultPreferences.email, ...preferences.email },
        inApp: { ...defaultPreferences.inApp, ...preferences.inApp },
        frequency: preferences.frequency || defaultPreferences.frequency,
        quietHours: { ...defaultPreferences.quietHours, ...preferences.quietHours }
      };

      await pool.query(`
        INSERT INTO user_notification_preferences (user_id, preferences, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET preferences = $2, updated_at = NOW()
      `, [userId, JSON.stringify(mergedPreferences)]);

      return res.status(200).json({
        success: true,
        preferences: mergedPreferences,
        message: 'Preferences saved successfully',
        persisted: true,
        savedAt: new Date().toISOString()
      });
    } catch (error: unknown) {
      console.error('Save preferences error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
