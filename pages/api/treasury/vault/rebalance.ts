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
 * Security: nonces are persisted in the `sentinel_rebalance_nonces` DB table.
 * The PRIMARY KEY on nonce provides a unique constraint enforced at the DB level,
 * giving cross-instance and cross-restart replay protection.  Expired rows are
 * pruned lazily before each insert.  Each nonce is single-use — replay with a
 * valid but already-consumed token is rejected with 409 Conflict.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { lt } from 'drizzle-orm';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';
import { verifyRebalanceToken } from '../../sentinel/rebalance-auth';
import { db } from '../../../../server/db';
import {
  classifyCamelotRoute,
  resolveCanonicalCamelotStrategyAddress,
} from '../../../../lib/axiom/camelotStrategyRoutes';
import {
  sentinelRebalanceNonces,
  treasuryVaultEvents,
} from '../../../../shared/treasuryVaultSchema';

/**
 * Persist a nonce to the DB, returning true if accepted (first use) or false
 * if already consumed (duplicate key) or expired.
 *
 * Uses the DB PRIMARY KEY constraint as the race-safe atomic gate:
 *   - Concurrent requests with the same nonce → exactly one INSERT succeeds.
 *   - ON CONFLICT → the loser gets a duplicate-key error → returns false.
 * Expired rows are pruned lazily before each insert.
 */
async function consumeNonceDb(nonce: string, expiry: number): Promise<boolean> {
  const expiresAt = new Date(expiry);
  if (expiresAt <= new Date()) return false; // already expired

  try {
    // Prune expired nonces lazily to bound table growth
    await db.delete(sentinelRebalanceNonces)
      .where(lt(sentinelRebalanceNonces.expiresAt, new Date()));

    await db.insert(sentinelRebalanceNonces).values({ nonce, expiresAt });
    return true;
  } catch {
    // Duplicate primary key → nonce already consumed
    return false;
  }
}

// ── Environment ────────────────────────────────────────────────────────────
const VAULT_ADDRESS    = process.env.AXIOM_TREASURY_VAULT_ADDRESS   ?? '';
const AAVE_STRATEGY    = process.env.AXIOM_AAVE_V3_STRATEGY_ADDRESS ?? '';
const RAW_CAMELOT_STRATEGY = process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS;
const CAMELOT_STRATEGY = resolveCanonicalCamelotStrategyAddress(process.env.AXIOM_CAMELOT_STRATEGY_ADDRESS);
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
const CAMELOT_PREFLIGHT_ABI = [
  'function tokenId() view returns (uint256)',
  'function positionManager() view returns (address)',
];

function strategyAddress(key: 'aave_v3' | 'camelot'): string {
  return key === 'aave_v3' ? AAVE_STRATEGY : CAMELOT_STRATEGY;
}

function camelotPreflightError(
  res: NextApiResponse,
  status: number,
  code: 'POSITION_MANAGER_NO_BYTECODE' | 'INVALID_TICK_SPACING' | 'POSITION_ALREADY_OPEN_WITHDRAW_FIRST',
  detail: string,
) {
  return res.status(status).json({
    success: false,
    error: code,
    detail,
  });
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

  const selectedCamelotRoute = fromStrategy === 'camelot' || toStrategy === 'camelot';
  if (selectedCamelotRoute) {
    const classifiedCamelotRoute = classifyCamelotRoute(RAW_CAMELOT_STRATEGY);
    if (classifiedCamelotRoute.deprecationCode === 'POSITION_MANAGER_NO_BYTECODE') {
      return camelotPreflightError(
        res,
        400,
        'POSITION_MANAGER_NO_BYTECODE',
        'Configured Camelot strategy route is deprecated (invalid Position Manager). Set AXIOM_CAMELOT_STRATEGY_ADDRESS to the canonical Camelot v3 strategy.',
      );
    }
    if (classifiedCamelotRoute.deprecationCode === 'INVALID_TICK_SPACING') {
      return camelotPreflightError(
        res,
        400,
        'INVALID_TICK_SPACING',
        'Configured Camelot strategy route is deprecated (invalid tick spacing). Set AXIOM_CAMELOT_STRATEGY_ADDRESS to the canonical Camelot v3 strategy.',
      );
    }
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
  // DB-backed: PRIMARY KEY on sentinel_rebalance_nonces enforces cross-instance
  // uniqueness.  consumeNonceDb returns false on duplicate key (already used).
  const nonceAccepted = await consumeNonceDb(nonce, expiry);
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

    if (toStrategy === 'camelot') {
      const camelot = new ethers.Contract(CAMELOT_STRATEGY, CAMELOT_PREFLIGHT_ABI, provider);
      const [tokenId, positionManager] = await Promise.all([
        camelot.tokenId() as Promise<bigint>,
        camelot.positionManager() as Promise<string>,
      ]);
      const bytecode = await provider.getCode(positionManager);
      if (!bytecode || bytecode === '0x') {
        return camelotPreflightError(
          res,
          400,
          'POSITION_MANAGER_NO_BYTECODE',
          'Camelot route preflight failed: position manager target has no bytecode.',
        );
      }
      if (tokenId > 0n) {
        return camelotPreflightError(
          res,
          409,
          'POSITION_ALREADY_OPEN_WITHDRAW_FIRST',
          'Camelot v3 route already has an open position. Recall/withdraw before reallocation.',
        );
      }
    }

    // rebalance() is gated by SENTINEL_EXECUTOR role on-chain.
    // The signing key must hold that role — use a dedicated key, NOT the deployer key.
    const sentinelKey = process.env.SENTINEL_EXECUTOR_PRIVATE_KEY
                     || process.env.DEPLOYER_PRIVATE_KEY
                     || process.env.DEPLOYER_PK;
    if (!sentinelKey) {
      return res.status(503).json({
        error: 'No executor key configured. Set SENTINEL_EXECUTOR_PRIVATE_KEY '
             + '(or DEPLOYER_PRIVATE_KEY as fallback) to the private key of the '
             + 'address holding the SENTINEL_EXECUTOR role on AxiomTreasuryVault.',
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

    // Use logIndex -1 as the dedicated sentinel value for manually-recorded events
    // so the (txHash, logIndex) unique constraint never collides with a real log index 0
    // emitted by the chain's event poller for the same transaction.
    await db.insert(treasuryVaultEvents).values({
      eventType:   'rebalance',
      strategy:    `${fromStrategy}→${toStrategy}`,
      amountUsd:   amountUsdc.toFixed(6),
      txHash:      receipt.hash,
      logIndex:    -1,
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
