import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { isAdminWallet } from '../../../../lib/admin/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string | undefined;
  if (!isAdminWallet(adminWallet)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  if (req.method === 'GET') {
    return handleGetNotes(req, res);
  } else if (req.method === 'POST') {
    return handleCreateNote(req, res, adminWallet!);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetNotes(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, limit = '50', offset = '0' } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (status && status !== 'all') {
      params.push(status);
      whereClause = `WHERE status = $${params.length}`;
    }
    
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    
    const countQuery = `SELECT COUNT(*) FROM private_credit_notes ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    params.push(limitNum, offsetNum);
    const query = `
      SELECT 
        id, note_number, principal, interest_rate, term_months, payment_frequency,
        issuer, borrower_entity_name, is_self_funded,
        collateral_type, collateral_value, ltv_ratio,
        origination_date, maturity_date, first_payment_date,
        status, outstanding_principal, accrued_interest, total_payments_received,
        created_at, updated_at
      FROM private_credit_notes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const result = await pool.query(query, params);
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_notes,
        COUNT(*) FILTER (WHERE status = 'active') as active_notes,
        COUNT(*) FILTER (WHERE status = 'current') as current_notes,
        COUNT(*) FILTER (WHERE status = 'delinquent') as delinquent_notes,
        COUNT(*) FILTER (WHERE status = 'paid_off') as paid_off_notes,
        COALESCE(SUM(outstanding_principal), 0) as total_outstanding,
        COALESCE(SUM(total_payments_received), 0) as total_payments
      FROM private_credit_notes
    `;
    const summaryResult = await pool.query(summaryQuery);
    
    return res.status(200).json({
      notes: result.rows,
      summary: {
        totalNotes: parseInt(summaryResult.rows[0].total_notes, 10),
        activeNotes: parseInt(summaryResult.rows[0].active_notes, 10),
        currentNotes: parseInt(summaryResult.rows[0].current_notes, 10),
        delinquentNotes: parseInt(summaryResult.rows[0].delinquent_notes, 10),
        paidOffNotes: parseInt(summaryResult.rows[0].paid_off_notes, 10),
        totalOutstanding: parseFloat(summaryResult.rows[0].total_outstanding),
        totalPayments: parseFloat(summaryResult.rows[0].total_payments),
      },
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: totalCount,
        hasMore: offsetNum + result.rows.length < totalCount,
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
}

async function handleCreateNote(req: NextApiRequest, res: NextApiResponse, adminWallet: string) {
  try {
    const {
      noteNumber,
      principal,
      interestRate,
      termMonths,
      paymentFrequency = 'monthly',
      issuer = 'Axiom Protocol Treasury',
      borrowerEntityName,
      collateralType,
      collateralDescription,
      collateralValue,
      ltvRatio,
      originationDate,
      maturityDate,
      firstPaymentDate,
    } = req.body;
    
    if (!noteNumber || !principal || !interestRate || !termMonths) {
      return res.status(400).json({ 
        error: 'Missing required fields: noteNumber, principal, interestRate, termMonths' 
      });
    }
    
    const query = `
      INSERT INTO private_credit_notes (
        note_number, principal, interest_rate, term_months, payment_frequency,
        issuer, borrower_entity_name, is_self_funded,
        collateral_type, collateral_description, collateral_value, ltv_ratio,
        origination_date, maturity_date, first_payment_date,
        status, outstanding_principal, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, 'draft', $2, 1
      ) RETURNING *
    `;
    
    const result = await pool.query(query, [
      noteNumber, principal, interestRate, termMonths, paymentFrequency,
      issuer, borrowerEntityName,
      collateralType, collateralDescription, collateralValue, ltvRatio,
      originationDate || null, maturityDate || null, firstPaymentDate || null,
    ]);
    
    return res.status(201).json({ 
      success: true, 
      note: result.rows[0],
      message: 'Note created successfully'
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Note number already exists' });
    }
    return res.status(500).json({ error: 'Failed to create note' });
  }
}
