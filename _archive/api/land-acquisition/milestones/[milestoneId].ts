import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { milestoneId } = req.query;
  const userId = req.headers['x-user-id'];

  if (req.method === 'PUT') {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { action, documents, notes } = req.body;

    try {
      const milestoneResult = await pool.query(
        `SELECT cm.*, cc.issuer_id FROM campaign_milestones cm 
         JOIN crowdfunding_campaigns cc ON cm.campaign_id = cc.id 
         WHERE cm.id = $1`,
        [milestoneId]
      );

      const milestone = milestoneResult.rows[0];
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      if (action === 'submit_documents') {
        const currentDocs = milestone.submitted_documents || [];
        const updatedDocs = [...currentDocs, ...(documents || [])];

        await pool.query(`
          UPDATE campaign_milestones 
          SET submitted_documents = $1, status = 'in_progress', updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(updatedDocs), milestoneId]);

        res.status(200).json({ success: true, message: 'Documents submitted' });
      } else if (action === 'complete') {
        await pool.query(`
          UPDATE campaign_milestones 
          SET status = 'completed', completed_at = NOW(), notes = $1, updated_at = NOW()
          WHERE id = $2
        `, [notes, milestoneId]);

        res.status(200).json({ success: true, message: 'Milestone completed' });
      } else if (action === 'verify') {
        await pool.query(`
          UPDATE campaign_milestones 
          SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
          WHERE id = $2
        `, [userId, milestoneId]);

        res.status(200).json({ success: true, message: 'Milestone verified' });
      } else if (action === 'release_funds') {
        await pool.query(`
          UPDATE campaign_milestones 
          SET funds_released_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [milestoneId]);

        const investorsResult = await pool.query(`
          SELECT DISTINCT investor_id FROM crowdfunding_investments 
          WHERE campaign_id = $1 AND status = 'confirmed'
        `, [milestone.campaign_id]);

        for (const investor of investorsResult.rows) {
          await pool.query(`
            INSERT INTO investor_notifications (user_id, campaign_id, type, title, message, action_url)
            VALUES ($1, $2, 'milestone_completed', 'Milestone Completed', $3, $4)
          `, [
            investor.investor_id,
            milestone.campaign_id,
            `"${milestone.title}" has been completed and $${milestone.release_amount} has been released.`,
            `/land-acquisition/campaigns/${milestone.campaign_id}`
          ]);
        }

        res.status(200).json({ success: true, message: 'Funds released' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Milestone update error:', error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
