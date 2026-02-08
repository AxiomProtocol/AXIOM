import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { REAL_ESTATE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DATA_FILE = path.join(process.cwd(), 'data', 'rent-streams.json');

const CAPITAL_POOLS_ABI = [
  'function totalValueLocked() view returns (uint256)',
  'function poolCount() view returns (uint256)'
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

    const capitalPoolsContract = new ethers.Contract(
      REAL_ESTATE_CONTRACTS.CAPITAL_POOLS,
      CAPITAL_POOLS_ABI,
      provider
    );

    const results = await Promise.allSettled([
      capitalPoolsContract.totalValueLocked(),
      capitalPoolsContract.poolCount()
    ]);

    const tvl = results[0].status === 'fulfilled' ? results[0].value : BigInt(0);
    const poolCount = results[1].status === 'fulfilled' ? results[1].value : BigInt(0);

    const hasLiveData = results.some(r => r.status === 'fulfilled' && r.value > 0n);

    return {
      live: hasLiveData,
      totalValueLocked: parseFloat(ethers.formatUnits(tvl, 18)),
      poolCount: Number(poolCount),
      contractAddresses: {
        capitalPools: REAL_ESTATE_CONTRACTS.CAPITAL_POOLS
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

  if (liveData && liveData.live && liveData.totalValueLocked > 0) {
    staticData.stats = {
      ...staticData.stats,
      totalPropertyValue: liveData.totalValueLocked
    };
    staticData.liveData = {
      source: 'blockchain',
      contracts: liveData.contractAddresses,
      lastUpdated: liveData.lastUpdated
    };
  } else {
    staticData.liveData = {
      source: 'static',
      note: 'Blockchain data unavailable or zero, showing representative data',
      lastUpdated: new Date().toISOString()
    };
  }

  return res.json({ success: true, ...staticData });
}
