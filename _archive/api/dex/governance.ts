import type { NextApiRequest, NextApiResponse } from 'next';
import dexService from '../../../server/services/dex/DexService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proposalId, active } = req.query;

    if (active === 'true') {
      const proposals = await dexService.getActiveProposals();
      return res.status(200).json({ proposals, count: proposals.length });
    }

    if (proposalId) {
      const proposal = await dexService.getGovernanceProposal(Number(proposalId));
      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }
      return res.status(200).json({ proposal });
    }

    const proposalCount = await dexService.getGovernanceProposalCount();
    return res.status(200).json({ proposalCount });
  } catch (error) {
    console.error('Error fetching governance data:', error);
    return res.status(500).json({ error: 'Failed to fetch governance data' });
  }
}
