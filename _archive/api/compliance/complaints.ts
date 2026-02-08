import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

function generateTicketNumber(): string {
  const prefix = 'AXM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { category, subject, description, email, walletAddress, claimId } = req.body;
      
      if (!category || !subject || !description) {
        return res.status(400).json({ error: 'Category, subject, and description are required' });
      }
      
      if (!email && !walletAddress) {
        return res.status(400).json({ error: 'Either email or wallet address is required' });
      }
      
      const ticketNumber = generateTicketNumber();
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;
      
      const insertQuery = `
        INSERT INTO compliance_complaints 
        (ticket_number, category, subject, description, claim_id, submitter_email, submitter_wallet, status, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', 'normal')
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [
        ticketNumber, category, subject, description, 
        claimId || null, email || null, walletAddress || null
      ]);
      
      const complaint = result.rows[0];
      
      await pool.query(`
        INSERT INTO compliance_complaint_updates 
        (complaint_id, update_type, message, is_public, created_by)
        VALUES ($1, 'status_change', 'Complaint submitted successfully. Our team will review it shortly.', true, 'system')
      `, [complaint.id]);
      
      await pool.query(`
        INSERT INTO compliance_events 
        (event_type, entity_type, entity_id, description, metadata, ip_address)
        VALUES ('complaint_submitted', 'complaint', $1, $2, $3, $4)
      `, [complaint.id, `New complaint submitted: ${subject}`, JSON.stringify({ category, ticketNumber }), ipAddress]);
      
      return res.status(201).json({ 
        success: true,
        ticketNumber,
        message: 'Your complaint has been submitted. You will receive updates via the provided contact method.'
      });
    } catch (error) {
      console.error('Error submitting complaint:', error);
      return res.status(500).json({ error: 'Failed to submit complaint' });
    }
  }
  
  if (req.method === 'GET') {
    try {
      const { ticketNumber, email, walletAddress } = req.query;
      
      if (!ticketNumber && !email && !walletAddress) {
        return res.status(400).json({ error: 'Ticket number, email, or wallet address is required to lookup complaints' });
      }
      
      let complaint;
      
      if (ticketNumber && typeof ticketNumber === 'string') {
        const result = await pool.query(
          'SELECT * FROM compliance_complaints WHERE ticket_number = $1',
          [ticketNumber]
        );
        complaint = result.rows[0];
      } else if (email && typeof email === 'string') {
        const result = await pool.query(
          'SELECT * FROM compliance_complaints WHERE submitter_email = $1 ORDER BY created_at DESC LIMIT 1',
          [email]
        );
        complaint = result.rows[0];
      } else if (walletAddress && typeof walletAddress === 'string') {
        const result = await pool.query(
          'SELECT * FROM compliance_complaints WHERE submitter_wallet = $1 ORDER BY created_at DESC LIMIT 1',
          [walletAddress]
        );
        complaint = result.rows[0];
      }
      
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      
      const updatesResult = await pool.query(
        'SELECT * FROM compliance_complaint_updates WHERE complaint_id = $1 AND is_public = true ORDER BY created_at DESC',
        [complaint.id]
      );
      
      return res.status(200).json({ 
        complaint: {
          ticketNumber: complaint.ticket_number,
          category: complaint.category,
          subject: complaint.subject,
          status: complaint.status,
          createdAt: complaint.created_at,
          resolvedAt: complaint.resolved_at,
          resolution: complaint.resolution,
        },
        updates: updatesResult.rows
      });
    } catch (error) {
      console.error('Error fetching complaint:', error);
      return res.status(500).json({ error: 'Failed to fetch complaint' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
