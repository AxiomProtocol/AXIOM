import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

const PSM_ABI = [
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)'
];

const COMPLIANCE_ABI = [
  'function getComplianceStatus() view returns (bool isCompliant, uint256 reserveRatio, uint256 lastAuditTimestamp)',
  'function minimumReserveRatio() view returns (uint256)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    // Canonical ERC-3643 Unified AXUSD — supply is the protocol liability figure
    const axusd = new ethers.Contract(ERC3643_CONTRACTS.AXUSD_TOKEN, ERC20_ABI, provider);
    const usdc = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const psm = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.PSM, PSM_ABI, provider);

    const [
      axusdTotalSupply,
      psmUsdcBalance,
      backstopUsdcBalance,
      debtCeiling,
      debtOutstanding
    ] = await Promise.all([
      axusd.totalSupply(),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => BigInt(0)),
      psm.debtCeiling(),
      psm.debtOutstanding()
    ]);

    const totalSupplyNum = parseFloat(ethers.formatEther(axusdTotalSupply));
    const psmReserveNum = parseFloat(ethers.formatUnits(psmUsdcBalance, 6));
    const backstopReserveNum = parseFloat(ethers.formatUnits(backstopUsdcBalance, 6));
    const debtCeilingNum = parseFloat(ethers.formatEther(debtCeiling));
    const debtOutstandingNum = parseFloat(ethers.formatEther(debtOutstanding));

    const totalReserves = psmReserveNum + backstopReserveNum;
    const reserveRatio = totalSupplyNum > 0 ? (totalReserves / totalSupplyNum) * 100 : 100;
    const debtUtilization = debtCeilingNum > 0 ? (debtOutstandingNum / debtCeilingNum) * 100 : 0;
    const availableCapacity = debtCeilingNum - debtOutstandingNum;

    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    let healthScore: number;
    
    if (reserveRatio >= 100 && debtUtilization < 50) {
      healthStatus = 'excellent';
      healthScore = 100;
    } else if (reserveRatio >= 100 && debtUtilization < 80) {
      healthStatus = 'good';
      healthScore = 85;
    } else if (reserveRatio >= 95 || debtUtilization < 95) {
      healthStatus = 'warning';
      healthScore = 60;
    } else {
      healthStatus = 'critical';
      healthScore = 30;
    }

    const stressTests = {
      scenario1: {
        name: '10% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.1,
        reservesAfter: totalReserves - (totalSupplyNum * 0.1),
        canHandle: totalReserves >= totalSupplyNum * 0.1,
        newReserveRatio: totalSupplyNum > 0 ? ((totalReserves - (totalSupplyNum * 0.1)) / (totalSupplyNum * 0.9)) * 100 : 100
      },
      scenario2: {
        name: '25% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.25,
        reservesAfter: totalReserves - (totalSupplyNum * 0.25),
        canHandle: totalReserves >= totalSupplyNum * 0.25,
        newReserveRatio: totalSupplyNum > 0 ? ((totalReserves - (totalSupplyNum * 0.25)) / (totalSupplyNum * 0.75)) * 100 : 100
      },
      scenario3: {
        name: '50% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.5,
        reservesAfter: totalReserves - (totalSupplyNum * 0.5),
        canHandle: totalReserves >= totalSupplyNum * 0.5,
        newReserveRatio: totalSupplyNum > 0 ? ((totalReserves - (totalSupplyNum * 0.5)) / (totalSupplyNum * 0.5)) * 100 : 100
      }
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSupply: totalSupplyNum.toFixed(2),
          totalReserves: totalReserves.toFixed(2),
          reserveRatio: reserveRatio.toFixed(2),
          healthStatus,
          healthScore,
          geniusCompliant: reserveRatio >= 100
        },
        reserves: {
          psmUsdc: psmReserveNum.toFixed(2),
          backstopUsdc: backstopReserveNum.toFixed(2),
          tbillValue: '0.00'
        },
        capacity: {
          debtCeiling: debtCeilingNum.toFixed(2),
          debtOutstanding: debtOutstandingNum.toFixed(2),
          debtUtilization: debtUtilization.toFixed(2),
          availableCapacity: availableCapacity.toFixed(2)
        },
        stressTests,
        riskIndicators: {
          concentrationRisk: psmReserveNum > totalReserves * 0.9 ? 'high' : 'low',
          liquidityRisk: debtUtilization > 80 ? 'elevated' : 'low',
          pegRisk: 'low'
        },
        contracts: {
          axusd: ERC3643_CONTRACTS.AXUSD_TOKEN,
          psm: AXUSD_GENIUS_CONTRACTS.PSM,
          backstop: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
          compliance: AXUSD_GENIUS_CONTRACTS.GENIUS_COMPLIANCE
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Treasury Health API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treasury health',
      details: error.message
    });
  }
}
