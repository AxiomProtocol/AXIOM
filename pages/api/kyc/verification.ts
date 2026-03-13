import type { NextApiRequest, NextApiResponse } from 'next';
import { getVerifiedUserFromToken } from '../../../server/auth';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let user;
  try {
    user = await getVerifiedUserFromToken(req);
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, first_name, last_name, date_of_birth, nationality, address,
              phone_number, verification_status, submitted_at, reviewed_at, reviewed_by,
              rejection_reason, risk_level, compliance_notes, expires_at, created_at, updated_at
       FROM kyc_verifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, kycVerification: null });
    }

    const row = result.rows[0];
    const kycVerification = {
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth,
      nationality: row.nationality,
      address: row.address,
      phoneNumber: row.phone_number,
      verificationStatus: row.verification_status,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      rejectionReason: row.rejection_reason,
      riskLevel: row.risk_level,
      complianceNotes: row.compliance_notes,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.status(200).json({ success: true, kycVerification });
  } catch (error: any) {
    console.error('[KYC Verification GET] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
