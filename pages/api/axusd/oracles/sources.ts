/**
 * GET /api/axusd/oracles/sources
 *
 * Returns the full OracleSourceRegistry with active/deprecated status.
 * Phase 3 oracle architecture endpoint.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOracleSourceRegistry } from '../../../../lib/reserves/phase3/oracleSourceRegistry';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const sources = getOracleSourceRegistry();

  return res.status(200).json({
    fetchedAt: new Date().toISOString(),
    meta: {
      sourceType: 'ORACLE_REGISTRY',
      isFallback: false,
      isFresh: true,
      isStale: false,
      plannedAssetsNote:
        'Several oracle sources are stubs (isActive=false). These are wired but not yet connected. ' +
        'No T-Bill or Treasury backing is currently live.',
    },
    sources: sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      supportedSleeves: s.supportedSleeves,
      priorityRank: s.priorityRank,
      isPrimary: s.isPrimary,
      isFallback: s.isFallback,
      isActive: s.isActive,
      isDeprecated: s.isDeprecated,
      maxStalenessSeconds: s.maxStalenessSeconds,
      requiresAttestation: s.requiresAttestation,
      requiresManualReview: s.requiresManualReview,
      referenceUrl: s.referenceUrl,
      notes: s.notes,
    })),
    counts: {
      total: sources.length,
      active: sources.filter(s => s.isActive && !s.isDeprecated).length,
      deprecated: sources.filter(s => s.isDeprecated).length,
      stubbed: sources.filter(s => !s.isActive && !s.isDeprecated).length,
    },
  });
}
