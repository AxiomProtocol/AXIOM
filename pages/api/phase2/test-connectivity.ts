import type { NextApiRequest, NextApiResponse } from 'next';
import { testContractConnectivity, getCreditTiers, getPlatformStats } from '../../../lib/web3/landAcquisitionService';
import { LAND_ACQUISITION_CONTRACTS } from '../../../shared/contracts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const connectivity = await testContractConnectivity();
    const creditTiers = await getCreditTiers();
    const platformStats = await getPlatformStats();
    
    const allConnected = Object.values(connectivity).every(v => v);

    return res.status(200).json({
      success: allConnected,
      contracts: {
        landOptionRegistry: {
          address: LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY,
          connected: connectivity.landOptionRegistry
        },
        landAcquisitionPool: {
          address: LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL,
          connected: connectivity.landAcquisitionPool
        },
        regCFCrowdfunding: {
          address: LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING,
          connected: connectivity.regCFCrowdfunding
        },
        builderFarmerCredit: {
          address: LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
          connected: connectivity.builderFarmerCredit
        }
      },
      creditTiers,
      platformStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Connectivity test error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to test contract connectivity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
