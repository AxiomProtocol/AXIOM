import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { REALESTATE_LENDING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DATA_FILE = path.join(process.cwd(), 'data', 'mortgage-notes.json');

const FIXFLIP_VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

const FIXFLIP_MANAGER_ABI = [
  'function loanCount() view returns (uint256)',
  'function totalActiveLoans() view returns (uint256)',
  'function totalLockedCapital() view returns (uint256)'
];

function readStaticData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading mortgage notes data:', error);
    return null;
  }
}

async function fetchLiveBlockchainData() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);

    const vaultContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
      FIXFLIP_VAULT_ABI,
      provider
    );

    const managerContract = new ethers.Contract(
      REALESTATE_LENDING_CONTRACTS.FIXFLIP_MANAGER,
      FIXFLIP_MANAGER_ABI,
      provider
    );

    const [totalAssets, totalSupply, loanCount, activeLoans, lockedCapital] = await Promise.all([
      vaultContract.totalAssets().catch(() => BigInt(0)),
      vaultContract.totalSupply().catch(() => BigInt(0)),
      managerContract.loanCount().catch(() => BigInt(0)),
      managerContract.totalActiveLoans().catch(() => BigInt(0)),
      managerContract.totalLockedCapital().catch(() => BigInt(0))
    ]);

    const totalAssetsUSD = parseFloat(ethers.formatUnits(totalAssets, 18));
    const lockedCapitalUSD = parseFloat(ethers.formatUnits(lockedCapital, 18));

    return {
      live: true,
      totalNotesValue: totalAssetsUSD,
      activeNotes: Number(activeLoans),
      totalLoansOriginated: Number(loanCount),
      lockedCapital: lockedCapitalUSD,
      contractAddresses: {
        vault: REALESTATE_LENDING_CONTRACTS.FIXFLIP_VAULT,
        manager: REALESTATE_LENDING_CONTRACTS.FIXFLIP_MANAGER
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

  if (liveData && liveData.totalNotesValue > 0) {
    staticData.stats = {
      ...staticData.stats,
      totalNotesValue: liveData.totalNotesValue,
      activeNotes: liveData.activeNotes || staticData.stats.activeNotes,
      lockedCapital: liveData.lockedCapital
    };
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
