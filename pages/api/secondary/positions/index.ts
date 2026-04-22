import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession, ensureSecInvestor } from '../../../../server/services/secondary/auth';
import { getInvestorPositions } from '../../../../server/services/secondary/positions';
import { emitAnalyticsEvent } from '../../../../server/services/secondary/analytics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

  let investorId = session.investorId;
  if (!investorId) investorId = await ensureSecInvestor(session.walletAddress);

  try {
    const positions = await getInvestorPositions(investorId);
    await emitAnalyticsEvent({ investorId, eventType: 'position_viewed', actorType: 'investor' });
    return res.status(200).json({ success: true, positions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
