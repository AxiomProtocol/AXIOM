import { describe, expect, it } from 'vitest';
import {
  evaluateAxauPublicAmmReadiness,
  getLiquidityAsset,
  getLiquidityPolicy,
  listLiquidityPools,
  listLiquidityPoolsByPhase,
  listLiquidityVenues,
} from '../lib/liquidity';

describe('canonical liquidity registry', () => {
  it('keeps the first wave limited to AXUSD/USDC and AXM/AXUSD on Uniswap', () => {
    const phaseOnePools = listLiquidityPoolsByPhase('phase_1');

    expect(phaseOnePools.map((pool) => pool.id).sort()).toEqual([
      'axm-axusd-uniswap-v3',
      'axusd-usdc-uniswap-v3',
    ]);
    expect(phaseOnePools.every((pool) => pool.venue === 'uniswap-v3')).toBe(true);
  });

  it('does not configure AXM/USDC as a launch pool', () => {
    const axmUsdcPools = listLiquidityPools().filter((pool) => (
      (pool.baseAsset === 'AXM' && pool.quoteAsset === 'USDC') ||
      (pool.baseAsset === 'USDC' && pool.quoteAsset === 'AXM')
    ));

    expect(axmUsdcPools).toEqual([]);
  });

  it('sets AXUSD/USDC as the deepest launch pool and AXM/AXUSD as smaller controlled liquidity', () => {
    const policy = getLiquidityPolicy();
    const pools = new Map(listLiquidityPools().map((pool) => [pool.id, pool]));

    expect(policy.deepestPoolAtLaunch).toBe('axusd-usdc-uniswap-v3');
    expect(policy.controlledSmallerPoolAtLaunch).toBe('axm-axusd-uniswap-v3');
    expect(pools.get(policy.deepestPoolAtLaunch)?.treasuryPriority).toBe('highest');
    expect(pools.get(policy.deepestPoolAtLaunch)?.targetDepthPriority).toBe('deepest_launch_pool');
    expect(pools.get(policy.controlledSmallerPoolAtLaunch)?.targetDepthPriority).toBe('controlled_smaller_pool');
  });

  it('delays Curve and Balancer beyond phase 1', () => {
    const pools = new Map(listLiquidityPools().map((pool) => [pool.id, pool]));
    const venues = new Map(listLiquidityVenues().map((venue) => [venue.id, venue]));

    expect(pools.get('axusd-usdc-curve')?.launchPhase).toBe('phase_2');
    expect(pools.get('axm-axusd-balancer-weighted')?.status).toBe('evaluation');
    expect(venues.get('curve')?.firstWavePermitted).toBe(false);
    expect(venues.get('balancer')?.firstWavePermitted).toBe(false);
  });

  it('blocks AXAU public AMM deployment by default', () => {
    const axau = getLiquidityAsset('AXAU');
    const axauPool = listLiquidityPools().find((pool) => pool.id === 'axau-axusd-uniswap-v3');
    const decision = evaluateAxauPublicAmmReadiness();

    expect(axau.publicAmmTradingPermitted).toBe(false);
    expect(axau.restrictedTransferLogicExists).toBe(true);
    expect(axau.wrapperRequired).toBe(true);
    expect(axauPool?.status).toBe('blocked');
    expect(decision.approved).toBe(false);
    expect(decision.status).toBe('no_go');
    expect(decision.blockingReasons.length).toBeGreaterThan(0);
  });
});
