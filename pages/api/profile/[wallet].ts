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

      const existingUser = await pool.query(
        `SELECT id FROM users WHERE LOWER(wallet_address) = $1 LIMIT 1`,
        [normalizedWallet]
      );

      let result;
      if (existingUser.rows.length === 0) {
        const crypto = require('crypto');
        const placeholderEmail = email || `${normalizedWallet}@wallet.axiom.city`;
        const randomPasswordHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
        
        result = await pool.query(
          `INSERT INTO users (
            wallet_address, email, password, first_name, last_name, username, 
            bio, purpose_statement, occupation, skills, location, website, 
            social_links, profile_image_url, phone, whatsapp,
            show_email, show_phone, show_whatsapp, created_at
          ) VALUES (
            LOWER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
          ) RETURNING id`,
          [
            normalizedWallet, placeholderEmail, randomPasswordHash,
            first_name, last_name, username, bio, purpose_statement,
            occupation, skills, location, website, social_links,
            profile_image_url, phone, whatsapp,
            show_email ?? true, show_phone ?? false, show_whatsapp ?? false
          ]
        );
      } else {
        result = await pool.query(
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
      }

      // Check if user created any SUSU groups but wasn't added as a member
      const userId = result.rows[0]?.id;
      if (userId) {
        // Find groups created by this user where they're not a member
        const orphanedGroups = await pool.query(
          `SELECT g.id FROM susu_purpose_groups g
           LEFT JOIN susu_group_members gm ON gm.group_id = g.id AND gm.user_id = $1
           WHERE g.created_by = $1 AND gm.id IS NULL`,
          [userId]
        );
        
        // Add user as organizer to any groups they created
        for (const group of orphanedGroups.rows) {
          await pool.query(
            `INSERT INTO susu_group_members (group_id, user_id, role, commitment_confirmed, joined_at)
             VALUES ($1, $2, 'organizer', true, NOW())
             ON CONFLICT DO NOTHING`,
            [group.id, userId]
          );
          // Update member count
          await pool.query(
            `UPDATE susu_purpose_groups SET member_count = member_count + 1 WHERE id = $1`,
            [group.id]
          );
        }
      }

      res.status(200).json({ success: true, message: 'Profile saved' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      res.status(500).json({ error: error.message || 'Failed to save profile' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
