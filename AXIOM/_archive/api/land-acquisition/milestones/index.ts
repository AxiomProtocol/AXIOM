import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    try {
      const result = await pool.query(`
        SELECT 
          cm.*,
          u.wallet_address as verified_by_name
        FROM campaign_milestones cm
        LEFT JOIN users u ON cm.verified_by = u.id
        WHERE cm.campaign_id = $1
        ORDER BY cm.sequence_order ASC
      `, [campaignId]);

      res.status(200).json({
        success: true,
        data: {
          milestones: result.rows.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            releasePercentage: m.release_percentage,
            releaseAmount: m.release_amount,
            sequenceOrder: m.sequence_order,
            status: m.status,
            requiredDocuments: m.required_documents || [],
            submittedDocuments: m.submitted_documents || [],
            verifiedBy: m.verified_by_name,
            verifiedAt: m.verified_at,
            completedAt: m.completed_at,
            fundsReleasedAt: m.funds_released_at,
            notes: m.notes,
          })),
        },
      });
    } catch (error) {
      console.error('Milestones fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  } else if (req.method === 'POST') {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { campaignId, title, description, releasePercentage, sequenceOrder, requiredDocuments } = req.body;

    if (!campaignId || !title || !releasePercentage) {
      return res.status(400).json({ error: 'Campaign ID, title, and release percentage required' });
    }

    try {
      const campaignResult = await pool.query(
        `SELECT target_amount FROM crowdfunding_campaigns WHERE id = $1`,
        [campaignId]
      );
      
      const targetAmount = parseFloat(campaignResult.rows[0]?.target_amount || 0);
      const releaseAmount = (targetAmount * releasePercentage) / 100;

      const result = await pool.query(`
        INSERT INTO campaign_milestones 
        (campaign_id, title, description, release_percentage, release_amount, sequence_order, required_documents)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [campaignId, title, description, releasePercentage, releaseAmount, sequenceOrder || 1, JSON.stringify(requiredDocuments || [])]);

      res.status(201).json({
        success: true,
        data: { milestoneId: result.rows[0].id },
      });
    } catch (error) {
      console.error('Milestone create error:', error);
      res.status(500).json({ error: 'Failed to create milestone' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
