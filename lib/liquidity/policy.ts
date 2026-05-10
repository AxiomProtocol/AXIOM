import { LIQUIDITY_POOLS } from './registry';
import type { LiquidityPoolDefinition, LiquidityTreasuryPolicy } from './types';

export const LIQUIDITY_TREASURY_POLICY: LiquidityTreasuryPolicy = {
  deepestPoolAtLaunch: 'axusd-usdc-uniswap-v3',
  controlledSmallerPoolAtLaunch: 'axm-axusd-uniswap-v3',
  noAllocationToNonCorePoolsAtLaunch: true,
  axusdParityDefensePriority: 'highest',
  fragmentationAvoidance: 'strict',
  secondaryVenueActivationRequiresReadinessChecks: true,
  launchSequence: [
    {
      phase: 'phase_1',
      label: 'Uniswap core launch',
      poolIds: ['axusd-usdc-uniswap-v3', 'axm-axusd-uniswap-v3'],
      activationCondition: 'Only these two pools receive launch treasury allocation.',
    },
    {
      phase: 'phase_2',
      label: 'Curve stable-depth expansion',
      poolIds: ['axusd-usdc-curve'],
      activationCondition: 'AXUSD/USDC Uniswap is live, healthy, and showing real flow.',
    },
    {
      phase: 'phase_3',
      label: 'Selective AXM venue evaluation',
      poolIds: ['axm-axusd-balancer-weighted'],
      activationCondition: 'AXM has mature Uniswap price discovery and Balancer improves quality without fragmenting liquidity.',
    },
    {
      phase: 'conditional_axau',
      label: 'AXAU public-market gate',
      poolIds: ['axau-axusd-uniswap-v3'],
      activationCondition: 'Every AXAU compatibility gate is affirmative and governance approval is recorded.',
    },
  ],
  allocationRules: [
    'AXUSD/USDC on Uniswap is the deepest launch pool.',
    'AXM/AXUSD on Uniswap is smaller than AXUSD/USDC and sized for controlled price discovery.',
    'No treasury allocation goes to non-core launch pools.',
    'AXUSD is the quote and settlement spine wherever internal routing permits.',
    'AXM/USDC is not approved unless a future governance review documents a clear need.',
  ],
  expansionRules: [
    'Curve follows Uniswap only after AXUSD has measurable flow and stable parity behavior.',
    'Balancer remains an AXM-only evaluation path until AXM matures.',
    'Camelot is deferred and must prove Arbitrum-native distribution value without liquidity fragmentation.',
    'Secondary venue activation requires explicit readiness checks and operator visibility.',
  ],
  blockedRules: [
    'AXAU public AMM deployment is blocked until compatibility gates pass.',
    'Do not deploy generic AXAU pools when ERC-3643 identity gates or holder restrictions can break swaps.',
    'Do not list shallow pools across multiple venues before the core pair has durable depth.',
  ],
};

export function getLiquidityPolicy(): LiquidityTreasuryPolicy {
  return LIQUIDITY_TREASURY_POLICY;
}

export function getLaunchPoolIds(): string[] {
  return LIQUIDITY_TREASURY_POLICY.launchSequence
    .find((phase) => phase.phase === 'phase_1')
    ?.poolIds ?? [];
}

export function listLaunchPools(): LiquidityPoolDefinition[] {
  const ids = new Set(getLaunchPoolIds());
  return LIQUIDITY_POOLS.filter((pool) => ids.has(pool.id));
}

export function listBlockedLiquidityRules(): string[] {
  return LIQUIDITY_TREASURY_POLICY.blockedRules;
}
