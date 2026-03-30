import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { t3AccreditationSubmissions } from '../../../../shared/erc3643Schema';
import { eq, or } from 'drizzle-orm';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });
    const statusFilter = (req.query.status as string) || 'submitted';

    try {
      const rows = await db.select()
        .from(t3AccreditationSubmissions)
        .where(
          statusFilter === 'all'
            ? undefined
            : or(
                eq(t3AccreditationSubmissions.status, 'submitted'),
                eq(t3AccreditationSubmissions.status, 'under_review')
              )
        )
        .orderBy(t3AccreditationSubmissions.createdAt);
      return res.status(200).json({ success: true, data: rows });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { submissionId, action, adminWallet, reviewNote } = req.body as {
    submissionId?: string;
    action?: 'approve' | 'reject';
    adminWallet?: string;
    reviewNote?: string;
  };

  if (!submissionId) return res.status(400).json({ error: 'submissionId required' });
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or reject' });
  }

  const operator = adminWallet ?? 'compliance-operator';

  try {
    if (action === 'approve') {
      const result = await ERC3643Service.approveAccreditation(submissionId, operator);
      return res.status(200).json({ success: true, data: result });
    } else {
      const result = await ERC3643Service.rejectAccreditation(submissionId, operator, reviewNote);
      return res.status(200).json({ success: true, data: result });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
