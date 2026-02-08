import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { campaignId, poolId, userId } = req.query;

    try {
      let query = `
        SELECT 
          cu.*,
          u.wallet_address as author_name,
          cc.title as campaign_title,
          lap.name as pool_name
        FROM campaign_updates cu
        LEFT JOIN users u ON cu.author_id = u.id
        LEFT JOIN crowdfunding_campaigns cc ON cu.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON cu.pool_id = lap.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (campaignId) {
        params.push(campaignId);
        query += ` AND cu.campaign_id = $${params.length}`;
      }

      if (poolId) {
        params.push(poolId);
        query += ` AND cu.pool_id = $${params.length}`;
      }

      if (userId) {
        params.push(userId);
        query += ` AND (
          cu.visibility = 'public'
          OR (cu.visibility = 'investors_only' AND (
            cu.campaign_id IN (SELECT campaign_id FROM crowdfunding_investments WHERE investor_id = $${params.length})
            OR cu.pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = $${params.length})
          ))
        )`;
      }

      query += ` ORDER BY cu.pinned DESC, cu.created_at DESC LIMIT 20`;

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        data: {
          updates: result.rows.map((u: any) => ({
            id: u.id,
            title: u.title,
            content: u.content,
            updateType: u.update_type,
            images: u.images || [],
            attachments: u.attachments || [],
            visibility: u.visibility,
            viewCount: u.view_count,
            pinned: u.pinned,
            authorName: u.author_name?.slice(0, 6) + '...',
            campaignTitle: u.campaign_title,
            poolName: u.pool_name,
            createdAt: u.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Updates fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch updates' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { campaignId, poolId, title, content, updateType, images, visibility, notifyInvestors } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO campaign_updates 
        (campaign_id, pool_id, author_id, title, content, update_type, images, visibility, notify_investors)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        campaignId || null,
        poolId || null,
        userId,
        title,
        content,
        updateType || 'general',
        JSON.stringify(images || []),
        visibility || 'investors_only',
        notifyInvestors !== false,
      ]);

      if (notifyInvestors !== false) {
        const investorsResult = await pool.query(`
          SELECT DISTINCT investor_id as user_id FROM crowdfunding_investments WHERE campaign_id = $1 AND status = 'confirmed'
          UNION
          SELECT DISTINCT user_id FROM pool_members WHERE pool_id = $2 AND active = true
        `, [campaignId, poolId]);

        for (const investor of investorsResult.rows) {
          await pool.query(`
            INSERT INTO investor_notifications (user_id, campaign_id, pool_id, type, title, message, action_url)
            VALUES ($1, $2, $3, 'campaign_update', 'New Update', $4, $5)
          `, [
            investor.user_id,
            campaignId,
            poolId,
            `${title}: ${content.substring(0, 100)}...`,
            `/land-acquisition/updates/${result.rows[0].id}`
          ]);
        }

        await pool.query(`
          UPDATE campaign_updates SET notifications_sent = $1 WHERE id = $2
        `, [investorsResult.rows.length, result.rows[0].id]);
      }

      res.status(201).json({
        success: true,
        data: { updateId: result.rows[0].id },
      });
    } catch (error) {
      console.error('Update create error:', error);
      res.status(500).json({ error: 'Failed to create update' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
