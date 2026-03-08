import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3KycSubmissions } from '../../../../shared/erc3643Schema';
import { eq } from 'drizzle-orm';
import { IdentityBridgeService } from '../../../../lib/services/IdentityBridgeService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const statusFilter = (req.query.status as string) || undefined;

    try {
      let submissions;
      if (statusFilter) {
        submissions = await db.select()
          .from(t3KycSubmissions)
          .where(eq(t3KycSubmissions.status, statusFilter))
          .orderBy(t3KycSubmissions.createdAt);
      } else {
        submissions = await db.select()
          .from(t3KycSubmissions)
          .orderBy(t3KycSubmissions.createdAt);
      }

      return res.status(200).json({ success: true, data: submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { submissionId, action, reviewNote } = req.body;

  if (!submissionId || typeof submissionId !== 'string') {
    return res.status(400).json({ error: 'submissionId required' });
  }
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action required: approve or reject' });
  }

  try {
    const [submission] = await db.select()
      .from(t3KycSubmissions)
      .where(eq(t3KycSubmissions.id, submissionId))
      .limit(1);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (!['submitted', 'under_review'].includes(submission.status)) {
      return res.status(400).json({ error: `Cannot review submission in status: ${submission.status}` });
    }

    if (action === 'reject') {
      await db.update(t3KycSubmissions)
        .set({
          status: 'rejected',
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(t3KycSubmissions.id, submissionId));

      return res.status(200).json({
        success: true,
        data: { submissionId, status: 'rejected' },
      });
    }

    await db.update(t3KycSubmissions)
      .set({
        status: 'approved',
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(t3KycSubmissions.id, submissionId));

    try {
      const bridgeResult = await IdentityBridgeService.bridgeSingleSubmission(submission);

      await db.update(t3KycSubmissions)
        .set({
          status: 'bridged',
          bridgedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(t3KycSubmissions.id, submissionId));

      return res.status(200).json({
        success: true,
        data: {
          submissionId,
          status: 'bridged',
          bridge: bridgeResult,
        },
      });
    } catch (bridgeErr: any) {
      await db.update(t3KycSubmissions)
        .set({
          bridgeError: bridgeErr.message,
          updatedAt: new Date(),
        })
        .where(eq(t3KycSubmissions.id, submissionId));

      return res.status(200).json({
        success: true,
        data: {
          submissionId,
          status: 'approved',
          bridgeError: bridgeErr.message,
        },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
