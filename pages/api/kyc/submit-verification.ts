import type { NextApiRequest, NextApiResponse } from 'next';
import { getVerifiedUserFromToken, getClientIp } from '../../../server/auth';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    const { personalInfo, riskAssessment, personaInquiryId } = req.body;

    if (!personalInfo) {
      return res.status(400).json({ success: false, error: 'Personal information is required' });
    }

    const errors: any = { personalInfo: {} };
    let hasErrors = false;

    if (!personalInfo.firstName || personalInfo.firstName.trim().length < 2) {
      errors.personalInfo.firstName = 'First name is required (at least 2 characters)';
      hasErrors = true;
    }
    if (!personalInfo.lastName || personalInfo.lastName.trim().length < 2) {
      errors.personalInfo.lastName = 'Last name is required (at least 2 characters)';
      hasErrors = true;
    }
    if (!personalInfo.dateOfBirth) {
      errors.personalInfo.dateOfBirth = 'Date of birth is required';
      hasErrors = true;
    }
    if (!personalInfo.nationality) {
      errors.personalInfo.nationality = 'Nationality is required';
      hasErrors = true;
    }
    if (!personalInfo.address || personalInfo.address.trim().length < 10) {
      errors.personalInfo.address = 'A complete address is required';
      hasErrors = true;
    }
    if (!personalInfo.phoneNumber) {
      errors.personalInfo.phoneNumber = 'Phone number is required';
      hasErrors = true;
    }

    if (hasErrors) {
      return res.status(400).json({ success: false, error: 'Validation failed', errors });
    }

    let riskLevel = 'low';
    if (riskAssessment) {
      if (riskAssessment.isPoliticallyExposed || riskAssessment.hasCriminalRecord) {
        riskLevel = 'high';
      } else if (riskAssessment.riskTolerance === 'very_high' || riskAssessment.annualIncome === 'over_250k') {
        riskLevel = 'medium';
      }
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;

    // Sanitise: only accept alphanumeric + dash/underscore, max 100 chars
    const sanitizedInquiryId =
      typeof personaInquiryId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(personaInquiryId)
        ? personaInquiryId
        : null;

    const existingResult = await pool.query(
      `SELECT id FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.userId]
    );

    let kycRow;

    if (existingResult.rows.length > 0) {
      const updateResult = await pool.query(
        `UPDATE kyc_verifications SET
           first_name = $1, last_name = $2, date_of_birth = $3, nationality = $4,
           address = $5, phone_number = $6, verification_status = 'pending',
           submitted_at = NOW(), risk_level = $7, ip_address = $8, user_agent = $9,
           last_updated_by = $10,
           persona_inquiry_id = COALESCE($11, persona_inquiry_id),
           updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          personalInfo.firstName.trim(),
          personalInfo.lastName.trim(),
          personalInfo.dateOfBirth,
          personalInfo.nationality,
          personalInfo.address.trim(),
          personalInfo.phoneNumber.trim(),
          riskLevel,
          ipAddress,
          userAgent,
          user.userId,
          sanitizedInquiryId,
          existingResult.rows[0].id,
        ]
      );
      kycRow = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO kyc_verifications
           (user_id, first_name, last_name, date_of_birth, nationality, address, phone_number,
            verification_status, submitted_at, risk_level, ip_address, user_agent,
            last_updated_by, persona_inquiry_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          user.userId,
          personalInfo.firstName.trim(),
          personalInfo.lastName.trim(),
          personalInfo.dateOfBirth,
          personalInfo.nationality,
          personalInfo.address.trim(),
          personalInfo.phoneNumber.trim(),
          riskLevel,
          ipAddress,
          userAgent,
          user.userId,
          sanitizedInquiryId,
        ]
      );
      kycRow = insertResult.rows[0];
    }

    if (riskAssessment) {
      const stepData = JSON.stringify(riskAssessment);
      await pool.query(
        `INSERT INTO kyc_verification_steps (kyc_id, step_name, step_status, step_order, completed_at, completed_by, step_data)
         VALUES ($1, 'personal_info', 'completed', 1, NOW(), $2, $3)
         ON CONFLICT DO NOTHING`,
        [kycRow.id, user.userId, JSON.stringify(personalInfo)]
      );
      await pool.query(
        `INSERT INTO kyc_verification_steps (kyc_id, step_name, step_status, step_order, completed_at, completed_by, step_data)
         VALUES ($1, 'review_submission', 'completed', 3, NOW(), $2, $3)
         ON CONFLICT DO NOTHING`,
        [kycRow.id, user.userId, stepData]
      );
    }

    const verification = {
      id: kycRow.id,
      userId: kycRow.user_id,
      firstName: kycRow.first_name,
      lastName: kycRow.last_name,
      dateOfBirth: kycRow.date_of_birth,
      nationality: kycRow.nationality,
      address: kycRow.address,
      phoneNumber: kycRow.phone_number,
      verificationStatus: kycRow.verification_status,
      submittedAt: kycRow.submitted_at,
      riskLevel: kycRow.risk_level,
      personaInquiryId: kycRow.persona_inquiry_id,
      createdAt: kycRow.created_at,
      updatedAt: kycRow.updated_at,
    };

    return res.status(200).json({ success: true, data: verification });
  } catch (error: any) {
    console.error('[KYC Submit] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
