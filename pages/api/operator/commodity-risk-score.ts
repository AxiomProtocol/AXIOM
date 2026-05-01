/**
 * POST /api/operator/commodity-risk-score
 *
 * Operator-protected advisory endpoint that scores a commodity reserve
 * instrument candidate against the Commodity Expansion Framework (v1.0.0).
 *
 * Auth: requires a valid operator key via either:
 *   - cookie:  cap_operator_key
 *   - header:  x-admin-key
 *
 * Body schema:
 *   {
 *     "candidateName": "Silver Reserve Instrument",
 *     "oracleRisk":     1-5,
 *     "custodyRisk":    1-5,
 *     "liquidityRisk":  1-5,
 *     "reserveRisk":    1-5,
 *     "regulatoryRisk": 1-5,
 *     "multipliers":    { ...optional per-dimension multipliers },
 *     "notes":          "optional free-text notes"
 *   }
 *
 * Returns: ScoreResult JSON. NO database writes. NO on-chain calls. NO
 * external API calls. The result is advisory and does NOT replace the
 * governance vote required by the framework.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
  OPERATOR_HEADER_KEY,
} from '../../../lib/capinfra/operatorAuth';
import {
  scoreCandidate,
  validateScoreInput,
  ScoreInputError,
  ADVISORY_DISCLAIMER,
} from '../../../lib/commodity/riskScoring';

function getCallerKey(req: NextApiRequest): string | null {
  const header = req.headers[OPERATOR_HEADER_KEY];
  if (typeof header === 'string' && header) return header;
  return readOperatorCookie(req);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed', allow: 'POST' });
  }

  // 1. Auth gate — must be a valid operator key.
  const callerKey = getCallerKey(req);
  if (!isValidOperatorKey(callerKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Parse and validate input. body is already JSON-parsed by Next.js when
  //    Content-Type is application/json; tolerate a string body too.
  let parsed: unknown = req.body;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return res
        .status(400)
        .json({ error: 'Invalid JSON body', advisory: ADVISORY_DISCLAIMER });
    }
  }

  let validated;
  try {
    validated = validateScoreInput(parsed);
  } catch (err) {
    if (err instanceof ScoreInputError) {
      return res.status(400).json({
        error: 'Invalid input',
        field: err.field,
        message: err.message,
        advisory: ADVISORY_DISCLAIMER,
      });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res
      .status(400)
      .json({ error: 'Invalid input', message: msg, advisory: ADVISORY_DISCLAIMER });
  }

  // 3. Score (pure function, no I/O).
  try {
    const result = scoreCandidate(validated);
    return res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Scoring engine failure',
      message: msg,
      advisory: ADVISORY_DISCLAIMER,
    });
  }
}
