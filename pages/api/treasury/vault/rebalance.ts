/**
 * POST /api/treasury/vault/rebalance
 *
 * Step 2 of the two-step Sentinel-gated rebalance flow.
 *
 * Validates the Sentinel authorization token (+ nonce) issued by
 * POST /api/sentinel/rebalance-auth, marks the nonce consumed (one-time use),
 * then calls AxiomTreasuryVault.rebalance() on-chain.
 *
 * Body (JSON):
 *   fromStrategy  — 'aave_v3' | 'camelot'
 *   toStrategy    — 'aave_v3' | 'camelot'
 *   amountUsdc    — number
 *   token         — HMAC token from /api/sentinel/rebalance-auth
 *   nonce         — random nonce from /api/sentinel/rebalance-auth (one-time use)
 *   expiry        — token expiry timestamp (ms)
 *
 * Authorization:
 *   Operator session cookie (cap_operator_key) +
 *   Valid one-time Sentinel HMAC token from /api/sentinel/rebalance-auth.
 *
 * Security: nonce is tracked in-process (module-level Map). Each nonce can be
 * used exactly once — replay with a valid but already-consumed token is rejected
 * with 409 Conflict. Map entries are purged after their token TTL expires.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { verifyRebalanceToken } from '../../sentinel/rebalance-auth';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';

// ── One-time nonce tracking ────────────────────────────────────────────────
// Maps nonce → expiry (ms). Entries are purged lazily on each request once
// their TTL passes, keeping the Map bounded without a background timer.
const _consumedNonces = new Map<string, number>();

/**
 * Attempt to consume a nonce.
 * Returns true (nonce accepted + marked) or false (already consumed / missing).
 * Must be called BEFORE the on-chain transaction to prevent double-spend.
 */
function consumeNonce(nonce: string, expiry: number): boolean {
  const now = Date.now();
  for (const [k, exp] of _consumedNonces) {
    if (now > exp) _consumedNonces.delete(k);
  }
  if (_consumedNonces.has(nonce)) return false;
  _consumedNonces.set(nonce, expiry);
  return true;
}

// ── Environment ────────────────────────────────────────────────────────────
const VAULT_ADDRESS    = process.env.AXIOM_TREASURY_VAULT_ADDRESS   ?? '';
const AAVE_STRATEGY    = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS ?? '';
const CAMELOT_STRATEGY = process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS ?? '';
const RPC              = process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc';
const USDC             = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ADDRESS    = process.env.AXUSD_ADDRESS ?? '';

/** Map the caller-facing asset key to its on-chain token address. */
function resolveAssetAddress(asset: string): string {
  if (asset === 'usdc')  return USDC;
  if (asset === 'axusd') return AXUSD_ADDRESS;
  return '';
}

const VAULT_ABI = [
  'function rebalance(address fromStrategy, address toStrategy, address asset, uint256 amount) external',
];

function strategyAddress(key: 'aave_v3' | 'camelot'): string {
  return key === 'aave_v3' ? AAVE_STRATEGY : CAMELOT_STRATEGY;
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth check 1: operator session cookie ────────────────────────────────
  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ error: 'Unauthorized — valid operator session required' });
  }

  const { fromStrategy, toStrategy, amountUsdc, asset, token, nonce, expiry } = req.body as {
    fromStrategy?: string;
    toStrategy?:   string;
    amountUsdc?:   number;
    asset?:        string;
    token?:        string;
    nonce?:        string;
    expiry?:       number;
  };

  if (!fromStrategy || !toStrategy || !amountUsdc || !asset || !token || !nonce || !expiry) {
    return res.status(400).json({
      error: 'fromStrategy, toStrategy, amountUsdc, asset, token, nonce, and expiry are required. '
           + 'Obtain a one-time token from POST /api/sentinel/rebalance-auth.',
    });
  }

  if (asset !== 'usdc' && asset !== 'axusd') {
    return res.status(400).json({ error: 'asset must be usdc or axusd' });
  }
  const onChainAsset = resolveAssetAddress(asset);
  if (!onChainAsset) {
    return res.status(503).json({ error: `Asset address for ${asset} is not configured (check env vars)` });
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

  // ── Auth check 2: Sentinel HMAC token (includes nonce in payload) ─────────
  const tokenValid = verifyRebalanceToken(
    fromStrategy, toStrategy, amountUsdc, expiry, nonce, asset, token
  );
  if (!tokenValid) {
    return res.status(403).json({
      error: 'Sentinel authorization token is invalid or expired. '
           + 'Request a new token from POST /api/sentinel/rebalance-auth.',
    });
  }

  // ── Auth check 3: one-time nonce (anti-replay) ────────────────────────────
  const nonceAccepted = consumeNonce(nonce, expiry);
  if (!nonceAccepted) {
    return res.status(409).json({
      error: 'Rebalance token has already been used. '
           + 'Each authorization token is single-use — request a new one.',
    });
  }

  if (!VAULT_ADDRESS) {
    return res.status(200).json({
      success: true,
      txHash:  null,
      note:    'AXIOM_TREASURY_VAULT_ADDRESS not configured — on-chain call skipped',
    });
  }

  try {
    const provider  = new ethers.JsonRpcProvider(RPC);
    // rebalance() is gated by SENTINEL_EXECUTOR role on-chain.
    // The signing key must hold that role — use a dedicated key, NOT the deployer key.
    const sentinelKey = process.env.SENTINEL_EXECUTOR_PRIVATE_KEY;
    if (!sentinelKey) {
      return res.status(503).json({
        error: 'SENTINEL_EXECUTOR_PRIVATE_KEY is not configured. '
             + 'Set this to the private key of the address holding the '
             + 'SENTINEL_EXECUTOR role on AxiomTreasuryVault.',
      });
    }
    const signer    = new ethers.Wallet(sentinelKey, provider);
    const vault     = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    const amountWei = BigInt(Math.round(amountUsdc * 1e6));

    const tx = await vault.rebalance(
      strategyAddress(fromStrategy as 'aave_v3' | 'camelot'),
      strategyAddress(toStrategy   as 'aave_v3' | 'camelot'),
      onChainAsset,
      amountWei
    );
    const receipt = await tx.wait();

    await db.insert(treasuryVaultEvents).values({
      eventType:   'rebalance',
      strategy:    `${fromStrategy}→${toStrategy}`,
      amountUsd:   amountUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    0,
      blockNumber: receipt.blockNumber,
    });

    return res.status(200).json({
      success: true,
      txHash:  receipt.hash,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/treasury/vault/rebalance]', msg);
    return res.status(500).json({ success: false, error: 'On-chain rebalance failed', detail: msg });
  }
}
