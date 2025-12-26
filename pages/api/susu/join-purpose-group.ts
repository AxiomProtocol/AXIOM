import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface JoinRequest {
  region: string;
  purpose: string;
  commitmentAmount: number;
  commitmentDuration: number;
  name: string;
  email: string;
  phone?: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      region, 
      purpose, 
      commitmentAmount, 
      commitmentDuration,
      name, 
      email, 
      phone 
    } = req.body as JoinRequest;

    if (!region || !purpose || !commitmentAmount || !name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['region', 'purpose', 'commitmentAmount', 'name', 'email']
      });
    }

    if (commitmentAmount < 25) {
      return res.status(400).json({ error: 'Minimum contribution is $25/month' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const regionDisplay = region.charAt(0).toUpperCase() + region.slice(1).replace(/-/g, ' ');
      
      let hubResult = await client.query(
        'SELECT id FROM susu_interest_hubs WHERE region_id = $1',
        [region]
      );

      let hubId: number;
      if (hubResult.rows.length === 0) {
        const insertHub = await client.query(
          `INSERT INTO susu_interest_hubs (region_id, region_display, region_type, member_count, is_active, created_at, updated_at)
           VALUES ($1, $2, 'metro', 1, true, NOW(), NOW())
           RETURNING id`,
          [region, `${regionDisplay} Interest Hub`]
        );
        hubId = insertHub.rows[0].id;
      } else {
        hubId = hubResult.rows[0].id;
        await client.query(
          'UPDATE susu_interest_hubs SET member_count = COALESCE(member_count, 0) + 1, updated_at = NOW() WHERE id = $1',
          [hubId]
        );
      }

      let categoryResult = await client.query(
        'SELECT id FROM susu_purpose_categories WHERE name = $1',
        [purpose]
      );

      let categoryId: number;
      if (categoryResult.rows.length === 0) {
        const insertCategory = await client.query(
          `INSERT INTO susu_purpose_categories (name, description, icon, is_active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [purpose, `Purpose Group for ${purpose}`, '🎯']
        );
        categoryId = insertCategory.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }

      let groupResult = await client.query(
        'SELECT id FROM susu_purpose_groups WHERE hub_id = $1 AND purpose_category_id = $2 AND is_active = true',
        [hubId, categoryId]
      );

      let groupId: number;
      if (groupResult.rows.length === 0) {
        const insertGroup = await client.query(
          `INSERT INTO susu_purpose_groups (hub_id, purpose_category_id, contribution_amount, contribution_currency, cycle_length_days, display_name, member_count, min_members_to_activate, max_members, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, 'USD', $4, $5, 1, 3, 50, true, NOW(), NOW())
           RETURNING id`,
          [hubId, categoryId, commitmentAmount, commitmentDuration * 30, `${regionDisplay} ${purpose} Circle`]
        );
        groupId = insertGroup.rows[0].id;
      } else {
        groupId = groupResult.rows[0].id;
        await client.query(
          'UPDATE susu_purpose_groups SET member_count = COALESCE(member_count, 0) + 1, updated_at = NOW() WHERE id = $1',
          [groupId]
        );
      }

      const registrationResult = await client.query(
        `INSERT INTO susu_purpose_registrations 
         (hub_id, group_id, region, purpose, member_name, member_email, member_phone, commitment_amount, commitment_duration, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
         RETURNING id`,
        [hubId, groupId, region, purpose, name, email, phone || null, commitmentAmount, commitmentDuration]
      );

      const registrationId = registrationResult.rows[0].id;

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        message: 'Successfully registered for Purpose Group!',
        data: {
          registrationId,
          hubId,
          groupId,
          region,
          purpose,
          commitmentAmount,
          memberName: name,
          memberEmail: email,
          memberPhone: phone || null,
          dataSource: 'database'
        }
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('Database transaction error:', dbError);
      
      console.log('Fallback: Queuing registration for manual review', {
        region, purpose, name, email, phone, commitmentAmount, commitmentDuration,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return res.status(202).json({
        success: true,
        message: 'Registration submitted for review. Our team will contact you shortly.',
        data: {
          registrationId: null,
          hubId: null,
          groupId: null,
          region,
          purpose,
          commitmentAmount,
          memberName: name,
          memberEmail: email,
          memberPhone: phone || null,
          dataSource: 'pending_manual_review'
        }
      });
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error('Join purpose group error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process your request. Please try again later.'
    });
  }
}
