import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const action = req.query.action as string;
      const claimId = req.query.claimId ? parseInt(req.query.claimId as string) : null;
      
      if (action === 'pool') {
        const pool = await db.execute(sql`
          SELECT * FROM susu_insurance_pools 
          WHERE is_active = true
          ORDER BY id ASC
          LIMIT 1
        `);
        
        const recentContributions = await db.execute(sql`
          SELECT 
            sic.*,
            spg.name as source_group_name
          FROM susu_insurance_contributions sic
          LEFT JOIN susu_purpose_groups spg ON sic.source_group_id = spg.id
          ORDER BY sic.created_at DESC
          LIMIT 20
        `);
        
        const stats = await db.execute(sql`
          SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_claims,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_claims,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_amount ELSE 0 END), 0) as total_paid
          FROM susu_insurance_claims
        `);
        
        return res.json({
          pool: pool.rows[0] || null,
          recentContributions: recentContributions.rows,
          claimStats: stats.rows[0]
        });
      }
      
      if (action === 'claims') {
        const claims = await db.execute(sql`
          SELECT 
            sic.*,
            u1.email as claimant_email,
            u1.wallet_address as claimant_wallet,
            u2.email as defaulter_email,
            u2.wallet_address as defaulter_wallet,
            spg.name as group_name
          FROM susu_insurance_claims sic
          LEFT JOIN users u1 ON sic.claimant_user_id = u1.id
          LEFT JOIN users u2 ON sic.defaulter_user_id = u2.id
          LEFT JOIN susu_purpose_groups spg ON sic.group_id = spg.id
          ORDER BY sic.created_at DESC
        `);
        
        return res.json({ claims: claims.rows });
      }
      
      if (action === 'claim' && claimId) {
        const claim = await db.execute(sql`
          SELECT 
            sic.*,
            u1.email as claimant_email,
            u1.wallet_address as claimant_wallet,
            u2.email as defaulter_email,
            u2.wallet_address as defaulter_wallet,
            spg.name as group_name,
            sip.total_balance as pool_balance
          FROM susu_insurance_claims sic
          LEFT JOIN users u1 ON sic.claimant_user_id = u1.id
          LEFT JOIN users u2 ON sic.defaulter_user_id = u2.id
          LEFT JOIN susu_purpose_groups spg ON sic.group_id = spg.id
          LEFT JOIN susu_insurance_pools sip ON sic.insurance_pool_id = sip.id
          WHERE sic.id = ${claimId}
        `);
        
        return res.json({ claim: claim.rows[0] || null });
      }
      
      return res.status(400).json({ error: 'Invalid action. Use: pool, claims, or claim' });
    }
    
    if (req.method === 'POST') {
      const action = req.body.action;
      
      if (action === 'contribute') {
        const amount = parseFloat(req.body.amount);
        const sourcePoolId = req.body.sourcePoolId || null;
        const sourceGroupId = req.body.sourceGroupId ? parseInt(req.body.sourceGroupId) : null;
        const txHash = req.body.txHash || null;
        const originalFeeAmount = req.body.originalFeeAmount ? parseFloat(req.body.originalFeeAmount) : null;
        
        if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ error: 'Valid positive amount is required' });
        }
        
        if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          return res.status(400).json({ error: 'Invalid transaction hash format' });
        }
        
        const pool = await db.execute(sql`
          SELECT id, total_balance, total_contributions FROM susu_insurance_pools
          WHERE is_active = true
          ORDER BY id ASC
          LIMIT 1
        `);
        
        if (pool.rows.length === 0) {
          return res.status(404).json({ error: 'No active insurance pool found' });
        }
        
        const poolId = pool.rows[0].id;
        
        await db.execute(sql`
          INSERT INTO susu_insurance_contributions 
          (insurance_pool_id, source_pool_id, source_group_id, amount, original_fee_amount, tx_hash)
          VALUES (${poolId}, ${sourcePoolId}, ${sourceGroupId}, ${amount}, ${originalFeeAmount}, ${txHash})
        `);
        
        await db.execute(sql`
          UPDATE susu_insurance_pools SET
            total_balance = total_balance + ${amount},
            total_contributions = total_contributions + ${amount},
            last_contribution_at = NOW(),
            updated_at = NOW()
          WHERE id = ${poolId}
        `);
        
        return res.status(201).json({ 
          message: 'Contribution added to insurance pool',
          newBalance: parseFloat(pool.rows[0].total_balance) + amount
        });
      }
      
      if (action === 'claim') {
        const claimantUserId = parseInt(req.body.claimantUserId);
        const defaulterUserId = parseInt(req.body.defaulterUserId);
        const groupId = req.body.groupId ? parseInt(req.body.groupId) : null;
        const poolId = req.body.poolId || null;
        const cycleNumber = req.body.cycleNumber ? parseInt(req.body.cycleNumber) : null;
        const claimAmount = parseFloat(req.body.claimAmount);
        const claimReason = req.body.claimReason || null;
        
        if (!claimantUserId || isNaN(claimantUserId) || !defaulterUserId || isNaN(defaulterUserId)) {
          return res.status(400).json({ error: 'Valid claimantUserId and defaulterUserId are required' });
        }
        
        if (!claimAmount || isNaN(claimAmount) || claimAmount <= 0) {
          return res.status(400).json({ error: 'Valid positive claimAmount is required' });
        }
        
        const insurancePool = await db.execute(sql`
          SELECT id FROM susu_insurance_pools WHERE is_active = true LIMIT 1
        `);
        
        if (insurancePool.rows.length === 0) {
          return res.status(404).json({ error: 'No active insurance pool' });
        }
        
        const result = await db.execute(sql`
          INSERT INTO susu_insurance_claims 
          (insurance_pool_id, claimant_user_id, defaulter_user_id, group_id, pool_id,
           cycle_number, claim_amount, claim_reason, status)
          VALUES (${insurancePool.rows[0].id}, ${claimantUserId}, ${defaulterUserId},
                  ${groupId}, ${poolId}, ${cycleNumber}, ${claimAmount}, ${claimReason}, 'pending')
          RETURNING *
        `);
        
        return res.status(201).json({
          message: 'Insurance claim submitted',
          claim: result.rows[0]
        });
      }
      
      if (action === 'review') {
        const claimId = parseInt(req.body.claimId);
        const decision = req.body.decision;
        const reviewNotes = req.body.reviewNotes || null;
        const reviewedBy = parseInt(req.body.reviewedBy);
        const approvedAmount = req.body.approvedAmount ? parseFloat(req.body.approvedAmount) : null;
        
        if (!claimId || isNaN(claimId)) {
          return res.status(400).json({ error: 'Valid claimId is required' });
        }
        
        if (!decision || !['approve', 'reject'].includes(decision)) {
          return res.status(400).json({ error: 'decision must be approve or reject' });
        }
        
        if (!reviewedBy || isNaN(reviewedBy)) {
          return res.status(400).json({ error: 'Valid reviewedBy is required' });
        }
        
        const claim = await db.execute(sql`
          SELECT * FROM susu_insurance_claims WHERE id = ${claimId}
        `);
        
        if (claim.rows.length === 0) {
          return res.status(404).json({ error: 'Claim not found' });
        }
        
        if (claim.rows[0].status !== 'pending') {
          return res.status(400).json({ error: 'Claim is not pending' });
        }
        
        const newStatus = decision === 'approve' ? 'approved' : 'rejected';
        const approved = decision === 'approve' ? (approvedAmount || parseFloat(claim.rows[0].claim_amount)) : null;
        
        await db.execute(sql`
          UPDATE susu_insurance_claims SET
            status = ${newStatus}::susu_insurance_claim_status,
            approved_amount = ${approved},
            review_notes = ${reviewNotes},
            reviewed_by = ${reviewedBy},
            reviewed_at = NOW()
          WHERE id = ${claimId}
        `);
        
        return res.json({ message: `Claim ${decision}d`, status: newStatus });
      }
      
      if (action === 'payout') {
        const claimId = parseInt(req.body.claimId);
        const paidAmount = parseFloat(req.body.paidAmount);
        const payoutTxHash = req.body.payoutTxHash || null;
        const collateralRecovered = req.body.collateralRecovered ? parseFloat(req.body.collateralRecovered) : 0;
        
        if (!claimId || isNaN(claimId)) {
          return res.status(400).json({ error: 'Valid claimId is required' });
        }
        
        if (!paidAmount || isNaN(paidAmount) || paidAmount <= 0) {
          return res.status(400).json({ error: 'Valid positive paidAmount is required' });
        }
        
        if (payoutTxHash && !/^0x[a-fA-F0-9]{64}$/.test(payoutTxHash)) {
          return res.status(400).json({ error: 'Invalid transaction hash format' });
        }
        
        const claim = await db.execute(sql`
          SELECT * FROM susu_insurance_claims WHERE id = ${claimId}
        `);
        
        if (claim.rows.length === 0) {
          return res.status(404).json({ error: 'Claim not found' });
        }
        
        if (claim.rows[0].status !== 'approved') {
          return res.status(400).json({ error: 'Claim must be approved before payout' });
        }
        
        const pool = await db.execute(sql`
          SELECT * FROM susu_insurance_pools WHERE id = ${claim.rows[0].insurance_pool_id}
        `);
        
        const poolBalance = parseFloat(pool.rows[0].total_balance);
        const actualPayout = Math.min(paidAmount, poolBalance);
        const status = actualPayout < paidAmount ? 'partial' : 'paid';
        
        await db.execute(sql`
          UPDATE susu_insurance_claims SET
            status = ${status}::susu_insurance_claim_status,
            paid_amount = ${actualPayout},
            payout_tx_hash = ${payoutTxHash},
            collateral_recovered = ${collateralRecovered},
            paid_at = NOW()
          WHERE id = ${claimId}
        `);
        
        await db.execute(sql`
          UPDATE susu_insurance_pools SET
            total_balance = total_balance - ${actualPayout},
            total_claims_paid = total_claims_paid + ${actualPayout},
            updated_at = NOW()
          WHERE id = ${claim.rows[0].insurance_pool_id}
        `);
        
        return res.json({
          message: `Claim ${status === 'partial' ? 'partially ' : ''}paid`,
          paidAmount: actualPayout,
          status
        });
      }
      
      return res.status(400).json({ error: 'Invalid action. Use: contribute, claim, review, or payout' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Insurance API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
