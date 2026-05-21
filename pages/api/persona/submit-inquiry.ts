import type { NextApiRequest, NextApiResponse } from 'next';
import { getVerifiedUserFromToken, getClientIp } from '../../../server/auth';
import { pool } from '../../../server/db';

/**
 * POST /api/persona/submit-inquiry
 *
 * Records that the authenticated user has started/completed a Persona inquiry.
 * Called by KYCVerificationPage after the Persona hosted flow fires persona:complete.
 *
 * Body: { personaInquiryId: string }
 *
 * Creates or updates the user's kyc_verifications row with:
 *   - persona_inquiry_id = the Persona inquiry ID
 *   - verification_status = 'pending'  (Persona webhook will flip to approved/rejected)
 *   - placeholder personal info fields (Persona collected the real data)
 *
 * The Persona webhook at /api/persona/webhook handles the final status update.
 */
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

  const { personaInquiryId } = req.body ?? {};

  if (
    typeof personaInquiryId !== 'string' ||
    !/^[a-zA-Z0-9_-]{4,100}$/.test(personaInquiryId)
  ) {
    return res.status(400).json({ success: false, error: 'Invalid or missing personaInquiryId' });
  }

  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] ?? null;

  try {
    const existing = await pool.query(
      `SELECT id FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.userId]
    );

    let kycRow;

    if (existing.rows.length > 0) {
      const update = await pool.query(
        `UPDATE kyc_verifications
           SET verification_status = 'pending',
               submitted_at        = NOW(),
               persona_inquiry_id  = $1,
               ip_address          = $2,
               user_agent          = $3,
               updated_at          = NOW()
         WHERE id = $4
         RETURNING id, user_id, verification_status, persona_inquiry_id`,
        [personaInquiryId, ipAddress, userAgent, existing.rows[0].id]
      );
      kycRow = update.rows[0];
    } else {
      // Insert a minimal row — personal info fields are NOT NULL in the schema so we use
      // clearly-labelled placeholders. The Persona webhook will confirm identity; these
      // fields can be backfilled later via the Persona API if needed.
      const insert = await pool.query(
        `INSERT INTO kyc_verifications
           (user_id, first_name, last_name, date_of_birth, nationality, address, phone_number,
            verification_status, submitted_at, persona_inquiry_id, ip_address, user_agent, last_updated_by)
         VALUES ($1, 'persona', 'verified', '2000-01-01', 'pending',
                 'collected via Persona hosted flow', 'pending',
                 'pending', NOW(), $2, $3, $4, $1)
         RETURNING id, user_id, verification_status, persona_inquiry_id`,
        [user.userId, personaInquiryId, ipAddress, userAgent]
      );
      kycRow = insert.rows[0];
    }

    return res.status(200).json({
      success: true,
      data: {
        id: kycRow.id,
        userId: kycRow.user_id,
        verificationStatus: kycRow.verification_status,
        personaInquiryId: kycRow.persona_inquiry_id,
      },
    });
  } catch (err: any) {
    console.error('[Persona SubmitInquiry] DB error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
