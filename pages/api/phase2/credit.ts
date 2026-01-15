import type { NextApiRequest, NextApiResponse } from 'next';
import { getCreditTiers, getCreditStats, getCreditApplication, getCreditLoan } from '../../../lib/web3/builderFarmerCreditService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId, loanId, tiers } = req.query;

    if (tiers === 'true') {
      const creditTiers = await getCreditTiers();
      return res.status(200).json({ tiers: creditTiers });
    }

    if (applicationId) {
      const app = await getCreditApplication(Number(applicationId));
      if (!app) {
        return res.status(404).json({ error: 'Application not found' });
      }
      return res.status(200).json(app);
    }

    if (loanId) {
      const loan = await getCreditLoan(Number(loanId));
      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      return res.status(200).json(loan);
    }

    const stats = await getCreditStats();
    return res.status(200).json(stats);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch credit data' });
  }
}
