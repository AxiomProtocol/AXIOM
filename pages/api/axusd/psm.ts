import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CANONICAL_PSM, ACTIVE_AXUSD, ACTIVE_PSM, EULER_PSM, LEGACY_GENIUS_AXUSD, EULER_AXUSD } from '../../../src/config/activeContracts.generated';
import { STABLECOINS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

const CANONICAL_PSM_ABI = [
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  'function feesAccrued() view returns (uint256)',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
  'function availableLiquidity() view returns (uint256)',
  'function availableCapacity() view returns (uint256)',
];

const LEGACY_PSM_ABI = [
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  'function paused() view returns (bool)',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const usdc = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const axusdCanonical = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);
    const canonicalPsm = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_ABI, provider);
    const legacyPsm = new ethers.Contract(ACTIVE_PSM, LEGACY_PSM_ABI, provider);

    const [
      // Canonical PSM
      canonicalMintFee,
      canonicalRedeemFee,
      canonicalCeiling,
      canonicalDebt,
      canonicalFees,
      canonicalPaused,
      canonicalOwner,
      canonicalLiquidity,
      canonicalCapacity,
      canonicalUsdcBalance,
      canonicalAxusdSupply,
      // Legacy PSM (GENIUS)
      legacyMintFee,
      legacyRedeemFee,
      legacyCeiling,
      legacyDebt,
      legacyPaused,
      legacyUsdcBalance,
    ] = await Promise.all([
      canonicalPsm.mintFee().catch(() => BigInt(10)),
      canonicalPsm.redeemFee().catch(() => BigInt(10)),
      canonicalPsm.debtCeiling().catch(() => BigInt(0)),
      canonicalPsm.debtOutstanding().catch(() => BigInt(0)),
      canonicalPsm.feesAccrued().catch(() => BigInt(0)),
      canonicalPsm.paused().catch(() => false),
      canonicalPsm.owner().catch(() => ''),
      canonicalPsm.availableLiquidity().catch(() => BigInt(0)),
      canonicalPsm.availableCapacity().catch(() => BigInt(0)),
      usdc.balanceOf(CANONICAL_PSM).catch(() => BigInt(0)),
      axusdCanonical.totalSupply().catch(() => BigInt(0)),
      legacyPsm.mintFee().catch(() => BigInt(0)),
      legacyPsm.redeemFee().catch(() => BigInt(0)),
      legacyPsm.debtCeiling().catch(() => BigInt(0)),
      legacyPsm.debtOutstanding().catch(() => BigInt(0)),
      legacyPsm.paused().catch(() => false),
      usdc.balanceOf(ACTIVE_PSM).catch(() => BigInt(0)),
    ]);

    const canonicalSupplyNum = parseFloat(ethers.formatUnits(canonicalAxusdSupply, 18));
    const canonicalDebtNum   = parseFloat(ethers.formatUnits(canonicalDebt, 18));
    const canonicalCeilNum   = parseFloat(ethers.formatUnits(canonicalCeiling, 18));
    const canonicalLiqNum    = parseFloat(ethers.formatUnits(canonicalLiquidity, 6));
    const canonicalCapNum    = parseFloat(ethers.formatUnits(canonicalCapacity, 18));
    const canonicalUsdcNum   = parseFloat(ethers.formatUnits(canonicalUsdcBalance, 6));
    const canonicalFeesNum   = parseFloat(ethers.formatUnits(canonicalFees, 6));
    const canonicalUtil      = canonicalCeilNum > 0 ? (canonicalDebtNum / canonicalCeilNum) * 100 : 0;

    const legacyUsdcNum  = parseFloat(ethers.formatUnits(legacyUsdcBalance, 6));
    const legacyCeilNum  = parseFloat(ethers.formatUnits(legacyCeiling, 18));
    const legacyDebtNum  = parseFloat(ethers.formatUnits(legacyDebt, 18));

    res.json({
      success: true,
      data: {
        canonical: {
          address: CANONICAL_PSM,
          axusdToken: ACTIVE_AXUSD,
          label: 'Canonical PSM (ERC-3643)',
          deployedAt: '2026-03-30',
          mintFee: Number(canonicalMintFee),
          redeemFee: Number(canonicalRedeemFee),
          mintFeePct: (Number(canonicalMintFee) / 100).toFixed(2) + '%',
          redeemFeePct: (Number(canonicalRedeemFee) / 100).toFixed(2) + '%',
          debtCeiling: canonicalCeilNum.toFixed(2),
          debtOutstanding: canonicalDebtNum.toFixed(2),
          utilizationPct: canonicalUtil.toFixed(2),
          availableCapacity: canonicalCapNum.toFixed(2),
          usdcReserves: canonicalUsdcNum.toFixed(6),
          availableLiquidity: canonicalLiqNum.toFixed(6),
          feesAccrued: canonicalFeesNum.toFixed(6),
          canonicalAxusdSupply: canonicalSupplyNum.toFixed(2),
          paused: canonicalPaused,
          owner: canonicalOwner,
          agentRegistered: false,
          note: 'PSM deployed. Requires addAgent() on AXUSD token before mint/redeem are live.',
        },
        legacy: {
          address: ACTIVE_PSM,
          axusdToken: LEGACY_GENIUS_AXUSD,
          label: 'Legacy PSM USDC (Migrating)',
          mintFee: Number(legacyMintFee),
          redeemFee: Number(legacyRedeemFee),
          mintFeePct: (Number(legacyMintFee) / 100).toFixed(2) + '%',
          redeemFeePct: (Number(legacyRedeemFee) / 100).toFixed(2) + '%',
          debtCeiling: legacyCeilNum.toFixed(2),
          debtOutstanding: legacyDebtNum.toFixed(2),
          usdcReserves: legacyUsdcNum.toFixed(6),
          paused: legacyPaused,
          deprecated: true,
          migrating: true,
          note: 'Legacy GENIUS PSM USDC (Migrating) — USDC reserves retained for solvency accounting; no new issuance via this PSM.',
        },
        eulerPsm: {
          address: EULER_PSM,
          axusdToken: EULER_AXUSD,
          label: 'Euler PSM USDC (Deprecated)',
          deprecated: true,
          migrating: false,
          note: 'Paired with original AxiomStable. Fully deprecated.',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[psm.ts] error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PSM data',
      details: error.message,
    });
  }
}
