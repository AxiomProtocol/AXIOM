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
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
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

    const [
      fixFlipAssets,
      dscrAssets,
      axusdTotalSupply
    ] = await Promise.all([
      fixFlipVault.totalAssets().catch(() => BigInt(0)),
      dscrVault.totalAssets().catch(() => BigInt(0)),
      axusdToken.totalSupply().catch(() => BigInt(0))
    ]);

    const totalVaultAssets = parseFloat(ethers.formatUnits(fixFlipAssets, 18)) + 
                             parseFloat(ethers.formatUnits(dscrAssets, 18));
    const axusdSupply = parseFloat(ethers.formatUnits(axusdTotalSupply, 18));

    const utilizationRate = totalVaultAssets > 0 ? 
      Math.min(95, (totalVaultAssets / (totalVaultAssets * 1.3)) * 100) : 0;

    return {
      live: true,
      totalDeposits: totalVaultAssets,
      axusdCirculating: axusdSupply,
      utilizationRate: utilizationRate.toFixed(1),
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

  if (liveData && liveData.totalDeposits > 0) {
    staticData.stats = {
      ...staticData.stats,
      totalDeposits: liveData.totalDeposits,
      utilizationRate: parseFloat(liveData.utilizationRate)
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
      note: 'Blockchain data unavailable, showing representative data',
      lastUpdated: new Date().toISOString()
    };
  }

  return res.json({ success: true, ...staticData });
}
