import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const normalizedWallet = wallet.toLowerCase();

  if (req.method === 'GET') {
    try {
      const { viewer } = req.query;
      const isOwner = viewer && typeof viewer === 'string' && viewer.toLowerCase() === normalizedWallet;

      const result = await pool.query(
        `SELECT 
          id, first_name, last_name, username, bio, purpose_statement,
          occupation, skills, location, website, social_links,
          profile_image_url, wallet_address,
          email, phone, whatsapp,
          show_email, show_phone, show_whatsapp,
          created_at
        FROM users 
        WHERE LOWER(wallet_address) = $1 
        LIMIT 1`,
        [normalizedWallet]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = result.rows[0];
      
      if (!isOwner) {
        if (!profile.show_email) profile.email = null;
        if (!profile.show_phone) profile.phone = null;
        if (!profile.show_whatsapp) profile.whatsapp = null;
      }

      res.status(200).json({ success: true, profile, isOwner });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch profile' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        first_name, last_name, username, bio, purpose_statement,
        occupation, skills, location, website, social_links,
        profile_image_url, email, phone, whatsapp,
        show_email, show_phone, show_whatsapp
      } = req.body;

      const result = await pool.query(
        `UPDATE users SET
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          username = COALESCE($4, username),
          bio = COALESCE($5, bio),
          purpose_statement = COALESCE($6, purpose_statement),
          occupation = COALESCE($7, occupation),
          skills = COALESCE($8, skills),
          location = COALESCE($9, location),
          website = COALESCE($10, website),
          social_links = COALESCE($11, social_links),
          profile_image_url = COALESCE($12, profile_image_url),
          phone = COALESCE($13, phone),
          whatsapp = COALESCE($14, whatsapp),
          show_email = COALESCE($15, show_email),
          show_phone = COALESCE($16, show_phone),
          show_whatsapp = COALESCE($17, show_whatsapp),
          updated_at = NOW()
        WHERE LOWER(wallet_address) = $1
        RETURNING id`,
        [
          normalizedWallet, first_name, last_name, username, bio, purpose_statement,
          occupation, skills, location, website, social_links,
          profile_image_url, phone, whatsapp,
          show_email, show_phone, show_whatsapp
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ success: true, message: 'Profile updated' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
