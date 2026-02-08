import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address or username' });
  }

  const isWalletAddress = wallet.startsWith('0x') && wallet.length === 42;
  const lookupValue = isWalletAddress ? wallet.toLowerCase() : wallet.toLowerCase();

  if (req.method === 'GET') {
    try {
      const { viewer } = req.query;
      
      const whereClause = isWalletAddress 
        ? 'LOWER(wallet_address) = $1'
        : 'LOWER(username) = $1';

      const result = await pool.query(
        `SELECT 
          id, first_name, last_name, username, headline, bio, purpose_statement,
          occupation, skills, location, website, social_links,
          profile_image_url, banner_image_url, wallet_address,
          email, phone, whatsapp,
          show_email, show_phone, show_whatsapp,
          member_tier, member_since, total_groups_joined, total_savings_contributions,
          courses_completed, referral_code, profile_visibility,
          created_at
        FROM users 
        WHERE ${whereClause}
        LIMIT 1`,
        [lookupValue]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const profile = result.rows[0];
      const isOwner = viewer && typeof viewer === 'string' && 
        viewer.toLowerCase() === profile.wallet_address?.toLowerCase();
      
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
    const normalizedWallet = wallet.toLowerCase();
    
    try {
      const {
        first_name, last_name, username, headline, bio, purpose_statement,
        occupation, skills, location, website, social_links,
        profile_image_url, banner_image_url, email, phone, whatsapp,
        show_email, show_phone, show_whatsapp, profile_visibility
      } = req.body;

      if (username) {
        const usernameCheck = await pool.query(
          `SELECT id FROM users WHERE LOWER(username) = $1 AND LOWER(wallet_address) != $2 LIMIT 1`,
          [username.toLowerCase(), normalizedWallet]
        );
        if (usernameCheck.rows.length > 0) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      const existingUser = await pool.query(
        `SELECT id FROM users WHERE LOWER(wallet_address) = $1 LIMIT 1`,
        [normalizedWallet]
      );

      const generateReferralCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      };

      let result;
      if (existingUser.rows.length === 0) {
        const crypto = require('crypto');
        const placeholderEmail = email || `${normalizedWallet}@wallet.axiom.city`;
        const randomPasswordHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
        const referralCode = generateReferralCode();
        
        result = await pool.query(
          `INSERT INTO users (
            wallet_address, email, password, first_name, last_name, username, 
            headline, bio, purpose_statement, occupation, skills, location, website, 
            social_links, profile_image_url, banner_image_url, phone, whatsapp,
            show_email, show_phone, show_whatsapp, referral_code, member_since, created_at
          ) VALUES (
            LOWER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
          ) RETURNING id`,
          [
            normalizedWallet, placeholderEmail, randomPasswordHash,
            first_name, last_name, username, headline, bio, purpose_statement,
            occupation, skills, location, website, social_links,
            profile_image_url, banner_image_url, phone, whatsapp,
            show_email ?? true, show_phone ?? false, show_whatsapp ?? false, referralCode
          ]
        );
      } else {
        result = await pool.query(
          `UPDATE users SET
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            username = COALESCE($4, username),
            headline = COALESCE($5, headline),
            bio = COALESCE($6, bio),
            purpose_statement = COALESCE($7, purpose_statement),
            occupation = COALESCE($8, occupation),
            skills = COALESCE($9, skills),
            location = COALESCE($10, location),
            website = COALESCE($11, website),
            social_links = COALESCE($12, social_links),
            profile_image_url = COALESCE($13, profile_image_url),
            banner_image_url = COALESCE($14, banner_image_url),
            phone = COALESCE($15, phone),
            whatsapp = COALESCE($16, whatsapp),
            show_email = COALESCE($17, show_email),
            show_phone = COALESCE($18, show_phone),
            show_whatsapp = COALESCE($19, show_whatsapp),
            profile_visibility = COALESCE($20, profile_visibility),
            updated_at = NOW()
          WHERE LOWER(wallet_address) = $1
          RETURNING id`,
          [
            normalizedWallet, first_name, last_name, username, headline, bio, purpose_statement,
            occupation, skills, location, website, social_links,
            profile_image_url, banner_image_url, phone, whatsapp,
            show_email, show_phone, show_whatsapp, profile_visibility
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
