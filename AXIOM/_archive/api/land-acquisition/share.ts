import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

function generateShortSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AX';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { campaignId, utmSource, utmMedium, utmCampaign, userId } = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required'
        });
      }

      const slug = generateShortSlug();
      const referralCode = userId ? generateReferralCode() : null;

      const result = await db.execute(sql`
        INSERT INTO campaign_short_links (
          campaign_id, slug, utm_source, utm_medium, utm_campaign,
          referral_code, created_by, created_at
        ) VALUES (
          ${campaignId},
          ${slug},
          ${utmSource || null},
          ${utmMedium || null},
          ${utmCampaign || null},
          ${referralCode},
          ${userId || null},
          NOW()
        )
        RETURNING *
      `);

      const shortLink = result.rows[0] as any;
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://axiom.city';
      const fullUrl = `${baseUrl}/c/${slug}`;

      return res.status(201).json({
        success: true,
        data: {
          shortLink,
          url: fullUrl,
          referralCode,
          shareText: {
            twitter: `Join me in investing in real land! Check out this community land project: ${fullUrl}`,
            facebook: `I'm investing in community land ownership. See this opportunity: ${fullUrl}`,
            linkedin: `Excited about this SEC Reg CF compliant land investment opportunity. Learn more: ${fullUrl}`,
            email: {
              subject: 'Check out this land investment opportunity',
              body: `Hi,\n\nI wanted to share this community land investment opportunity with you. It's SEC Reg CF compliant and you can invest as little as $100.\n\nLearn more: ${fullUrl}\n\nBest regards`
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error creating share link:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { slug, campaignId } = req.query;

      if (slug) {
        const result = await db.execute(sql`
          SELECT csl.*, cc.title, cc.subtitle, cc.target_amount, cc.raised_amount,
                 cc.investor_count, cc.status, lo.location, lo.acreage
          FROM campaign_short_links csl
          JOIN crowdfunding_campaigns cc ON csl.campaign_id = cc.id
          JOIN land_options lo ON cc.land_option_id = lo.id
          WHERE csl.slug = ${String(slug)}
        `);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Share link not found'
          });
        }

        await db.execute(sql`
          UPDATE campaign_short_links
          SET click_count = click_count + 1
          WHERE slug = ${String(slug)}
        `);

        return res.status(200).json({
          success: true,
          data: result.rows[0]
        });
      }

      if (campaignId) {
        const result = await db.execute(sql`
          SELECT * FROM campaign_short_links
          WHERE campaign_id = ${Number(campaignId)}
          ORDER BY created_at DESC
        `);

        return res.status(200).json({
          success: true,
          data: result.rows
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Slug or campaignId required'
      });
    } catch (error: any) {
      console.error('Error fetching share link:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
