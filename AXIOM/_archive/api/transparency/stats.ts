import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, NETWORK_CONFIG, DEFI_UTILITY_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_ARBITRUM_URL || NETWORK_CONFIG.rpcUrl;

const AXM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)"
];

const STAKING_ABI = [
  "function totalStaked() external view returns (uint256)"
];

const TREASURY_ABI = [
  "function getBalance(address token) external view returns (uint256)",
  "function totalRevenue() external view returns (uint256)"
];

const NODE_ABI = [
  "function totalNodesStaked() external view returns (uint256)"
];

const formatUSD = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    
    const axmContract = new ethers.Contract(CORE_CONTRACTS.AXM_TOKEN, AXM_TOKEN_ABI, provider);
    const stakingContract = new ethers.Contract(CORE_CONTRACTS.STAKING_EMISSIONS, STAKING_ABI, provider);
    const treasuryContract = new ethers.Contract(CORE_CONTRACTS.TREASURY_REVENUE, TREASURY_ABI, provider);
    const nodeContract = new ethers.Contract(DEFI_UTILITY_CONTRACTS.DEPIN_NODES, NODE_ABI, provider);

    const axmPrice = 0.001;
    const ethPrice = 3500;

    const [
      treasuryAxmBalance,
      treasuryEthBalance,
      totalStaked,
      totalNodesStaked,
      axmTotalSupply
    ] = await Promise.all([
      axmContract.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => BigInt(0)),
      provider.getBalance(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => BigInt(0)),
      stakingContract.totalStaked().catch(() => BigInt(0)),
      nodeContract.totalNodesStaked().catch(() => BigInt(0)),
      axmContract.totalSupply().catch(() => BigInt(0))
    ]);

    const treasuryAxmUsd = parseFloat(ethers.formatEther(treasuryAxmBalance)) * axmPrice;
    const treasuryEthUsd = parseFloat(ethers.formatEther(treasuryEthBalance)) * ethPrice;
    const treasuryTotalUsd = treasuryAxmUsd + treasuryEthUsd;
    
    const stakingTvlAxm = parseFloat(ethers.formatEther(totalStaked));
    const stakingTvlUsd = stakingTvlAxm * axmPrice;

    const nodesTvlAxm = Number(totalNodesStaked) * 5000;
    const nodesTvlUsd = nodesTvlAxm * axmPrice;

    const totalSecuredUsd = treasuryTotalUsd + stakingTvlUsd + nodesTvlUsd;

    res.status(200).json({
      success: true,
      treasuryBalance: formatUSD(treasuryTotalUsd),
      treasuryBreakdown: {
        axm: {
          amount: ethers.formatEther(treasuryAxmBalance),
          usd: formatUSD(treasuryAxmUsd)
        },
        eth: {
          amount: ethers.formatEther(treasuryEthBalance),
          usd: formatUSD(treasuryEthUsd)
        }
      },
      stakingTVL: formatUSD(stakingTvlUsd),
      stakingDetails: {
        totalStakedAxm: stakingTvlAxm.toFixed(2),
        stakersCount: 'N/A'
      },
      nodesTVL: formatUSD(nodesTvlUsd),
      nodesDetails: {
        totalNodes: Number(totalNodesStaked),
        totalStakedAxm: nodesTvlAxm
      },
      totalSecured: formatUSD(totalSecuredUsd),
      tokenMetrics: {
        totalSupply: ethers.formatEther(axmTotalSupply),
        price: axmPrice,
        marketCap: formatUSD(parseFloat(ethers.formatEther(axmTotalSupply)) * axmPrice)
      },
      contractAddresses: {
        treasury: CORE_CONTRACTS.TREASURY_REVENUE,
        staking: CORE_CONTRACTS.STAKING_EMISSIONS,
        axmToken: CORE_CONTRACTS.AXM_TOKEN,
        nodes: DEFI_UTILITY_CONTRACTS.DEPIN_NODES
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transparency stats error:', error);
    res.status(200).json({
      success: false,
      treasuryBalance: '$0',
      stakingTVL: '$0',
      nodesTVL: '$0',
      totalSecured: '$0',
      error: 'Failed to fetch live data',
      lastUpdated: new Date().toISOString()
    });
  }
}
