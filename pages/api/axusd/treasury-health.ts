import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';
import { CANONICAL_PSM } from '../../../src/config/activeContracts.generated';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

const CANONICAL_PSM_ABI = [
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
  'function feesAccrued() view returns (uint256)',
  'function availableLiquidity() view returns (uint256)',
  'function paused() view returns (bool)',
];

const LEGACY_PSM_ABI = [
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)',
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

    const axusd         = new ethers.Contract(ERC3643_CONTRACTS.AXUSD_TOKEN, ERC20_ABI, provider);
    const usdc          = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const canonicalPsm  = new ethers.Contract(CANONICAL_PSM, CANONICAL_PSM_ABI, provider);
    const legacyPsm     = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.PSM, LEGACY_PSM_ABI, provider);

    const [
      axusdTotalSupply,
      // Canonical PSM reserves
      canonicalUsdcBalance,
      canonicalLiquidity,
      canonicalCeiling,
      canonicalDebt,
      canonicalFees,
      canonicalPaused,
      // Legacy PSM reserves (still valid collateral for solvency)
      legacyPsmUsdc,
      legacyCeiling,
      legacyDebt,
      // Backstop
      backstopUsdcBalance,
    ] = await Promise.all([
      axusd.totalSupply(),
      usdc.balanceOf(CANONICAL_PSM).catch(() => BigInt(0)),
      canonicalPsm.availableLiquidity().catch(() => BigInt(0)),
      canonicalPsm.debtCeiling().catch(() => BigInt(0)),
      canonicalPsm.debtOutstanding().catch(() => BigInt(0)),
      canonicalPsm.feesAccrued().catch(() => BigInt(0)),
      canonicalPsm.paused().catch(() => false),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => BigInt(0)),
      legacyPsm.debtCeiling().catch(() => BigInt(0)),
      legacyPsm.debtOutstanding().catch(() => BigInt(0)),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => BigInt(0)),
    ]);

    const totalSupplyNum    = parseFloat(ethers.formatUnits(axusdTotalSupply, 18));
    const canonicalUsdcNum  = parseFloat(ethers.formatUnits(canonicalUsdcBalance, 6));
    const canonicalLiqNum   = parseFloat(ethers.formatUnits(canonicalLiquidity, 6));
    const canonicalCeilNum  = parseFloat(ethers.formatUnits(canonicalCeiling, 18));
    const canonicalDebtNum  = parseFloat(ethers.formatUnits(canonicalDebt, 18));
    const canonicalFeesNum  = parseFloat(ethers.formatUnits(canonicalFees, 6));
    const legacyUsdcNum     = parseFloat(ethers.formatUnits(legacyPsmUsdc, 6));
    const legacyCeilNum     = parseFloat(ethers.formatUnits(legacyCeiling, 18));
    const legacyDebtNum     = parseFloat(ethers.formatUnits(legacyDebt, 18));
    const backstopNum       = parseFloat(ethers.formatUnits(backstopUsdcBalance, 6));

    // Canonical AXUSD mint/redeem backing is sourced from the Canonical PSM only.
    // Legacy PSM + backstop balances are tracked here as supplemental/internal balances.
    const canonicalReserves = canonicalUsdcNum;
    const supplementalReserves = legacyUsdcNum + backstopNum;
    const totalTrackedReserves = canonicalReserves + supplementalReserves;
    const reserveRatio      = totalSupplyNum > 0 ? (canonicalReserves / totalSupplyNum) * 100 : 100;

    // Utilization rates
    const canonicalUtil     = canonicalCeilNum > 0 ? (canonicalDebtNum / canonicalCeilNum) * 100 : 0;
    const legacyUtil        = legacyCeilNum > 0 ? (legacyDebtNum / legacyCeilNum) * 100 : 0;

    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    let healthScore: number;

    if (reserveRatio >= 100 && canonicalUtil < 50) {
      healthStatus = 'excellent'; healthScore = 100;
    } else if (reserveRatio >= 100 && canonicalUtil < 80) {
      healthStatus = 'good'; healthScore = 85;
    } else if (reserveRatio >= 95 || canonicalUtil < 95) {
      healthStatus = 'warning'; healthScore = 60;
    } else {
      healthStatus = 'critical'; healthScore = 30;
    }

    const stressTests = {
      scenario1: {
        name: '10% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.1,
        reservesAfter: canonicalReserves - (totalSupplyNum * 0.1),
        canHandle: canonicalReserves >= totalSupplyNum * 0.1,
        newReserveRatio: totalSupplyNum > 0
          ? ((canonicalReserves - totalSupplyNum * 0.1) / (totalSupplyNum * 0.9)) * 100 : 100,
      },
      scenario2: {
        name: '25% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.25,
        reservesAfter: canonicalReserves - (totalSupplyNum * 0.25),
        canHandle: canonicalReserves >= totalSupplyNum * 0.25,
        newReserveRatio: totalSupplyNum > 0
          ? ((canonicalReserves - totalSupplyNum * 0.25) / (totalSupplyNum * 0.75)) * 100 : 100,
      },
      scenario3: {
        name: '50% Redemption Wave',
        redemptionAmount: totalSupplyNum * 0.5,
        reservesAfter: canonicalReserves - (totalSupplyNum * 0.5),
        canHandle: canonicalReserves >= totalSupplyNum * 0.5,
        newReserveRatio: totalSupplyNum > 0
          ? ((canonicalReserves - totalSupplyNum * 0.5) / (totalSupplyNum * 0.5)) * 100 : 100,
      },
    };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSupply: totalSupplyNum.toFixed(2),
          totalReserves: canonicalReserves.toFixed(2),
          reserveRatio: reserveRatio.toFixed(2),
          healthStatus,
          healthScore,
          fullyBacked: reserveRatio >= 100,
        },
        backingMethodology: {
          officialBackingSource: 'Canonical PSM only',
          canonicalReserves: canonicalReserves.toFixed(6),
          supplementalInternalReserves: supplementalReserves.toFixed(6),
          totalTrackedReserves: totalTrackedReserves.toFixed(6),
          treasuryVaultIncluded: false,
          tokenizedTreasurySleevesLive: false,
          note: 'Legacy PSM balances and backstop balances are tracked for internal monitoring but are not reported here as the live canonical mint/redeem reserve source for AXUSD.',
        },
        reservePools: {
          canonical: {
            label: 'Canonical PSM (ERC-3643)',
            address: CANONICAL_PSM,
            usdcTotal: canonicalUsdcNum.toFixed(6),
            usdcLiquid: canonicalLiqNum.toFixed(6),
            feesAccrued: canonicalFeesNum.toFixed(6),
            debtCeiling: canonicalCeilNum.toFixed(2),
            debtOutstanding: canonicalDebtNum.toFixed(2),
            utilization: canonicalUtil.toFixed(2),
            paused: canonicalPaused,
          },
          legacy: {
            label: 'Legacy PSM USDC (Internal / migrating)',
            address: AXUSD_GENIUS_CONTRACTS.PSM,
            usdcReserves: legacyUsdcNum.toFixed(6),
            debtCeiling: legacyCeilNum.toFixed(2),
            debtOutstanding: legacyDebtNum.toFixed(2),
            utilization: legacyUtil.toFixed(2),
            deprecated: true,
            migrating: true,
            note: 'Supplemental/internal balance only. Not the live canonical reserve controller.',
          },
          backstop: {
            label: 'Backstop Vault (USDC, internal support)',
            address: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
            usdcReserves: backstopNum.toFixed(6),
            note: 'Internal support balance. Not the canonical mint/redeem sleeve.',
          },
        },
        stressTests,
        riskIndicators: {
          concentrationRisk: canonicalReserves > 0 && legacyUsdcNum > canonicalReserves ? 'elevated_legacy_overhang' : 'low',
          liquidityRisk: canonicalUtil > 80 ? 'elevated' : 'low',
          pegRisk: 'low',
        },
        contracts: {
          axusd: ERC3643_CONTRACTS.AXUSD_TOKEN,
          canonicalPsm: CANONICAL_PSM,
          legacyPsm: AXUSD_GENIUS_CONTRACTS.PSM,
          backstop: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[treasury-health] error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch treasury health',
      details: error.message,
    });
  }
}
