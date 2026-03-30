import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  ACTIVE_AXUSD,
  ACTIVE_PSM,
  EULER_AXUSD,
  EULER_PSM,
  CANONICAL_PSM,
} from '../../../src/config/activeContracts.generated';

const CANONICAL_PSM_ABI = [
  'function axusd() view returns (address)',
  'function collateral() view returns (address)',
  'function identityRegistry() view returns (address)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function feesAccrued() view returns (uint256)',
  'function availableLiquidity() view returns (uint256)',
  'function availableCapacity() view returns (uint256)',
];

const LEGACY_PSM_ABI = [
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
];

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function readCanonicalPsm(provider: ethers.JsonRpcProvider) {
  const psm  = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_ABI, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const axusd = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);

  const [
    axusdAddr, collateralAddr, registryAddr,
    ceilingRaw, debtRaw, mintFeeRaw, redeemFeeRaw,
    paused, ownerAddr, feesRaw, liquidityRaw, capacityRaw,
    usdcBalRaw, axusdSupplyRaw,
  ] = await Promise.all([
    psm.axusd(),
    psm.collateral(),
    psm.identityRegistry(),
    psm.debtCeiling(),
    psm.debtOutstanding(),
    psm.mintFee(),
    psm.redeemFee(),
    psm.paused(),
    psm.owner(),
    psm.feesAccrued(),
    psm.availableLiquidity(),
    psm.availableCapacity(),
    usdc.balanceOf(CANONICAL_PSM),
    axusd.totalSupply(),
  ]);

  const ceilNum   = parseFloat(ethers.formatUnits(ceilingRaw, 18));
  const debtNum   = parseFloat(ethers.formatUnits(debtRaw, 18));
  const liqNum    = parseFloat(ethers.formatUnits(liquidityRaw, 6));
  const capNum    = parseFloat(ethers.formatUnits(capacityRaw, 18));
  const usdcNum   = parseFloat(ethers.formatUnits(usdcBalRaw, 6));
  const feesNum   = parseFloat(ethers.formatUnits(feesRaw, 6));
  const supplyNum = parseFloat(ethers.formatUnits(axusdSupplyRaw, 18));
  const util      = ceilNum > 0 ? (debtNum / ceilNum) * 100 : 0;
  const pegRatio  = supplyNum > 0 ? usdcNum / supplyNum : 0;

  return {
    label: 'Canonical PSM (ERC-3643)',
    psm: CANONICAL_PSM,
    axusd: axusdAddr,
    collateral: collateralAddr,
    identityRegistry: registryAddr,
    owner: ownerAddr,
    usdcReserves: usdcNum.toFixed(3),
    availableLiquidity: liqNum.toFixed(3),
    feesAccrued: feesNum.toFixed(6),
    axusdSupply: supplyNum.toFixed(2),
    debtCeiling: ceilNum.toFixed(0),
    debtOutstanding: debtNum.toFixed(2),
    availableCapacity: capNum.toFixed(2),
    utilizationPct: util.toFixed(2),
    mintFee: Number(mintFeeRaw),
    redeemFee: Number(redeemFeeRaw),
    mintFeePct: `${(Number(mintFeeRaw) / 100).toFixed(2)}%`,
    redeemFeePct: `${(Number(redeemFeeRaw) / 100).toFixed(2)}%`,
    paused,
    pegRatio: pegRatio.toFixed(6),
    pegRatioPct: `${(pegRatio * 100).toFixed(4)}%`,
    deployedAt: '2026-03-30',
  };
}

async function readLegacyPsm(
  provider: ethers.JsonRpcProvider,
  psmAddress: string,
  axusdAddress: string,
  label: string
) {
  const psm  = new ethers.Contract(psmAddress, LEGACY_PSM_ABI, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const axusd = new ethers.Contract(axusdAddress, ERC20_ABI, provider);

  const [
    axusdAddr, collateralAddr,
    ceilingRaw, mintFeeRaw, redeemFeeRaw,
    paused, usdcBalRaw, axusdSupplyRaw,
  ] = await Promise.all([
    psm.axusd().catch(() => axusdAddress),
    psm.collateral().catch(() => USDC_ADDRESS),
    psm.debtCeiling().catch(() => BigInt(0)),
    psm.mintFee().catch(() => BigInt(0)),
    psm.redeemFee().catch(() => BigInt(0)),
    psm.paused().catch(() => false),
    usdc.balanceOf(psmAddress).catch(() => BigInt(0)),
    axusd.totalSupply().catch(() => BigInt(0)),
  ]);

  const usdcNum   = parseFloat(ethers.formatUnits(usdcBalRaw, 6));
  const supplyNum = parseFloat(ethers.formatUnits(axusdSupplyRaw, 18));
  const ceilNum   = parseFloat(ethers.formatUnits(ceilingRaw, 18));
  const pegRatio  = supplyNum > 0 ? usdcNum / supplyNum : 0;

  return {
    label,
    psm: psmAddress,
    axusd: axusdAddr,
    collateral: collateralAddr,
    usdcReserves: usdcNum.toFixed(3),
    axusdSupply: supplyNum.toFixed(2),
    debtCeiling: ceilNum.toFixed(0),
    mintFee: Number(mintFeeRaw),
    redeemFee: Number(redeemFeeRaw),
    mintFeePct: `${(Number(mintFeeRaw) / 100).toFixed(2)}%`,
    redeemFeePct: `${(Number(redeemFeeRaw) / 100).toFixed(2)}%`,
    paused,
    pegRatio: pegRatio.toFixed(6),
    pegRatioPct: `${(pegRatio * 100).toFixed(4)}%`,
    deprecated: true,
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
    const provider = new ethers.JsonRpcProvider(
      `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
    );

    const [canonical, primary, euler] = await Promise.all([
      readCanonicalPsm(provider),
      readLegacyPsm(provider, ACTIVE_PSM, '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', 'GENIUS PSM (Legacy)'),
      readLegacyPsm(provider, EULER_PSM, EULER_AXUSD, 'Euler PSM (Deprecated)'),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        canonical,
        primary,
        euler,
        network: {
          chainId: 42161,
          name: 'Arbitrum One',
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
}
