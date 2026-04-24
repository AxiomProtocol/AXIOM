import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status = 'active', campaignId, poolId } = req.query;
      
      let query = `
        SELECT 
          sml.id,
          sml.seller_id,
          sml.seller_wallet,
          sml.campaign_id,
          sml.pool_id,
          sml.token_type,
          sml.shares_for_sale,
          sml.price_per_share,
          sml.total_price,
          sml.min_purchase,
          sml.status,
          sml.expires_at,
          sml.created_at,
          u.wallet_address as seller_display,
          cc.title as campaign_title,
          lap.name as pool_name,
          lo.location,
          lo.acreage
        FROM secondary_market_listings sml
        LEFT JOIN users u ON sml.seller_id = u.id
        LEFT JOIN crowdfunding_campaigns cc ON sml.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON sml.pool_id = lap.id
        LEFT JOIN land_options lo ON cc.land_option_id = lo.id OR lap.land_option_id = lo.id
        WHERE sml.status = $1
      `;
      
      const params: any[] = [status];
      
      if (campaignId) {
        params.push(campaignId);
        query += ` AND sml.campaign_id = $${params.length}`;
      }
      
      if (poolId) {
        params.push(poolId);
        query += ` AND sml.pool_id = $${params.length}`;
      }
      
      query += ` ORDER BY sml.created_at DESC`;

      const result = await pool.query(query, params);

      res.status(200).json({
        success: true,
        data: {
          listings: result.rows.map((l: any) => ({
            id: l.id,
            sellerId: l.seller_id,
            sellerWallet: l.seller_wallet?.slice(0, 6) + '...' + l.seller_wallet?.slice(-4),
            campaignId: l.campaign_id,
            poolId: l.pool_id,
            tokenType: l.token_type,
            sharesForSale: l.shares_for_sale,
            pricePerShare: l.price_per_share,
            totalPrice: l.total_price,
            minPurchase: l.min_purchase,
            status: l.status,
            expiresAt: l.expires_at,
            campaignTitle: l.campaign_title,
            poolName: l.pool_name,
            location: l.location,
            acreage: l.acreage,
            createdAt: l.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Listings fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { campaignId, poolId, sharesForSale, pricePerShare, minPurchase, expiresInDays } = req.body;

    if (!sharesForSale || !pricePerShare) {
      return res.status(400).json({ error: 'Shares and price required' });
    }

    try {
      const userResult = await pool.query(
        `SELECT wallet_address FROM users WHERE id = $1`,
        [userId]
      );
      
      if (!userResult.rows[0]?.wallet_address) {
        return res.status(400).json({ error: 'Wallet not connected' });
      }

      const totalPrice = sharesForSale * pricePerShare;
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const result = await pool.query(`
        INSERT INTO secondary_market_listings 
        (seller_id, seller_wallet, campaign_id, pool_id, token_type, shares_for_sale, price_per_share, total_price, min_purchase, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        userId,
        userResult.rows[0].wallet_address,
        campaignId || null,
        poolId || null,
        campaignId ? 'crowdfunding' : 'pool',
        sharesForSale,
        pricePerShare,
        totalPrice,
        minPurchase || 1,
        expiresAt,
      ]);

      res.status(201).json({
        success: true,
        data: { listingId: result.rows[0].id },
      });
    } catch (error) {
      console.error('Listing create error:', error);
      res.status(500).json({ error: 'Failed to create listing' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
