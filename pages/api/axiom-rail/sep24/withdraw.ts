/**
 * POST /api/axiom-rail/sep24/withdraw
 *
 * SEP-24 interactive withdrawal — user sends USDC/AXUSD/AXAU on Stellar
 * to Axiom Rail and receives USD in their bank account via ACH or wire.
 *
 * Returns a URL to the interactive web flow where the user provides
 * their bank account details, plus the Stellar account to send USDC to.
 *
 * Requires SEP-10 JWT in Authorization header.
 *
 * Security:
 *  - Open CORS required: any Stellar wallet app must be able to initiate.
 *  - The SEP-10 JWT is NOT included in the interactive URL — the wallet
 *    must deliver it to the interactive page via window.postMessage.
 *  - Rate limited: 20 initiations per IP per minute.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  verifyRailJwt,
  AXIOM_RAIL_DEPOSIT_ACCOUNT,
} from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_ASSETS = ['USDC', 'AXUSD', 'AXAU'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'sep24/withdraw', { max: 20, windowMs: 60_000 })) return;

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const { asset_code, amount } = req.body as { asset_code?: string; amount?: string };

  if (!asset_code || !SUPPORTED_ASSETS.includes(asset_code.toUpperCase())) {
    return res.status(400).json({
      error: `asset_code must be one of: ${SUPPORTED_ASSETS.join(', ')}`,
    });
  }

  const txId = `axr-wdr-${uuidv4()}`;
  const memo = txId.replace('axr-wdr-', '').slice(0, 28).toUpperCase();

  const interactiveUrl = new URL(
    `/axiom-rail/withdraw`,
    `https://${process.env.NEXT_PUBLIC_APP_URL ?? 'axiomprotocol.app'}`
  );
  interactiveUrl.searchParams.set('id', txId);
  interactiveUrl.searchParams.set('account', account);
  interactiveUrl.searchParams.set('asset', asset_code.toUpperCase());
  if (amount) interactiveUrl.searchParams.set('amount', amount);
  interactiveUrl.searchParams.set('anchor_account', AXIOM_RAIL_DEPOSIT_ACCOUNT);
  interactiveUrl.searchParams.set('memo', memo);

  return res.status(200).json({
    type: 'interactive_customer_info_needed',
    url: interactiveUrl.toString(),
    id: txId,
    withdraw_anchor_account: AXIOM_RAIL_DEPOSIT_ACCOUNT,
    memo,
    memo_type: 'text',
  });
}
