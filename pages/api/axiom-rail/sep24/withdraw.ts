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
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  verifyRailJwt,
  AXIOM_RAIL_DEPOSIT_ACCOUNT,
} from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_ASSETS = ['USDC', 'AXUSD', 'AXAU'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
  interactiveUrl.searchParams.set('token', token);

  return res.status(200).json({
    type: 'interactive_customer_info_needed',
    url: interactiveUrl.toString(),
    id: txId,
    withdraw_anchor_account: AXIOM_RAIL_DEPOSIT_ACCOUNT,
    memo,
    memo_type: 'text',
  });
}
