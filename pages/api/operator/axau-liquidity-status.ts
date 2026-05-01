/**
 * GET /api/operator/axau-liquidity-status
 *
 * AXAU Phase 2B — Liquidity Layer Foundation API
 *
 * Returns the live AXAU liquidity state: implied price, deviation from gold,
 * arbitrage classification, simulated swap routes (AXUSD→AXAU, USDC→AXAU),
 * and overall liquidity health.
 *
 * Read-only. Does NOT modify any settlement, mint/redeem, or contract state.
 *
 * Auth: cap_operator_key session cookie or x-admin-key header.
 * Cache: no-store — always fresh data.
 *
 * Optional query params:
 *   ?axusdIn=N   — override AXUSD route input size (USD)
 *   ?usdcIn=N    — override USDC route input size (USD)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isValidOperatorKey,
  readOperatorCookie,
  OPERATOR_HEADER_KEY,
} from '../../../lib/capinfra/operatorAuth';
import { getAXAULiquidityState } from '../../../lib/axau/liquidityEngine';
import type { AXAULiquidityState } from '../../../lib/axau/liquidityEngine';

function parsePositiveNumber(v: string | string[] | undefined): number | undefined {
  if (typeof v !== 'string') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AXAULiquidityState | { error: string }>,
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
    const axusdIn = parsePositiveNumber(req.query.axusdIn);
    const usdcIn  = parsePositiveNumber(req.query.usdcIn);
    const state   = await getAXAULiquidityState({ axusdInUsd: axusdIn, usdcInUsd: usdcIn });
    return res.status(200).json(state);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[axau-liquidity-status] Unexpected error:', msg);
    return res.status(500).json({ error: `Liquidity status failed: ${msg}` });
  }
}
