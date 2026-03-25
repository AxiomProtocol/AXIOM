import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

/**
 * GET /api/erc3643/identity/check?wallet=0x...
 *
 * Returns a lightweight identity check result for a given wallet.
 * Used by the EVK Open Money Market borrow UI to gate interactions.
 * `registered` = wallet exists in the on-chain IdentityRegistry
 * `verified`   = wallet has verified KYC claims (isVerified flag)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required as ?wallet= query param' });
  }

  try {
    const status = await ERC3643Service.getIdentityStatus(wallet);
    return res.status(200).json({
      wallet,
      registered: !!(status as any).hasIdentity,
      verified: !!(status as any).isVerified,
      identityAddress: (status as any).identityAddr ?? null,
      country: (status as any).country ?? 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, registered: false, verified: false });
  }
}
