import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      eventType,
      eventData,
      parcelId,
      userId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referralCode,
      landingPage
    } = req.body;

    const sessionId = req.cookies['land_fund_session'] || uuidv4();

    let attributionId: number | null = null;

    if (utmSource || utmCampaign || referralCode) {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ipAddress = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const attribution = await pool.query(
        `INSERT INTO land_fund_attribution 
         (session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referral_code, landing_page, ip_address, user_agent, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         RETURNING id`,
        [sessionId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referralCode, landingPage, ipAddress, userAgent, userId]
      );
      attributionId = attribution.rows[0].id;
    }

    if (eventType) {
      await pool.query(
        `INSERT INTO land_fund_funnel_events 
         (session_id, user_id, event_type, event_data, attribution_id, parcel_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, userId, eventType, JSON.stringify(eventData || {}), attributionId, parcelId]
      );
    }

    res.setHeader('Set-Cookie', `land_fund_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);

    res.status(200).json({
      success: true,
      sessionId,
      attributionId
    });

  } catch (error: any) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
}
