/**
 * /api/oracle/axusd-parity-fallback-metrics  (Task #100)
 *
 * Surfaces the in-process counter maintained by
 * `recordAxusdParityFallback` so operators have visibility into how often
 * the AXUSD on-chain quote is failing and the loan-lifecycle code is forced
 * onto the static 1:1 parity safety fallback.
 *
 * The counter is in-memory per Node process, so this endpoint is intended
 * for live spot-checks; long-term retention should come from the structured
 * `[ALERT] axusd_oracle_parity_fallback ...` log lines emitted alongside.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAxusdParityFallbackMetrics } from '../../../server/services/oracle/axusdParityFallbackAlert';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const metrics = getAxusdParityFallbackMetrics();
  return res.status(200).json({
    success: true,
    metrics,
    note:
      'In-process counter of AXUSD on-chain quote failures that forced a static 1:1 parity fallback. ' +
      'Each fallback also emits a structured `[ALERT] axusd_oracle_parity_fallback` log line.',
  });
}
