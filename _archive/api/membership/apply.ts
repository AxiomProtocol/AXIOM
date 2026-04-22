import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { membershipRecords, disclosureAcknowledgments, systemAuditLogs } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { rulesAccepted, disclosuresAccepted, agreementVersion } = req.body;

    if (!rulesAccepted || !disclosuresAccepted) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must accept rules and disclosures to apply for membership' 
      });
    }

    const [existing] = await db
      .select()
      .from(membershipRecords)
      .where(eq(membershipRecords.userId, userId))
      .limit(1);

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Membership application already exists' 
      });
    }

    const now = new Date();
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                     req.socket.remoteAddress || 'unknown';

    await db.insert(membershipRecords).values({
      userId,
      membershipStatus: 'applicant',
      membershipAgreementVersion: agreementVersion || '1.0',
      disclosureAcceptedAt: now,
      disclosureVersion: '1.0',
      rulesAcceptedAt: now,
      rulesVersion: '1.0',
      createdAt: now,
      updatedAt: now
    });

    await db.insert(disclosureAcknowledgments).values([
      {
        userId,
        disclosureType: 'participation',
        disclosureVersion: '1.0',
        acknowledgedAt: now,
        ipAddress
      },
      {
        userId,
        disclosureType: 'pma_rules',
        disclosureVersion: '1.0',
        acknowledgedAt: now,
        ipAddress
      }
    ]);

    await db.insert(systemAuditLogs).values({
      actorUserId: userId,
      action: 'membership_application_submitted',
      entityType: 'membership',
      entityId: userId.toString(),
      afterJson: { status: 'applicant', agreementVersion },
      ipAddress,
      createdAt: now
    });

    return res.status(200).json({
      success: true,
      message: 'Membership application submitted successfully'
    });
  } catch (error) {
    console.error('Membership application error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit membership application' });
  }
}
