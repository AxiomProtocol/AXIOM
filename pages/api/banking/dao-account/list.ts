/**
 * GET /api/banking/dao-account/list
 *
 * Admin-only endpoint (x-admin-key gated).
 * Returns all DAO account applications with BSA identity fields stripped.
 * BSA fields (signerDob, signerCountry, signerIdType, signerIdNumber) are never returned.
 * signerName is also excluded as it is part of the designated signer identity set.
 * Used by the Founder Ops DAO Accounts tab.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { desc } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { daoAccountApplications } from '../../../../shared/daoAccountSchema';

function checkAdminKey(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAdminKey(req)) return res.status(401).json({ error: 'Unauthorized — admin key required' });

  try {
    const applications = await db
      .select({
        id: daoAccountApplications.id,
        entityName: daoAccountApplications.entityName,
        entityEin: daoAccountApplications.entityEin,
        entityAddress: daoAccountApplications.entityAddress,
        increaseAccountId: daoAccountApplications.increaseAccountId,
        increaseRoutingNumber: daoAccountApplications.increaseRoutingNumber,
        status: daoAccountApplications.status,
        createdAt: daoAccountApplications.createdAt,
        updatedAt: daoAccountApplications.updatedAt,
      })
      .from(daoAccountApplications)
      .orderBy(desc(daoAccountApplications.createdAt));

    return res.status(200).json({
      success: true,
      data: applications,
      total: applications.length,
    });
  } catch (err: unknown) {
    console.error('[DAO Account List] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list applications' });
  }
}
