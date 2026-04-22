import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, AXUSD_GENIUS_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DATA_FILE = path.join(process.cwd(), 'data', 'high-yield-savings.json');

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

const AXUSD_ABI = [
  'function totalSupply() view returns (uint256)'
];

function readStaticData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading savings data:', error);
    return null;
  }
}

async function fetchLiveBlockchainData() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    const fixFlipVault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
      VAULT_ABI,
      provider
    );

    const dscrVault = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
      VAULT_ABI,
      provider
    );

    const axusdToken = new ethers.Contract(
      AXUSD_GENIUS_CONTRACTS.AXUSD,
      AXUSD_ABI,
      provider
    );

    const results = await Promise.allSettled([
      fixFlipVault.totalAssets(),
      dscrVault.totalAssets(),
      axusdToken.totalSupply()
    ]);

    const fixFlipAssets = results[0].status === 'fulfilled' ? results[0].value : BigInt(0);
    const dscrAssets = results[1].status === 'fulfilled' ? results[1].value : BigInt(0);
    const axusdSupply = results[2].status === 'fulfilled' ? results[2].value : BigInt(0);

    const hasLiveData = results.some(r => r.status === 'fulfilled' && r.value > 0n);

    const totalVaultAssets = parseFloat(ethers.formatUnits(fixFlipAssets, 18)) + 
                             parseFloat(ethers.formatUnits(dscrAssets, 18));
    const axusdCirculating = parseFloat(ethers.formatUnits(axusdSupply, 18));

    return {
      live: hasLiveData,
      totalDeposits: totalVaultAssets,
      axusdCirculating: axusdCirculating,
      contractAddresses: {
        fixFlipVault: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
        dscrVault: REALESTATE_LENDING_CONTRACTS.DSCR_POOL_VAULT,
        axusd: AXUSD_GENIUS_CONTRACTS.AXUSD
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

  if (liveData && liveData.live && liveData.totalDeposits > 0) {
    staticData.stats = {
      ...staticData.stats,
      totalDeposits: liveData.totalDeposits
    };
    staticData.liveData = {
      source: 'blockchain',
      axusdCirculating: liveData.axusdCirculating,
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
