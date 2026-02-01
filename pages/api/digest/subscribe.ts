import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { wallet, email } = req.body;
      
      if (!wallet || !email) {
        return res.status(400).json({ error: 'Wallet and email required' });
      }

      const walletLower = wallet.toLowerCase();

      const existingResult = await pool.query(
        `SELECT id FROM weekly_digest_subscriptions WHERE wallet_address = $1`,
        [walletLower]
      );

      if (existingResult.rows.length > 0) {
        await pool.query(
          `UPDATE weekly_digest_subscriptions SET email = $1, subscribed = true WHERE wallet_address = $2`,
          [email, walletLower]
        );
      } else {
        await pool.query(
          `INSERT INTO weekly_digest_subscriptions (wallet_address, email, subscribed, preferences)
           VALUES ($1, $2, true, $3)`,
          [walletLower, email, JSON.stringify({ burns: true, rewards: true, insurance: true, circles: true, nodes: true })]
        );
      }

      return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Subscription error:', error);
      return res.status(500).json({ success: false, error: 'Failed to subscribe' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { wallet } = req.body;
      
      if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
      }

      await pool.query(
        `UPDATE weekly_digest_subscriptions SET subscribed = false WHERE wallet_address = $1`,
        [wallet.toLowerCase()]
      );

      return res.status(200).json({ success: true, message: 'Unsubscribed successfully' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { wallet } = req.query;
      
      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const result = await pool.query(
        `SELECT email, subscribed FROM weekly_digest_subscriptions WHERE wallet_address = $1`,
        [wallet.toLowerCase()]
      );

      const latestDigest = {
        axmBurned: 125000,
        veAxmRewards: 45000,
        insuranceFundGrowth: 8500,
        newSusuCircles: 12,
        newNodeOperators: 28,
        totalTransactions: 4567,
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        isSubscribed: result.rows.length > 0 && result.rows[0].subscribed,
        email: result.rows[0]?.email || '',
        latestDigest
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      return res.status(200).json({
        success: true,
        isSubscribed: false,
        email: '',
        latestDigest: null
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
