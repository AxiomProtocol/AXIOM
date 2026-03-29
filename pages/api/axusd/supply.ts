import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { AXUSD_GENIUS_CONTRACTS, CORE_CONTRACTS } from '../../../shared/contracts';
import { ACTIVE_AXUSD, LEGACY_GENIUS_AXUSD, EULER_AXUSD } from '../../../src/config/activeContracts.generated';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    // Canonical ERC-3643 Unified AXUSD supply tracking
    const axusdContract = new ethers.Contract(ERC3643_CONTRACTS.AXUSD_TOKEN, ERC20_ABI, provider);

    const [totalSupplyRaw, decimals, backstopBalanceRaw, treasuryBalanceRaw] = await Promise.all([
      axusdContract.totalSupply(),
      axusdContract.decimals(),
      // ERC-3643 token balance at backstop — PSM holds legacy GENIUS AXUSD, not ERC-3643
      axusdContract.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => BigInt(0)),
      axusdContract.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => BigInt(0))
    ]);

    const totalSupply = parseFloat(ethers.formatUnits(totalSupplyRaw, decimals));
    const backstopBalance = parseFloat(ethers.formatUnits(backstopBalanceRaw, decimals));
    const treasuryBalance = parseFloat(ethers.formatUnits(treasuryBalanceRaw, decimals));
    
    const lockedSupply = backstopBalance + treasuryBalance;
    const circulatingSupply = Math.max(0, totalSupply - lockedSupply);

    res.json({
      success: true,
      data: {
        totalSupply: totalSupply.toFixed(2),
        circulatingSupply: circulatingSupply.toFixed(2),
        lockedSupply: lockedSupply.toFixed(2),
        breakdown: {
          backstopReserve: backstopBalance.toFixed(2),
          treasuryReserve: treasuryBalance.toFixed(2)
        },
        maxSupply: '1000000000',
        decimals: Number(decimals),
        contractAddress: ERC3643_CONTRACTS.AXUSD_TOKEN,
        activeAxusd: ACTIVE_AXUSD,
        legacyGeniusAxusd: LEGACY_GENIUS_AXUSD,
        eulerAxusd: EULER_AXUSD,
        note: 'Supply tracks canonical ERC-3643 Unified AXUSD. Legacy GENIUS AXUSD (0x73585df5) is deprecated.',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('AXUSD supply API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AXUSD supply data',
      details: error.message
    });
  }
}
