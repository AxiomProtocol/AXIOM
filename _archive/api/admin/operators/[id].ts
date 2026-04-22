import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Operator ID required' });
  }

  try {
    const client = await pool.connect();
    try {
      const operatorResult = await client.query(`
        SELECT 
          o.operator_id, o.wallet_address, o.display_name, o.email, 
          o.role, o.status, o.onboarding_phase, o.verification_tier,
          o.settlements_completed, o.attestations_provided, o.incident_count,
          o.total_earnings, o.pending_earnings, o.attestation_count,
          o.created_at, o.activated_at, o.updated_at, o.last_activity_at,
          ob.onboarding_id, ob.current_phase, ob.application_submitted_at,
          ob.verification_completed_at, ob.provisioning_completed_at,
          ob.dry_run_completed_at, ob.certification_completed_at,
          ob.activation_completed_at, ob.expires_at
        FROM node_operators o
        LEFT JOIN node_onboarding ob ON o.operator_id = ob.operator_id
        WHERE o.operator_id = $1
      `, [id]);

      if (operatorResult.rows.length === 0) {
        return res.status(404).json({ message: 'Operator not found' });
      }

      const row = operatorResult.rows[0];

      const operator = {
        operatorId: row.operator_id,
        walletAddress: row.wallet_address,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        status: row.status,
        onboardingPhase: row.onboarding_phase,
        verificationTier: row.verification_tier,
        settlementsCompleted: row.settlements_completed || 0,
        attestationsProvided: row.attestations_provided || 0,
        incidentCount: row.incident_count || 0,
        totalEarnings: parseFloat(row.total_earnings) || 0,
        pendingEarnings: parseFloat(row.pending_earnings) || 0,
        attestationCount: row.attestation_count || 0,
        createdAt: row.created_at,
        activatedAt: row.activated_at,
        updatedAt: row.updated_at,
        lastActivityAt: row.last_activity_at,
      };

      const onboarding = row.onboarding_id ? {
        onboardingId: row.onboarding_id,
        currentPhase: row.current_phase,
        applicationSubmittedAt: row.application_submitted_at,
        verificationCompletedAt: row.verification_completed_at,
        provisioningCompletedAt: row.provisioning_completed_at,
        dryRunCompletedAt: row.dry_run_completed_at,
        certificationCompletedAt: row.certification_completed_at,
        activationCompletedAt: row.activation_completed_at,
        expiresAt: row.expires_at,
      } : null;

      res.status(200).json({ operator, onboarding });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching operator details:', error);
    res.status(500).json({ message: 'Failed to fetch operator details' });
  }
}
