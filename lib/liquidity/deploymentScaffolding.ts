import { LIQUIDITY_ASSETS, LIQUIDITY_POOLS } from './registry';
import type { LiquidityDeploymentInput, LiquidityPoolDefinition } from './types';

const BASE_ENVIRONMENT_VARIABLES = [
  'ARBITRUM_RPC_URL',
  'ALCHEMY_API_KEY',
  'DEPLOYER_PRIVATE_KEY',
];

function feeLabel(pool: LiquidityPoolDefinition): string {
  if (pool.fee.valueBps === null) return pool.fee.status;
  return `${pool.fee.valueBps} bps`;
}

function buildInput(pool: LiquidityPoolDefinition): LiquidityDeploymentInput {
  const base = LIQUIDITY_ASSETS[pool.baseAsset];
  const quote = LIQUIDITY_ASSETS[pool.quoteAsset];

  return {
    poolId: pool.id,
    venue: pool.venue,
    chainId: 42161,
    baseAsset: pool.baseAsset,
    quoteAsset: pool.quoteAsset,
    requiredAddresses: [
      { label: pool.baseAsset, value: base.address, source: `LIQUIDITY_ASSETS.${pool.baseAsset}.address` },
      { label: pool.quoteAsset, value: quote.address, source: `LIQUIDITY_ASSETS.${pool.quoteAsset}.address` },
      { label: 'pool', value: pool.deploymentAddress, source: 'Set only after verified on-chain deployment' },
    ],
    recommendedParameters: [
      {
        label: 'fee_or_pool_type',
        value: feeLabel(pool),
        status: pool.status === 'blocked' ? 'blocked' : pool.fee.status === 'pending_venue_design' ? 'pending' : 'recommended',
      },
      {
        label: 'activation_flag',
        value: pool.activationFlag,
        status: pool.status === 'blocked' ? 'blocked' : 'pending',
      },
      {
        label: 'initial_price',
        value: pool.baseAsset === 'AXUSD' && pool.quoteAsset === 'USDC' ? '1 AXUSD = 1 USDC' : 'Pending treasury-approved initialization range',
        status: pool.status === 'blocked' ? 'blocked' : 'pending',
      },
    ],
    environmentVariables: [
      ...BASE_ENVIRONMENT_VARIABLES,
      `${pool.baseAsset}_TOKEN_ADDRESS`,
      `${pool.quoteAsset}_TOKEN_ADDRESS`,
      pool.activationFlag,
    ],
    preflightChecks: pool.readinessChecks,
    blockedUntil: pool.status === 'blocked'
      ? pool.readinessChecks
      : pool.launchPhase === 'phase_2'
        ? ['Phase 1 AXUSD/USDC Uniswap pool is live with real flow']
        : pool.launchPhase === 'phase_3'
          ? ['Phase 1 AXM/AXUSD Uniswap pool has mature price discovery']
          : [],
  };
}

export function getLiquidityDeploymentScaffolding(): LiquidityDeploymentInput[] {
  return LIQUIDITY_POOLS.map(buildInput);
}

export function getDeploymentScaffoldingForPool(poolId: string): LiquidityDeploymentInput | undefined {
  const pool = LIQUIDITY_POOLS.find((candidate) => candidate.id === poolId);
  return pool ? buildInput(pool) : undefined;
}
