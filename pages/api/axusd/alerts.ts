import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { userId, includeHistory } = req.query;

    try {
      let alerts;
      if (userId) {
        const parsedUserId = parseInt(userId as string, 10);
        if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
          return res.status(400).json({ success: false, error: 'Invalid userId - must be a positive integer' });
        }
        const result = await pool.query(
          'SELECT * FROM axusd_alerts WHERE user_id = $1',
          [parsedUserId]
        );
        alerts = result.rows;
      } else {
        const result = await pool.query('SELECT * FROM axusd_alerts WHERE is_active = true');
        alerts = result.rows;
      }

      let history = null;
      if (includeHistory === 'true') {
        const historyResult = await pool.query(
          'SELECT * FROM axusd_alert_history ORDER BY created_at DESC LIMIT 50'
        );
        history = historyResult.rows;
      }

      const defaultAlerts = [
        { type: 'peg_deviation', description: 'Alert when AXUSD price deviates from $1.00', defaultThreshold: 0.02, unit: '$ deviation' },
        { type: 'reserve_low', description: 'Alert when reserve ratio drops below threshold', defaultThreshold: 95, unit: '% ratio' },
        { type: 'high_utilization', description: 'Alert when debt utilization exceeds threshold', defaultThreshold: 80, unit: '% utilization' },
        { type: 'large_mint', description: 'Alert on large AXUSD mints', defaultThreshold: 10000, unit: 'AXUSD' },
        { type: 'large_redeem', description: 'Alert on large AXUSD redemptions', defaultThreshold: 10000, unit: 'AXUSD' },
        { type: 'liquidity_change', description: 'Alert on significant LP changes', defaultThreshold: 1000, unit: 'USD TVL change' }
      ];

      res.status(200).json({
        success: true,
        data: {
          userAlerts: alerts,
          recentHistory: history,
          availableAlertTypes: defaultAlerts,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Alerts GET error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch alerts', details: error.message });
    }
  } else if (req.method === 'POST') {
    const { userId, alertType, threshold, emailNotify, webhookUrl } = req.body;

    if (!alertType) {
      return res.status(400).json({ success: false, error: 'alertType is required' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO axusd_alerts (user_id, alert_type, threshold, email_notify, webhook_url) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId || null, alertType, threshold?.toString() || null, emailNotify ?? true, webhookUrl || null]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Alert created successfully'
      });
    } catch (error: any) {
      console.error('Alerts POST error:', error);
      res.status(500).json({ success: false, error: 'Failed to create alert', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Alert ID required' });
    }

    try {
      await pool.query(
        'UPDATE axusd_alerts SET is_active = false WHERE id = $1',
        [parseInt(id as string, 10)]
      );

      res.status(200).json({
        success: true,
        message: 'Alert deactivated successfully'
      });
    } catch (error: any) {
      console.error('Alerts DELETE error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete alert', details: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
