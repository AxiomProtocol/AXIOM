/**
 * POST /api/sentinel/rebalance-auth
 *
 * Step 1 of the two-step Sentinel-gated rebalance flow.
 *
 * Evaluates the Sentinel rebalance strategy and, if approved, issues a
 * time-limited HMAC-SHA256 authorization token that the operator must
 * present to POST /api/treasury/vault/rebalance within TOKEN_TTL_SECONDS.
 *
 * This two-step design separates authorization (Sentinel evaluation) from
 * execution (on-chain tx submission), providing an explicit
 * multi-party-authorization artifact before any on-chain action occurs.
 *
 * Body (JSON):
 *   fromStrategy      — 'aave_v3' | 'camelot'
 *   toStrategy        — 'aave_v3' | 'camelot'
 *   amountUsdc        — number
 *   currentAaveApy?   — optional override for Aave APY
 *   currentCamelotApy? — optional override for Camelot APY
 *
 * Response (approved):
 *   { authorized: true, sentinelDecision, token, expiry }
 *
 * Response (denied):
 *   { authorized: false, sentinelDecision, error }
 *
 * Authorization: operator session cookie (cap_operator_key).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac } from 'node:crypto';
import { readOperatorCookie, isValidOperatorKey } from '../../../lib/capinfra/operatorAuth';
import { evaluateTreasuryRebalance } from '../../../lib/sentinel/strategies/treasuryRebalance';

const TOKEN_TTL_SECONDS = 5 * 60;   // 5-minute window to execute after auth

function buildTokenPayload(
  fromStrategy: string,
  toStrategy: string,
  amountUsdc: number,
  expiry: number
): string {
  return `${fromStrategy}|${toStrategy}|${amountUsdc}|${expiry}`;
}

/**
 * Sign a rebalance authorization token.
 * Throws if ADMIN_SOLVENCY_KEY is not configured — never falls back to empty key.
 */
export function signRebalanceToken(
  fromStrategy: string,
  toStrategy: string,
  amountUsdc: number,
  expiry: number
): string {
  const key = process.env.ADMIN_SOLVENCY_KEY;
  if (!key) throw new Error('ADMIN_SOLVENCY_KEY is not configured — cannot sign rebalance token');
  const payload = buildTokenPayload(fromStrategy, toStrategy, amountUsdc, expiry);
  return createHmac('sha256', key).update(payload).digest('hex');
}

/**
 * Verify a rebalance authorization token.
 * Returns false (fail closed) if ADMIN_SOLVENCY_KEY is absent, token is expired,
 * or the HMAC does not match. Never uses an empty or fallback key.
 */
export function verifyRebalanceToken(
  fromStrategy: string,
  toStrategy: string,
  amountUsdc: number,
  expiry: number,
  token: string
): boolean {
  const key = process.env.ADMIN_SOLVENCY_KEY;
  if (!key) return false;          // fail closed — no key configured
  if (Date.now() > expiry) return false;  // token expired
  const expected = createHmac('sha256', key)
    .update(buildTokenPayload(fromStrategy, toStrategy, amountUsdc, expiry))
    .digest('hex');
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ error: 'Unauthorized — valid operator session required' });
  }

  const {
    fromStrategy,
    toStrategy,
    amountUsdc,
    currentAaveApy,
    currentCamelotApy,
  } = req.body as {
    fromStrategy?:       string;
    toStrategy?:         string;
    amountUsdc?:         number;
    currentAaveApy?:     number;
    currentCamelotApy?:  number;
  };

  if (!fromStrategy || !toStrategy || !amountUsdc) {
    return res.status(400).json({ error: 'fromStrategy, toStrategy, and amountUsdc are required' });
  }
  if (fromStrategy !== 'aave_v3' && fromStrategy !== 'camelot') {
    return res.status(400).json({ error: 'fromStrategy must be aave_v3 or camelot' });
  }
  if (toStrategy !== 'aave_v3' && toStrategy !== 'camelot') {
    return res.status(400).json({ error: 'toStrategy must be aave_v3 or camelot' });
  }
  if (fromStrategy === toStrategy) {
    return res.status(400).json({ error: 'fromStrategy and toStrategy must differ' });
  }

  const sentinelResult = await evaluateTreasuryRebalance({
    fromStrategy:       fromStrategy as 'aave_v3' | 'camelot',
    toStrategy:         toStrategy   as 'aave_v3' | 'camelot',
    amountUsdc,
    currentAaveApy,
    currentCamelotApy,
  });

  if (!sentinelResult.authorized) {
    return res.status(403).json({
      authorized:       false,
      sentinelDecision: sentinelResult,
      error:            sentinelResult.plainLanguage,
    });
  }

  if (!process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(503).json({ error: 'ADMIN_SOLVENCY_KEY not configured — cannot issue token' });
  }

  const expiry = Date.now() + TOKEN_TTL_SECONDS * 1000;
  let token: string;
  try {
    token = signRebalanceToken(fromStrategy, toStrategy, amountUsdc, expiry);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(503).json({ error: msg });
  }

  return res.status(200).json({
    authorized:       true,
    sentinelDecision: sentinelResult,
    token,
    expiry,
    expiresIn:        TOKEN_TTL_SECONDS,
  });
}
