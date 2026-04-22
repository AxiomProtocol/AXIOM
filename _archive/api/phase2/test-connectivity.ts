import type { NextApiRequest, NextApiResponse } from 'next';
import { testLandContractConnectivity, getPlatformStats } from '../../../lib/web3/landAcquisitionService';
import { getCreditTiers, testCreditContractConnectivity } from '../../../lib/web3/builderFarmerCreditService';
import { LAND_ACQUISITION_CONTRACTS } from '../../../shared/contracts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [landConnectivity, creditConnected, creditTiers, platformStats] = await Promise.all([
      testLandContractConnectivity(),
      testCreditContractConnectivity(),
      getCreditTiers(),
      getPlatformStats()
    ]);
    
    const allConnected = Object.values(landConnectivity).every(v => v) && creditConnected;

    return res.status(200).json({
      success: allConnected,
      contracts: {
        landOptionRegistry: {
          address: LAND_ACQUISITION_CONTRACTS.LAND_OPTION_REGISTRY,
          connected: landConnectivity.landOptionRegistry
        },
        landAcquisitionPool: {
          address: LAND_ACQUISITION_CONTRACTS.LAND_ACQUISITION_POOL,
          connected: landConnectivity.landAcquisitionPool
        },
        regCFCrowdfunding: {
          address: LAND_ACQUISITION_CONTRACTS.REG_CF_CROWDFUNDING,
          connected: landConnectivity.regCFCrowdfunding
        },
        builderFarmerCredit: {
          address: LAND_ACQUISITION_CONTRACTS.BUILDER_FARMER_CREDIT,
          connected: creditConnected
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
