import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { isAdminWallet } from '../../../../lib/admin/config';

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
    return handleGetNote(noteId, res);
  } else if (req.method === 'PUT') {
    return handleUpdateNote(noteId, req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetNote(noteId: number, res: NextApiResponse) {
  try {
    const noteQuery = `
      SELECT * FROM private_credit_notes WHERE id = $1
    `;
    const noteResult = await pool.query(noteQuery, [noteId]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const paymentsQuery = `
      SELECT * FROM note_payment_events 
      WHERE note_id = $1 
      ORDER BY event_date DESC
    `;
    const paymentsResult = await pool.query(paymentsQuery, [noteId]);
    
    const covenantsQuery = `
      SELECT * FROM note_covenants 
      WHERE note_id = $1 
      ORDER BY created_at DESC
    `;
    const covenantsResult = await pool.query(covenantsQuery, [noteId]);
    
    const documentsQuery = `
      SELECT * FROM note_documents 
      WHERE note_id = $1 
      ORDER BY created_at DESC
    `;
    const documentsResult = await pool.query(documentsQuery, [noteId]);
    
    return res.status(200).json({
      note: noteResult.rows[0],
      payments: paymentsResult.rows,
      covenants: covenantsResult.rows,
      documents: documentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return res.status(500).json({ error: 'Failed to fetch note' });
  }
}

async function handleUpdateNote(noteId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      status,
      principal,
      interestRate,
      termMonths,
      paymentFrequency,
      borrowerEntityName,
      collateralType,
      collateralDescription,
      collateralValue,
      ltvRatio,
      originationDate,
      maturityDate,
      firstPaymentDate,
      outstandingPrincipal,
      accruedInterest,
    } = req.body;
    
    const existingQuery = `SELECT * FROM private_credit_notes WHERE id = $1`;
    const existingResult = await pool.query(existingQuery, [noteId]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const fields = {
      status, principal, interest_rate: interestRate, term_months: termMonths,
      payment_frequency: paymentFrequency, borrower_entity_name: borrowerEntityName,
      collateral_type: collateralType, collateral_description: collateralDescription,
      collateral_value: collateralValue, ltv_ratio: ltvRatio,
      origination_date: originationDate, maturity_date: maturityDate,
      first_payment_date: firstPaymentDate, outstanding_principal: outstandingPrincipal,
      accrued_interest: accruedInterest,
    };
    
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(noteId);
    
    const query = `
      UPDATE private_credit_notes 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    return res.status(200).json({ 
      success: true, 
      note: result.rows[0],
      message: 'Note updated successfully'
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
}
