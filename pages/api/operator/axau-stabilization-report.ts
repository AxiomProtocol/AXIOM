/**
 * GET /api/operator/axau-stabilization-report
 *
 * AXAU Phase 2A — Stabilization Report API
 *
 * Returns a structured 72-hour post-launch stabilization report.
 * Read-only. Does not modify any settlement, mint/redeem, or contract state.
 *
 * Auth: cap_operator_key session cookie or x-admin-key header.
 * Cache: no-store — always fresh data.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
  OPERATOR_HEADER_KEY,
} from '../../../lib/capinfra/operatorAuth';
import { generateStabilizationReport } from '../../../lib/axau/stabilizationReport';
import type { StabilizationReport } from '../../../lib/axau/stabilizationReport';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StabilizationReport | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const provided =
    readOperatorCookie(req) ||
    (req.headers[OPERATOR_HEADER_KEY] || '').toString();
  if (!isValidOperatorKey(provided)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const report = await generateStabilizationReport();
    return res.status(200).json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[axau-stabilization-report] Unexpected error:', msg);
    return res.status(500).json({ error: `Report generation failed: ${msg}` });
  }
}
