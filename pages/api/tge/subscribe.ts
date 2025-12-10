import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

const RESTRICTED_COUNTRIES = [
  'North Korea', 'Iran', 'Syria', 'Cuba', 'Russia', 'Belarus', 'Myanmar', 'Venezuela'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, walletAddress, country, investmentInterest } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!country) {
      return res.status(400).json({ error: 'Country is required' });
    }

    if (RESTRICTED_COUNTRIES.includes(country)) {
      return res.status(400).json({ error: 'Unfortunately, residents of your country are not eligible to participate in this token sale due to regulatory restrictions.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedWallet = walletAddress ? walletAddress.toLowerCase().trim() : null;

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || null;

    const client = await pool.connect();
    try {
      const existingResult = await client.query(
        'SELECT id, unsubscribed FROM tge_notifications WHERE email = $1',
        [normalizedEmail]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        
        if (existing.unsubscribed) {
          await client.query(
            `UPDATE tge_notifications 
             SET unsubscribed = false, unsubscribed_at = NULL, 
                 wallet_address = COALESCE($2, wallet_address),
                 country = COALESCE($3, country),
                 investment_interest = COALESCE($4, investment_interest)
             WHERE id = $1`,
            [existing.id, normalizedWallet, country, investmentInterest]
          );
          return res.status(200).json({ 
            success: true, 
            message: 'Welcome back! You have been re-subscribed to TGE notifications.' 
          });
        }
        
        await client.query(
          `UPDATE tge_notifications 
           SET wallet_address = COALESCE($2, wallet_address),
               country = COALESCE($3, country),
               investment_interest = COALESCE($4, investment_interest)
           WHERE id = $1`,
          [existing.id, normalizedWallet, country, investmentInterest]
        );
        
        return res.status(200).json({ 
          success: true, 
          message: 'Your information has been updated!' 
        });
      }

      await client.query(
        `INSERT INTO tge_notifications (email, wallet_address, country, investment_interest, source, ip_address, user_agent, referrer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [normalizedEmail, normalizedWallet, country, investmentInterest, 'launchpad', ipAddress, userAgent, referrer]
      );

      res.status(201).json({ 
        success: true, 
        message: 'You have been subscribed to TGE notifications!' 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error subscribing to TGE notifications:', error);
    
    if (error.code === '23505') {
      return res.status(200).json({ 
        success: true, 
        message: 'You are already subscribed to TGE notifications!' 
      });
    }
    
    res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
}
