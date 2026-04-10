/**
 * POST /api/axiom-rail/sep24/deposit
 *
 * SEP-24 interactive deposit — user sends USD to Axiom Rail via ACH/Wire
 * and receives USDC/AXUSD/AXAU on their Stellar or Arbitrum wallet.
 *
 * Returns a URL to the interactive web flow where the user provides
 * their payment details and initiates the bank transfer.
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
import { verifyRailJwt } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_ASSETS = ['USDC', 'AXUSD', 'AXAU'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'sep24/deposit', { max: 20, windowMs: 60_000 })) return;

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const {
    asset_code,
    account: stellarAccount,
    amount,
    memo,
    memo_type,
  } = req.body as {
    asset_code?: string;
    account?: string;
    amount?: string;
    memo?: string;
    memo_type?: string;
  };

  if (!asset_code || !SUPPORTED_ASSETS.includes(asset_code.toUpperCase())) {
    return res.status(400).json({
      error: `asset_code must be one of: ${SUPPORTED_ASSETS.join(', ')}`,
    });
  }

  const destAccount = stellarAccount ?? account;
  if (!destAccount) return res.status(400).json({ error: 'account required' });

  const txId = `axr-dep-${uuidv4()}`;

  const interactiveUrl = new URL(
    `/axiom-rail/deposit`,
    `https://${process.env.NEXT_PUBLIC_APP_URL ?? 'axiomprotocol.app'}`
  );
  interactiveUrl.searchParams.set('id', txId);
  interactiveUrl.searchParams.set('account', destAccount);
  interactiveUrl.searchParams.set('asset', asset_code.toUpperCase());
  if (amount) interactiveUrl.searchParams.set('amount', amount);
  if (memo) interactiveUrl.searchParams.set('memo', memo);
  if (memo_type) interactiveUrl.searchParams.set('memo_type', memo_type);

  return res.status(200).json({
    type: 'interactive_customer_info_needed',
    url: interactiveUrl.toString(),
    id: txId,
  });
}
