import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../../lib/services/ERC3643Service';

interface IdentityStatusResult {
  wallet: string;
  isVerified: boolean;
  hasIdentity: boolean;
  identityAddress: string | null;
  country: number;
  verificationLevel: number;
  status: string;
  claims: unknown[];
}

/**
 * GET /api/erc3643/identity/check?wallet=0x...
 *
 * Lightweight identity eligibility check for the EVK Open Money Market borrow UI.
 * `registered` = wallet exists in the on-chain IdentityRegistry (hasIdentity)
 * `verified`   = wallet has passed KYC (isVerified flag)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { wallet } = req.query;
  if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Valid wallet address required as ?wallet= query param' });
  }

  try {
    const result = await ERC3643Service.getIdentityStatus(wallet) as IdentityStatusResult;

    return res.status(200).json({
      wallet,
      registered: result.hasIdentity,
      verified: result.isVerified,
      identityAddress: result.identityAddress,
      country: result.country,
      verificationLevel: result.verificationLevel,
      status: result.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, registered: false, verified: false });
  }
}
