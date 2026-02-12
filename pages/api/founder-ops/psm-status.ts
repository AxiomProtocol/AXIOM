import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM } from '../../../src/config/activeContracts.generated';

const PSM_ABI = [
  'function axusd() view returns (address)',
  'function collateral() view returns (address)',
  'function debtCeiling() view returns (uint256)',
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function paused() view returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function readPsm(provider: ethers.JsonRpcProvider, psmAddress: string, axusdAddress: string) {
  const psm = new ethers.Contract(psmAddress, PSM_ABI, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const axusd = new ethers.Contract(axusdAddress, ERC20_ABI, provider);

  const [
    axusdAddr,
    collateralAddr,
    debtCeilingRaw,
    mintFeeRaw,
    redeemFeeRaw,
    paused,
    usdcBalanceRaw,
    axusdSupplyRaw,
  ] = await Promise.all([
    psm.axusd(),
    psm.collateral(),
    psm.debtCeiling(),
    psm.mintFee(),
    psm.redeemFee(),
    psm.paused(),
    usdc.balanceOf(psmAddress),
    axusd.totalSupply(),
  ]);

  const mintFee = Number(mintFeeRaw);
  const redeemFee = Number(redeemFeeRaw);
  const usdcReserves = ethers.formatUnits(usdcBalanceRaw, 6);
  const axusdSupply = ethers.formatUnits(axusdSupplyRaw, 18);
  const debtCeiling = ethers.formatUnits(debtCeilingRaw, 18);

  const reservesNum = parseFloat(usdcReserves);
  const supplyNum = parseFloat(axusdSupply);
  const pegRatio = supplyNum > 0 ? reservesNum / supplyNum : 0;

  return {
    psm: psmAddress,
    axusd: axusdAddr,
    collateral: collateralAddr,
    usdcReserves: reservesNum.toFixed(3),
    axusdSupply: supplyNum.toFixed(2),
    debtCeiling: parseFloat(debtCeiling).toFixed(0),
    mintFee,
    redeemFee,
    paused,
    mintFeePct: `${(mintFee / 100).toFixed(2)}%`,
    redeemFeePct: `${(redeemFee / 100).toFixed(2)}%`,
    pegRatio: pegRatio.toFixed(6),
    pegRatioPct: `${(pegRatio * 100).toFixed(4)}%`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return res.status(500).json({ success: false, error: 'ALCHEMY_API_KEY not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`);

    const [primary, euler] = await Promise.all([
      readPsm(provider, ACTIVE_PSM, ACTIVE_AXUSD),
      readPsm(provider, EULER_PSM, EULER_AXUSD),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        primary,
        euler,
        network: {
          chainId: 42161,
          name: 'Arbitrum One',
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
