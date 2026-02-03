import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { getWalletSession } from '../../../lib/auth/wallet-session';

function isValidWallet(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getWalletSession(req);
    let wallet = req.query.wallet as string;

    if (session.authenticated && session.address) {
      wallet = session.address;
    }

    if (!wallet || typeof wallet !== 'string' || !isValidWallet(wallet)) {
      return res.status(400).json({ message: 'Valid wallet address required' });
    }

    const client = await pool.connect();
    try {
      const operatorResult = await client.query(
        `SELECT 
<<<<<<< HEAD
          o.operator_id, o.wallet_address, o.display_name, o.email, o.role, o.roles, o.status,
=======
          o.operator_id, o.wallet_address, o.display_name, o.email, o.role, o.status,
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
          o.onboarding_phase, o.total_milestones_completed, o.total_earnings, o.pending_earnings,
          o.attestation_count, o.last_activity_at, o.activated_at, o.created_at,
          ob.onboarding_id, ob.current_phase, ob.application_submitted_at, ob.verification_completed_at,
          ob.provisioning_completed_at, ob.dry_run_completed_at, ob.certification_completed_at,
          ob.activation_completed_at, ob.expires_at
        FROM node_operators o
        LEFT JOIN node_onboarding ob ON o.operator_id = ob.operator_id
        WHERE o.wallet_address = $1`,
        [wallet.toLowerCase()]
      );

      if (operatorResult.rows.length === 0) {
        return res.status(200).json({ operator: null, rewards: null, onboarding: null });
      }

      const row = operatorResult.rows[0];
      
      const operator = {
        operatorId: row.operator_id,
        walletAddress: row.wallet_address,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
<<<<<<< HEAD
        roles: row.roles || [row.role],
=======
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
        status: row.status,
        onboardingPhase: row.onboarding_phase,
        totalMilestonesCompleted: row.total_milestones_completed || 0,
        attestationCount: row.attestation_count || 0,
        lastActivityAt: row.last_activity_at,
        activatedAt: row.activated_at,
        createdAt: row.created_at,
      };

      const rewards = {
        usdAccrued: parseFloat(row.total_earnings) || 0,
        usdPaid: parseFloat(row.total_earnings) || 0,
        usdPending: parseFloat(row.pending_earnings) || 0,
        conversionBucket: 0,
        slashedAmount: 0,
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

      res.status(200).json({ operator, rewards, onboarding });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching operator status:', error);
    if (error.code === '42P01') {
      return res.status(200).json({ operator: null, rewards: null, onboarding: null });
    }
    res.status(500).json({ message: 'Failed to fetch operator status' });
  }
}
