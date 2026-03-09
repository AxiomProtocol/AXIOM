import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT p.*, ip.legal_name, ip.entity_name, ip.email, ip.wallet_address, ip.accreditation_status
         FROM syn_pipeline p
         LEFT JOIN syn_investor_profiles ip ON p.investor_profile_id = ip.id
         WHERE p.offering_id = $1
         ORDER BY p.updated_at DESC`,
        [id]
      );

      const stageCounts: Record<string, number> = {};
      let totalSoftCircle = 0;
      let totalCommitted = 0;
      for (const row of result.rows) {
        stageCounts[row.stage] = (stageCounts[row.stage] || 0) + 1;
        totalSoftCircle += parseFloat(row.soft_circle_amount || '0');
        totalCommitted += parseFloat(row.committed_amount || '0');
      }

      return res.status(200).json({
        success: true,
        pipeline: result.rows,
        summary: { stageCounts, totalSoftCircle, totalCommitted, total: result.rows.length },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { investorProfileId, stage, softCircleAmount, notes, assignedRep } = req.body;
      if (!investorProfileId) {
        return res.status(400).json({ success: false, error: 'investorProfileId is required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_pipeline (offering_id, investor_profile_id, stage, soft_circle_amount, notes, assigned_rep)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [id, investorProfileId, stage || 'lead', softCircleAmount || null, notes || null, assignedRep || null]
      );

      return res.status(201).json({ success: true, pipelineId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { pipelineId, stage, softCircleAmount, committedAmount, notes, assignedRep } = req.body;
      if (!pipelineId) {
        return res.status(400).json({ success: false, error: 'pipelineId is required' });
      }

      await pool.query(
        `UPDATE syn_pipeline SET
          stage = COALESCE($1, stage),
          soft_circle_amount = COALESCE($2, soft_circle_amount),
          committed_amount = COALESCE($3, committed_amount),
          notes = COALESCE($4, notes),
          assigned_rep = COALESCE($5, assigned_rep),
          updated_at = now()
         WHERE id = $6 AND offering_id = $7`,
        [stage, softCircleAmount, committedAmount, notes, assignedRep, pipelineId, id]
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
