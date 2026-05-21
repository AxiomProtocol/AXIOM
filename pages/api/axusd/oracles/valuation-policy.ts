/**
 * GET /api/axusd/oracles/valuation-policy
 *
 * Returns per-asset valuation policies.
 * Operator header (x-admin-key) required for full detail;
 * public gets a redacted version showing only non-sensitive fields.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllValuationPolicies } from '../../../../lib/reserves/phase3/assetValuationPolicy';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY ?? '';

function isOperator(req: NextApiRequest): boolean {
  return !!ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const operator = isOperator(req);
  const policies = getAllValuationPolicies();

  const serialized = policies.map(p => {
    if (operator) return p;
    // Public: redact internal notes and confidence thresholds
    return {
      assetId: p.assetId,
      symbol: p.symbol,
      primarySourceId: p.primarySourceId,
      fallbackSourceId: p.fallbackSourceId,
      attestationRequired: p.attestationRequired,
      eligibleWhenStale: p.eligibleWhenStale,
      eligibleWhenFallback: p.eligibleWhenFallback,
    };
  });

  return res.status(200).json({
    fetchedAt: new Date().toISOString(),
    isOperatorView: operator,
    meta: {
      sourceType: 'VALUATION_POLICY_REGISTRY',
      isFallback: false,
      isFresh: true,
      isStale: false,
      plannedAssetsNote:
        'Policies for PLANNED assets define governance rules for future integration. ' +
        'These assets do not currently count as AXUSD reserve backing.',
    },
    policies: serialized,
    count: policies.length,
  });
}
