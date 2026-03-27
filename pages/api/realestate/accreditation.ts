import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { lfAccreditationRecords } from '../../../shared/lendingFundSchema';
import { eq, desc, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        walletAddress,
        email,
        fullName,
        method,
        incomeThreshold,
        netWorthThreshold,
        entityAssetsThreshold,
        professionalCertification,
        filingStatus,
        selfCertified,
        selfCertificationStatement,
      } = req.body;

      if (!method) {
        return res.status(400).json({ error: 'Accreditation method is required' });
      }

      const validMethods = ['income', 'net-worth', 'entity', 'professional'];
      if (!validMethods.includes(method)) {
        return res.status(400).json({ error: 'Invalid accreditation method' });
      }

      if (!selfCertified) {
        return res.status(400).json({ error: 'Self-certification is required' });
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const [record] = await db.insert(lfAccreditationRecords)
        .values({
          walletAddress,
          email,
          fullName,
          method,
          incomeThreshold,
          netWorthThreshold,
          entityAssetsThreshold,
          professionalCertification,
          filingStatus,
          selfCertified,
          selfCertificationStatement,
          verificationStatus: 'pending',
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Accreditation submitted successfully',
        recordId: record.id,
      });
    } catch (error) {
      console.error('Accreditation submission error:', error);
      return res.status(500).json({ error: 'Failed to submit accreditation' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { walletAddress } = req.query;
      if (walletAddress) {
        const records = await db.select()
          .from(lfAccreditationRecords)
          .where(sql`LOWER(${lfAccreditationRecords.walletAddress}) = LOWER(${walletAddress as string})`)
          .orderBy(desc(lfAccreditationRecords.createdAt));

        return res.status(200).json({ records });
      }

      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      if (token !== process.env.ADMIN_SOLVENCY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const records = await db.select()
        .from(lfAccreditationRecords)
        .orderBy(desc(lfAccreditationRecords.createdAt));

      return res.status(200).json({ records });
    } catch (error) {
      console.error('Error fetching accreditation records:', error);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }
  }

  if (req.method === 'PATCH') {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    if (token !== process.env.ADMIN_SOLVENCY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { id, action, adminNotes, reviewedBy } = req.body;

      if (!id || !action) {
        return res.status(400).json({ error: 'id and action are required' });
      }

      const validActions = ['approve', 'reject', 'reset'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or reset.' });
      }

      const statusMap: Record<string, string> = {
        approve: 'verified',
        reject: 'rejected',
        reset: 'pending',
      };

      const now = new Date();

      const [updated] = await db
        .update(lfAccreditationRecords)
        .set({
          verificationStatus: statusMap[action],
          adminReviewedBy: reviewedBy || 'admin',
          adminNotes: adminNotes || null,
          reviewedAt: action !== 'reset' ? now : null,
          updatedAt: now,
        })
        .where(eq(lfAccreditationRecords.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Record not found' });
      }

      return res.status(200).json({ success: true, record: updated });
    } catch (error) {
      console.error('Accreditation review error:', error);
      return res.status(500).json({ error: 'Failed to update record' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
