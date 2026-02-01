import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getWalletSession } from '../../../lib/auth/wallet-session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getWalletSession(req);
    const { status, phase, performance, limit = '50', offset = '0' } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit as string) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          id, note_id, seller_name, seller_email, seller_company,
          performance_status, note_type, unpaid_principal_balance, asking_price,
          ltv, discount_from_upb, property_address, property_city, property_state, property_zip,
          property_type, estimated_property_value, monthly_payment, interest_rate,
          months_delinquent, status, pipeline_phase, 
          assigned_attestor_a, assigned_attestor_b, attestation_a_at, attestation_b_at,
          created_at, updated_at
        FROM note_submissions
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status && typeof status === 'string' && status !== 'ALL') {
        query += ` AND status = $${paramIndex}`;
        params.push(status.toUpperCase());
        paramIndex++;
      }

      if (phase && typeof phase === 'string' && phase !== 'ALL') {
        query += ` AND pipeline_phase = $${paramIndex}`;
        params.push(phase.toUpperCase());
        paramIndex++;
      }

      if (performance && typeof performance === 'string' && performance !== 'ALL') {
        query += ` AND performance_status = $${paramIndex}`;
        params.push(performance.toUpperCase());
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitNum, offsetNum);

      const result = await client.query(query, params);

      const statsResult = await client.query(`
        SELECT 
          status,
          pipeline_phase,
          COUNT(*) as count,
          SUM(unpaid_principal_balance::numeric) as total_upb,
          SUM(asking_price::numeric) as total_ask
        FROM note_submissions
        GROUP BY status, pipeline_phase
      `);

      let totalNotes = 0;
      let submitted = 0;
      let inDueDiligence = 0;
      let pendingAttestation = 0;
      let approved = 0;
      let acquired = 0;
      let rejected = 0;
      let totalUPB = 0;
      let totalAskingPrice = 0;

      statsResult.rows.forEach((row: any) => {
        const count = parseInt(row.count);
        const upb = parseFloat(row.total_upb) || 0;
        const ask = parseFloat(row.total_ask) || 0;
        totalNotes += count;
        totalUPB += upb;
        totalAskingPrice += ask;

        if (row.status === 'SUBMITTED') submitted += count;
        if (row.pipeline_phase === 'DUE_DILIGENCE') inDueDiligence += count;
        if (row.pipeline_phase === 'ATTESTATION') pendingAttestation += count;
        if (row.status === 'APPROVED') approved += count;
        if (row.pipeline_phase === 'ACQUISITION') acquired += count;
        if (row.status === 'REJECTED') rejected += count;
      });

      const stats = {
        totalNotes,
        submitted,
        inDueDiligence,
        pendingAttestation,
        approved,
        acquired,
        rejected,
        totalUPB,
        totalAskingPrice,
        averageDiscount: 0
      };

      const notes = result.rows.map(row => ({
        noteId: row.note_id,
        sellerName: row.seller_name,
        sellerEmail: row.seller_email,
        sellerCompany: row.seller_company,
        performanceStatus: row.performance_status,
        noteType: row.note_type,
        unpaidPrincipalBalance: parseFloat(row.unpaid_principal_balance),
        askingPrice: parseFloat(row.asking_price),
        ltv: parseFloat(row.ltv) || 0,
        discountFromUPB: parseFloat(row.discount_from_upb) || 0,
        propertyAddress: row.property_address,
        propertyCity: row.property_city,
        propertyState: row.property_state,
        propertyZip: row.property_zip,
        propertyType: row.property_type,
        estimatedPropertyValue: parseFloat(row.estimated_property_value) || 0,
        monthlyPayment: parseFloat(row.monthly_payment) || 0,
        interestRate: parseFloat(row.interest_rate) || 0,
        monthsDelinquent: row.months_delinquent || 0,
        status: row.status,
        pipelinePhase: row.pipeline_phase,
        assignedAttestorA: row.assigned_attestor_a,
        assignedAttestorB: row.assigned_attestor_b,
        attestationAAt: row.attestation_a_at,
        attestationBAt: row.attestation_b_at,
        submittedAt: row.created_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.status(200).json({
        notes,
        stats,
        total: totalNotes,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: result.rows.length === limitNum
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error listing notes:', error);
    if (error.code === '42P01') {
      return res.status(200).json({
        notes: [],
        stats: {
          totalNotes: 0, submitted: 0, inDueDiligence: 0, pendingAttestation: 0,
          approved: 0, acquired: 0, rejected: 0, totalUPB: 0, totalAskingPrice: 0, averageDiscount: 0
        },
        total: 0,
        pagination: { limit: 50, offset: 0, hasMore: false }
      });
    }
    res.status(500).json({ message: 'Failed to list notes' });
  }
}
