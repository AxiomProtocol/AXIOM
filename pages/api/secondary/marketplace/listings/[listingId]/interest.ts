import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession, ensureSecInvestor } from '../../../../../../server/services/secondary/auth';
import { submitBuyerInterest } from '../../../../../../server/services/secondary/marketplace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

  let investorId = session.investorId;
  if (!investorId) investorId = await ensureSecInvestor(session.walletAddress);

  const { listingId } = req.query as { listingId: string };
  const { intendedUnits, message } = req.body;

  try {
    const interestId = await submitBuyerInterest({ listingId, buyerId: investorId, intendedUnits, message });
    return res.status(201).json({ success: true, interestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
