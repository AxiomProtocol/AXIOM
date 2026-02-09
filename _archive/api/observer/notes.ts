import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_notes,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_notes,
        COUNT(*) FILTER (WHERE status = 'active') as active_notes,
        COUNT(*) FILTER (WHERE status = 'current') as current_notes,
        COUNT(*) FILTER (WHERE status = 'delinquent') as delinquent_notes,
        COUNT(*) FILTER (WHERE status = 'paid_off') as paid_off_notes,
        COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted_notes,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_notes,
        COALESCE(SUM(principal), 0) as total_principal,
        COALESCE(SUM(outstanding_principal), 0) as total_outstanding,
        COALESCE(SUM(total_payments_received), 0) as total_payments_received,
        COALESCE(SUM(accrued_interest), 0) as total_accrued_interest
      FROM private_credit_notes
    `;
    const summaryResult = await pool.query(summaryQuery);
    const summary = summaryResult.rows[0];
    
    const notesQuery = `
      SELECT 
        id, note_number, principal, interest_rate, term_months,
        borrower_entity_name, collateral_type, status,
        outstanding_principal, origination_date, maturity_date,
        created_at
      FROM private_credit_notes
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const notesResult = await pool.query(notesQuery);
    
    const paymentSummaryQuery = `
      SELECT 
        COUNT(*) as total_payment_events,
        COALESCE(SUM(amount), 0) as total_payment_amount,
        MAX(event_date) as last_payment_date
      FROM note_payment_events
    `;
    const paymentSummaryResult = await pool.query(paymentSummaryQuery);
    const paymentSummary = paymentSummaryResult.rows[0];
    
    const covenantSummaryQuery = `
      SELECT 
        COUNT(*) as total_covenants,
        COUNT(*) FILTER (WHERE is_compliant = true) as compliant_count,
        COUNT(*) FILTER (WHERE is_compliant = false) as non_compliant_count
      FROM note_covenants
    `;
    const covenantSummaryResult = await pool.query(covenantSummaryQuery);
    const covenantSummary = covenantSummaryResult.rows[0];

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      notePortal: {
        status: parseInt(summary.delinquent_notes) > 0 || parseInt(summary.defaulted_notes) > 0 
          ? 'ATTENTION_NEEDED' 
          : parseInt(summary.active_notes) > 0 || parseInt(summary.current_notes) > 0 
            ? 'HEALTHY' 
            : 'INACTIVE',
        summary: {
          totalNotes: parseInt(summary.total_notes),
          byStatus: {
            draft: parseInt(summary.draft_notes),
            active: parseInt(summary.active_notes),
            current: parseInt(summary.current_notes),
            delinquent: parseInt(summary.delinquent_notes),
            paidOff: parseInt(summary.paid_off_notes),
            defaulted: parseInt(summary.defaulted_notes),
            cancelled: parseInt(summary.cancelled_notes),
          },
          financials: {
            totalPrincipal: parseFloat(summary.total_principal),
            totalOutstanding: parseFloat(summary.total_outstanding),
            totalPaymentsReceived: parseFloat(summary.total_payments_received),
            totalAccruedInterest: parseFloat(summary.total_accrued_interest),
          }
        },
        payments: {
          totalEvents: parseInt(paymentSummary.total_payment_events),
          totalAmount: parseFloat(paymentSummary.total_payment_amount),
          lastPaymentDate: paymentSummary.last_payment_date,
        },
        covenants: {
          total: parseInt(covenantSummary.total_covenants),
          compliant: parseInt(covenantSummary.compliant_count),
          nonCompliant: parseInt(covenantSummary.non_compliant_count),
        },
      },
      recentNotes: notesResult.rows.map(note => ({
        id: note.id,
        noteNumber: note.note_number,
        principal: parseFloat(note.principal),
        interestRate: parseFloat(note.interest_rate),
        termMonths: note.term_months,
        borrowerEntityName: note.borrower_entity_name,
        collateralType: note.collateral_type,
        status: note.status,
        outstandingPrincipal: parseFloat(note.outstanding_principal) || 0,
        originationDate: note.origination_date,
        maturityDate: note.maturity_date,
        createdAt: note.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching notes data:', error);
    return res.status(500).json({ error: 'Failed to fetch notes data' });
  }
}
