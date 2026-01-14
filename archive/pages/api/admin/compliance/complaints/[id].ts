import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../../lib/adminAuth';
import { pool } from '../../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Complaint ID required' });
  }
  
  const complaintId = parseInt(id);
  if (isNaN(complaintId)) {
    return res.status(400).json({ error: 'Invalid complaint ID' });
  }
  
  if (req.method === 'GET') {
    try {
      const complaintResult = await pool.query(
        `SELECT * FROM compliance_complaints WHERE id = $1`,
        [complaintId]
      );
      
      if (complaintResult.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      
      const updatesResult = await pool.query(
        `SELECT * FROM compliance_complaint_updates 
         WHERE complaint_id = $1 
         ORDER BY created_at DESC`,
        [complaintId]
      );
      
      return res.status(200).json({ 
        complaint: complaintResult.rows[0],
        updates: updatesResult.rows
      });
    } catch (error) {
      console.error('Error fetching complaint:', error);
      return res.status(500).json({ error: 'Failed to fetch complaint' });
    }
  }
  
  if (req.method === 'PUT') {
    try {
      const { status, notes, resolution, priority } = req.body;
      
      const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority value' });
      }
      
      const currentResult = await pool.query(
        `SELECT * FROM compliance_complaints WHERE id = $1`,
        [complaintId]
      );
      
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      
      const current = currentResult.rows[0];
      
      const updateResult = await pool.query(
        `UPDATE compliance_complaints 
         SET status = COALESCE($1, status),
             resolution = COALESCE($2, resolution),
             priority = COALESCE($3, priority),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status || null, resolution || null, priority || null, complaintId]
      );
      
      if (status && status !== current.status) {
        await pool.query(
          `INSERT INTO compliance_complaint_updates 
           (complaint_id, status, notes, updated_by)
           VALUES ($1, $2, $3, $4)`,
          [complaintId, status, notes || null, 'admin']
        );
        
        await pool.query(
          `INSERT INTO compliance_events 
           (event_type, entity_type, entity_id, wallet_address, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            'complaint_status_updated',
            'complaint',
            complaintId.toString(),
            current.complainant_wallet,
            JSON.stringify({ oldStatus: current.status, newStatus: status, notes })
          ]
        );
      } else if (notes) {
        await pool.query(
          `INSERT INTO compliance_complaint_updates 
           (complaint_id, status, notes, updated_by)
           VALUES ($1, $2, $3, $4)`,
          [complaintId, current.status, notes, 'admin']
        );
      }
      
      return res.status(200).json({ 
        success: true, 
        complaint: updateResult.rows[0] 
      });
    } catch (error) {
      console.error('Error updating complaint:', error);
      return res.status(500).json({ error: 'Failed to update complaint' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);
