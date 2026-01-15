import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { REAL_ESTATE_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DATA_FILE = path.join(process.cwd(), 'data', 'rent-streams.json');

const LEASE_RENT_ABI = [
  'function totalActiveLeases() view returns (uint256)',
  'function totalRentCollected() view returns (uint256)'
];

const REVENUE_ROUTER_ABI = [
  'function totalDistributed() view returns (uint256)'
];

function readStaticData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading rent streams data:', error);
    return null;
  }
}

async function fetchLiveBlockchainData() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    const leaseContract = new ethers.Contract(
      REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE,
      LEASE_RENT_ABI,
      provider
    );

    const revenueRouter = new ethers.Contract(
      AXUSD_INTEGRATION_CONTRACTS.REVENUE_ROUTER,
      REVENUE_ROUTER_ABI,
      provider
    );

    const [activeLeases, totalRent, totalDistributed] = await Promise.all([
      leaseContract.totalActiveLeases().catch(() => BigInt(0)),
      leaseContract.totalRentCollected().catch(() => BigInt(0)),
      revenueRouter.totalDistributed().catch(() => BigInt(0))
    ]);

    const totalRentUSD = parseFloat(ethers.formatUnits(totalRent, 18));
    const distributedUSD = parseFloat(ethers.formatUnits(totalDistributed, 18));

    return {
      live: true,
      activeLeases: Number(activeLeases),
      totalRentCollected: totalRentUSD,
      totalDistributed: distributedUSD,
      contractAddresses: {
        leaseEngine: REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE,
        revenueRouter: AXUSD_INTEGRATION_CONTRACTS.REVENUE_ROUTER
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Blockchain fetch error:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const staticData = readStaticData();
  
  if (!staticData) {
    return res.status(500).json({ error: 'Failed to load data' });
  }

  const liveData = await fetchLiveBlockchainData();

  if (liveData && (liveData.totalDistributed > 0 || liveData.activeLeases > 0)) {
    if (liveData.totalDistributed > 0) {
      staticData.stats.totalDistributed = liveData.totalDistributed;
    }
    if (liveData.totalRentCollected > 0) {
      staticData.stats.monthlyRentCollected = liveData.totalRentCollected / 12;
    }
    staticData.liveData = {
      source: 'blockchain',
      contracts: liveData.contractAddresses,
      lastUpdated: liveData.lastUpdated
    };
  } else {
    staticData.liveData = {
      source: 'static',
      note: 'Blockchain data unavailable, showing representative data',
      lastUpdated: new Date().toISOString()
    };
  }

  return res.json({ success: true, ...staticData });
}
