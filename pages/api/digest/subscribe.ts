import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { weeklyDigestSubscriptions } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { wallet, email } = req.body;
      
      if (!wallet || !email) {
        return res.status(400).json({ error: 'Wallet and email required' });
      }

      const walletLower = wallet.toLowerCase();

      const existing = await db.select()
        .from(weeklyDigestSubscriptions)
        .where(eq(weeklyDigestSubscriptions.walletAddress, walletLower))
        .limit(1);

      if (existing.length > 0) {
        await db.update(weeklyDigestSubscriptions)
          .set({ email, subscribed: true })
          .where(eq(weeklyDigestSubscriptions.walletAddress, walletLower));
      } else {
        await db.insert(weeklyDigestSubscriptions).values({
          walletAddress: walletLower,
          email,
          subscribed: true,
          preferences: { burns: true, rewards: true, insurance: true, circles: true, nodes: true }
        });
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

      await db.update(weeklyDigestSubscriptions)
        .set({ subscribed: false })
        .where(eq(weeklyDigestSubscriptions.walletAddress, wallet.toLowerCase()));

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

      const subscription = await db.select()
        .from(weeklyDigestSubscriptions)
        .where(eq(weeklyDigestSubscriptions.walletAddress, wallet.toLowerCase()))
        .limit(1);

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
        isSubscribed: subscription.length > 0 && subscription[0].subscribed,
        email: subscription[0]?.email || '',
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
