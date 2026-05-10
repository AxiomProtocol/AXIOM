import { LIQUIDITY_POOLS } from './registry';
import type { LiquidityMetricDefinition } from './types';

export const LIQUIDITY_MONITORING_SCAFFOLD: LiquidityMetricDefinition[] = LIQUIDITY_POOLS.map((pool) => ({
  poolId: pool.id,
  metrics: pool.analyticsHooks.filter((hook): hook is LiquidityMetricDefinition['metrics'][number] => (
    hook === 'depth' ||
    hook === 'slippage' ||
    hook === 'price_deviation' ||
    hook === 'volume' ||
    hook === 'venue_health' ||
    hook === 'parity_sensitivity' ||
    hook === 'treasury_exposure' ||
    hook === 'pool_readiness'
  )),
  status: 'scaffolded',
  notes: pool.active
    ? 'Pool is marked active; wire live RPC/indexer reads before relying on metrics.'
    : 'Readiness scaffold only. No live deployment or indexer state is implied.',
}));

export function getLiquidityMonitoringScaffold(): LiquidityMetricDefinition[] {
  return LIQUIDITY_MONITORING_SCAFFOLD;
}

export function getPoolMonitoringScaffold(poolId: string): LiquidityMetricDefinition | undefined {
  return LIQUIDITY_MONITORING_SCAFFOLD.find((entry) => entry.poolId === poolId);
}
