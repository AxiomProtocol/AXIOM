import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { campaignId, referralCode, investorId, investedAmount, action } = req.body;

      if (action === 'track_click') {
        if (!referralCode) {
          return res.status(400).json({
            success: false,
            error: 'Referral code is required'
          });
        }

        const linkResult = await db.execute(sql`
          SELECT * FROM campaign_short_links 
          WHERE referral_code = ${referralCode}
        `);

        if (linkResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Referral code not found'
          });
        }

        const link = linkResult.rows[0] as any;

        await db.execute(sql`
          INSERT INTO referral_attributions (
            campaign_id, referrer_id, referral_code, conversion_status, clicked_at
          ) VALUES (
            ${link.campaign_id},
            ${link.created_by || null},
            ${referralCode},
            'clicked',
            NOW()
          )
        `);

        await db.execute(sql`
          UPDATE campaign_short_links
          SET click_count = click_count + 1
          WHERE referral_code = ${referralCode}
        `);

        return res.status(200).json({
          success: true,
          data: {
            campaignId: link.campaign_id,
            message: 'Click tracked'
          }
        });
      }

      if (action === 'record_investment') {
        if (!campaignId || !referralCode || !investorId || !investedAmount) {
          return res.status(400).json({
            success: false,
            error: 'Campaign ID, referral code, investor ID, and amount are required'
          });
        }

        await db.execute(sql`
          UPDATE referral_attributions
          SET investor_id = ${investorId},
              invested_amount = ${investedAmount},
              conversion_status = 'converted',
              converted_at = NOW()
          WHERE campaign_id = ${campaignId}
            AND referral_code = ${referralCode}
            AND investor_id IS NULL
          LIMIT 1
        `);

        return res.status(200).json({
          success: true,
          data: {
            message: 'Investment attribution recorded'
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use track_click or record_investment'
      });
    } catch (error: any) {
      console.error('Error processing referral:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { userId, campaignId, referralCode } = req.query;

      if (userId) {
        const result = await db.execute(sql`
          SELECT 
            ra.*,
            cc.title as campaign_title,
            u.first_name || ' ' || u.last_name as investor_name
          FROM referral_attributions ra
          JOIN crowdfunding_campaigns cc ON ra.campaign_id = cc.id
          LEFT JOIN users u ON ra.investor_id = u.id
          WHERE ra.referrer_id = ${Number(userId)}
          ORDER BY ra.clicked_at DESC
        `);

        const stats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT investor_id) FILTER (WHERE conversion_status = 'converted') as conversions,
            SUM(invested_amount) FILTER (WHERE conversion_status = 'converted') as total_referred_investment
          FROM referral_attributions
          WHERE referrer_id = ${Number(userId)}
        `);

        return res.status(200).json({
          success: true,
          data: {
            attributions: result.rows,
            stats: stats.rows[0]
          }
        });
      }

      if (campaignId) {
        const result = await db.execute(sql`
          SELECT 
            referral_code,
            COUNT(*) as clicks,
            COUNT(DISTINCT investor_id) FILTER (WHERE conversion_status = 'converted') as conversions,
            SUM(invested_amount) FILTER (WHERE conversion_status = 'converted') as investment_amount
          FROM referral_attributions
          WHERE campaign_id = ${Number(campaignId)}
          GROUP BY referral_code
          ORDER BY conversions DESC, clicks DESC
        `);

        return res.status(200).json({
          success: true,
          data: {
            referralStats: result.rows
          }
        });
      }

      if (referralCode) {
        const result = await db.execute(sql`
          SELECT 
            COUNT(*) as clicks,
            COUNT(DISTINCT investor_id) FILTER (WHERE conversion_status = 'converted') as conversions,
            SUM(invested_amount) FILTER (WHERE conversion_status = 'converted') as total_investment
          FROM referral_attributions
          WHERE referral_code = ${String(referralCode)}
        `);

        return res.status(200).json({
          success: true,
          data: result.rows[0]
        });
      }

      return res.status(400).json({
        success: false,
        error: 'userId, campaignId, or referralCode required'
      });
    } catch (error: any) {
      console.error('Error fetching referral stats:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
