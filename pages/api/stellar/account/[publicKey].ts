/**
 * GET /api/stellar/account/:publicKey
 *
 * Returns Stellar account information for a given public key.
 * Includes balances, trustlines, and USDC balance if applicable.
 * Public endpoint — used for pre-flight trustline checks.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStellarPaymentAdapter } from '../../../../lib/multichain/stellar/StellarPaymentAdapter';

const CIRCLE_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { publicKey } = req.query;
  if (typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'Invalid publicKey' });
  }

  // Basic Stellar public key validation (G... 56 chars)
  if (!publicKey.match(/^G[A-Z2-7]{55}$/)) {
    return res.status(400).json({ error: 'Invalid Stellar public key format. Must start with G and be 56 characters.' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const adapter = getStellarPaymentAdapter('mainnet');
  const accountInfo = await adapter.getAccountInfo(publicKey);

  const usdcBalance = accountInfo.balances.find(
    b => b.asset.code === 'USDC' && b.asset.issuer === CIRCLE_USDC_ISSUER
  );

  const hasTrustline = !!usdcBalance;

  return res.status(200).json({
    publicKey,
    exists: accountInfo.exists,
    hasTrustline,
    usdcBalance: usdcBalance?.balance ?? '0',
    xlmBalance: accountInfo.balances.find(b => b.asset.isNative)?.balance ?? '0',
    allBalances: accountInfo.balances,
    sequenceNumber: accountInfo.sequenceNumber,
    asOf: new Date().toISOString(),
    note: hasTrustline
      ? 'Account has USDC trustline. Ready to receive USDC from Circle anchor.'
      : accountInfo.exists
        ? 'Account exists but does not have a USDC trustline. Trustline must be established before receiving USDC.'
        : 'Account not found on Stellar network. Account must be funded (minimum 1 XLM) before use.',
  });
}
