/**
 * GET /api/credit/history?walletAddress=0x...
 *
 * Returns all credit draw and repayment records for a participant's
 * credit line (stored in stellar_payment_transfers with corridorId 'usd-credit-draw-axiom').
 *
 * SIWE-authenticated.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { stellarPaymentTransfers } from '../../../shared/stellarSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }

  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only access your own history' });
  }

  const records = await db
    .select({
      id: stellarPaymentTransfers.id,
      initiatedAt: stellarPaymentTransfers.initiatedAt,
      sourceAmountAxusd: stellarPaymentTransfers.sourceAmountAxusd,
      corridorId: stellarPaymentTransfers.corridorId,
      status: stellarPaymentTransfers.status,
      anchorRawResponse: stellarPaymentTransfers.anchorRawResponse,
    })
    .from(stellarPaymentTransfers)
    .where(
      and(
        eq(stellarPaymentTransfers.axiomWalletAddress, wallet),
        eq(stellarPaymentTransfers.corridorId, 'usd-credit-draw-axiom'),
      ),
    )
    .orderBy(desc(stellarPaymentTransfers.initiatedAt))
    .limit(50);

  return res.status(200).json({ records });
}
