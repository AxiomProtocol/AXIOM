import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { isAdminWallet } from '../../../../../lib/admin/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;
  if (!isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { id } = req.query;
  const noteId = parseInt(id as string, 10);
  
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  if (req.method === 'GET') {
    return handleGetPayments(noteId, res);
  } else if (req.method === 'POST') {
    return handleAddPayment(noteId, req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetPayments(noteId: number, res: NextApiResponse) {
  try {
    const noteCheck = await pool.query('SELECT id FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const query = `
      SELECT * FROM note_payment_events 
      WHERE note_id = $1 
      ORDER BY event_date DESC
    `;
    const result = await pool.query(query, [noteId]);
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(principal_portion), 0) as total_principal,
        COALESCE(SUM(interest_portion), 0) as total_interest,
        COALESCE(SUM(late_fee), 0) as total_late_fees
      FROM note_payment_events
      WHERE note_id = $1
    `;
    const summaryResult = await pool.query(summaryQuery, [noteId]);
    
    return res.status(200).json({
      payments: result.rows,
      summary: {
        totalPayments: parseInt(summaryResult.rows[0].total_payments, 10),
        totalAmount: parseFloat(summaryResult.rows[0].total_amount),
        totalPrincipal: parseFloat(summaryResult.rows[0].total_principal),
        totalInterest: parseFloat(summaryResult.rows[0].total_interest),
        totalLateFees: parseFloat(summaryResult.rows[0].total_late_fees),
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
}

async function handleAddPayment(noteId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      eventDate,
      eventType,
      amount,
      principalPortion = 0,
      interestPortion = 0,
      lateFee = 0,
      reference,
      notes,
    } = req.body;
    
    if (!eventDate || !eventType || amount === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventDate, eventType, amount' 
      });
    }
    
    const validEventTypes = ['scheduled_payment', 'principal', 'interest', 'prepayment', 'late_fee', 'adjustment'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}` });
    }
    
    const noteQuery = await pool.query('SELECT outstanding_principal FROM private_credit_notes WHERE id = $1', [noteId]);
    if (noteQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const currentBalance = parseFloat(noteQuery.rows[0].outstanding_principal) || 0;
    const balanceAfter = currentBalance - parseFloat(principalPortion);
    
    const insertQuery = `
      INSERT INTO note_payment_events (
        note_id, event_date, event_type, amount,
        principal_portion, interest_portion, late_fee,
        balance_after, reference, notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      noteId, eventDate, eventType, amount,
      principalPortion, interestPortion, lateFee,
      balanceAfter, reference, notes,
    ]);
    
    await pool.query(`
      UPDATE private_credit_notes 
      SET outstanding_principal = $1,
          total_payments_received = COALESCE(total_payments_received, 0) + $2,
          updated_at = NOW()
      WHERE id = $3
    `, [balanceAfter, amount, noteId]);
    
    return res.status(201).json({ 
      success: true, 
      payment: result.rows[0],
      balanceAfter,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    return res.status(500).json({ error: 'Failed to add payment' });
  }
}
