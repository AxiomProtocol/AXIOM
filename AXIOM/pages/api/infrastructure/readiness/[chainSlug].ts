/**
 * PATCH /api/infrastructure/readiness/:chainSlug
 *
 * Admin-only endpoint to update expansion chain readiness state in the DB.
 * Allows the ops team to mark artifacts as gathered/reviewed without
 * making a code commit.
 *
 * Supported body fields:
 *   docsAttached: boolean
 *   sdkReviewed: boolean
 *   sourceFilesAttached: boolean
 *   notes: string
 *   status: 'researching' | 'configured' | 'connected' | 'live'
 *
 * Security: Requires x-admin-key header = ADMIN_SOLVENCY_KEY.
 *
 * Creates the DB row if it does not yet exist (upsert pattern).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  expansionRailIntegrations,
  type NewExpansionRailIntegration,
} from '../../../../shared/expansionSchema';
import { eq, and } from 'drizzle-orm';
import { INTEGRATION_ARTIFACTS } from '../../../../lib/multichain/IntegrationReadinessModel';

const VALID_CHAIN_SLUGS = Object.keys(INTEGRATION_ARTIFACTS);

const CHAIN_RAIL_TYPE: Record<string, NewExpansionRailIntegration['railType']> = {
  polygon: 'identity',
  avalanche: 'execution',
  stellar: 'payments',
  canton: 'institutional',
  cosmos: 'sovereign',
};

function isAdminAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) return false;
  const headerKey = req.headers['x-admin-key'] as string | undefined;
  const queryKey = req.query.key as string | undefined;
  return headerKey === adminKey || queryKey === adminKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized. Admin key required.' });
  }

  const { chainSlug } = req.query;

  if (typeof chainSlug !== 'string' || !VALID_CHAIN_SLUGS.includes(chainSlug)) {
    return res.status(400).json({
      error: `Invalid chainSlug. Valid values: ${VALID_CHAIN_SLUGS.join(', ')}`,
    });
  }

  if (req.method === 'GET') {
    try {
      const rows = await db
        .select()
        .from(expansionRailIntegrations)
        .where(eq(expansionRailIntegrations.chainSlug, chainSlug))
        .limit(1);

      if (rows.length === 0) {
        return res.status(200).json({
          chainSlug,
          dbRow: null,
          message: 'No DB row exists for this chain. Use PATCH to create one.',
        });
      }
      return res.status(200).json({ chainSlug, dbRow: rows[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const {
      docsAttached,
      sdkReviewed,
      sourceFilesAttached,
      notes,
      status,
    } = req.body ?? {};

    const allowedStatuses = ['researching', 'configured', 'connected', 'live', 'planned', 'disabled'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }

    try {
      const existing = await db
        .select()
        .from(expansionRailIntegrations)
        .where(eq(expansionRailIntegrations.chainSlug, chainSlug))
        .limit(1);

      const now = new Date();

      if (existing.length === 0) {
        const newRow: NewExpansionRailIntegration = {
          railName: chainSlug,
          railType: CHAIN_RAIL_TYPE[chainSlug] ?? 'bridge',
          chainSlug,
          status: status ?? 'researching',
          docsAttached: docsAttached ?? false,
          sdkReviewed: sdkReviewed ?? false,
          sourceFilesAttached: sourceFilesAttached ?? false,
          implementationBlocked: true,
          notes: notes ?? null,
          createdAt: now,
          updatedAt: now,
        };

        const inserted = await db
          .insert(expansionRailIntegrations)
          .values(newRow)
          .returning();

        return res.status(201).json({
          message: `Created DB row for ${chainSlug}`,
          chainSlug,
          dbRow: inserted[0],
        });
      }

      const updateFields: Partial<NewExpansionRailIntegration> = { updatedAt: now };
      if (docsAttached !== undefined) updateFields.docsAttached = Boolean(docsAttached);
      if (sdkReviewed !== undefined) updateFields.sdkReviewed = Boolean(sdkReviewed);
      if (sourceFilesAttached !== undefined) updateFields.sourceFilesAttached = Boolean(sourceFilesAttached);
      if (notes !== undefined) updateFields.notes = String(notes);
      if (status !== undefined) updateFields.status = status;

      const updated = await db
        .update(expansionRailIntegrations)
        .set(updateFields)
        .where(eq(expansionRailIntegrations.chainSlug, chainSlug))
        .returning();

      return res.status(200).json({
        message: `Updated readiness state for ${chainSlug}`,
        chainSlug,
        dbRow: updated[0],
      });
    } catch (err: any) {
      console.error(`[api/infrastructure/readiness/${chainSlug}] Error:`, err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed. Use GET or PATCH.' });
}
