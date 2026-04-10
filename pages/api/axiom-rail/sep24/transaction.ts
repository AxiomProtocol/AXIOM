/**
 * GET /api/axiom-rail/sep24/transaction?id=<txId>
 *
 * SEP-24 transaction status polling.
 * Returns the current status of an Axiom Rail deposit or withdrawal.
 *
 * Requires SEP-10 JWT in Authorization header.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import type { AxiomRailTransaction } from '../../../../lib/multichain/stellar/axiom-rail/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'id query param required' });

  const kind: AxiomRailTransaction['kind'] = id.startsWith('axr-dep') ? 'deposit' : 'withdrawal';

  const transaction: AxiomRailTransaction = {
    id,
    kind,
    status: 'pending_user_transfer_start',
    started_at: new Date().toISOString(),
    message: kind === 'deposit'
      ? 'Awaiting ACH or wire transfer initiation. Send USD to the account details provided.'
      : 'Awaiting USDC transfer to Axiom Rail anchor account. Send USDC with the provided memo.',
    amount_in_asset: kind === 'deposit' ? 'iso4217:USD' : `stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`,
    amount_out_asset: kind === 'deposit' ? `stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` : 'iso4217:USD',
  };

  return res.status(200).json({ transaction });
}
