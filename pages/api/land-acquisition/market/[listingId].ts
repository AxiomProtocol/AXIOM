import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { listingId } = req.query;
  const userId = req.headers['x-user-id'];

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          sml.*,
          u.wallet_address as seller_display,
          cc.title as campaign_title,
          cc.description as campaign_description,
          lap.name as pool_name,
          lo.location,
          lo.acreage,
          lo.featured_image
        FROM secondary_market_listings sml
        LEFT JOIN users u ON sml.seller_id = u.id
        LEFT JOIN crowdfunding_campaigns cc ON sml.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON sml.pool_id = lap.id
        LEFT JOIN land_options lo ON cc.land_option_id = lo.id OR lap.land_option_id = lo.id
        WHERE sml.id = $1
      `, [listingId]);

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Listing fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch listing' });
    }
  } else if (req.method === 'POST') {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { action, sharesToBuy } = req.body;

    try {
      const listingResult = await pool.query(
        `SELECT * FROM secondary_market_listings WHERE id = $1`,
        [listingId]
      );

      const listing = listingResult.rows[0];
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      if (action === 'buy') {
        if (listing.status !== 'active') {
          return res.status(400).json({ error: 'Listing not available' });
        }

        if (listing.seller_id === parseInt(userId as string)) {
          return res.status(400).json({ error: 'Cannot buy your own listing' });
        }

        const buyerResult = await pool.query(
          `SELECT wallet_address FROM users WHERE id = $1`,
          [userId]
        );

        const shares = sharesToBuy || listing.shares_for_sale;
        const totalCost = shares * parseFloat(listing.price_per_share);
        const platformFee = totalCost * 0.025;

        await pool.query(`
          UPDATE secondary_market_listings 
          SET status = 'sold', buyer_id = $1, buyer_wallet = $2, sold_at = NOW(), platform_fee = $3
          WHERE id = $4
        `, [userId, buyerResult.rows[0]?.wallet_address, platformFee, listingId]);

        await pool.query(`
          INSERT INTO investor_notifications (user_id, type, title, message, action_url)
          VALUES ($1, 'market_activity', 'Your shares have been sold!', $2, $3)
        `, [
          listing.seller_id,
          `Your listing of ${listing.shares_for_sale} shares has been purchased for $${totalCost.toFixed(2)}`,
          `/land-acquisition/portfolio`
        ]);

        res.status(200).json({
          success: true,
          message: 'Purchase successful',
          data: { shares, totalCost, platformFee },
        });
      } else if (action === 'cancel') {
        if (listing.seller_id !== parseInt(userId as string)) {
          return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query(`
          UPDATE secondary_market_listings SET status = 'cancelled' WHERE id = $1
        `, [listingId]);

        res.status(200).json({ success: true, message: 'Listing cancelled' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Listing action error:', error);
      res.status(500).json({ error: 'Failed to process action' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
