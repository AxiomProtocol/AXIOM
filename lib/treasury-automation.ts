import { camelotPoolService, PoolData, LPIncentive as PoolLPIncentive } from './services/CamelotPoolService';

export interface LiquidityPool {
  id: string;
  name: string;
  token0: string;
  token1: string;
  tvl: number;
  apr: number;
  volume24h: number;
  fees24h: number;
  yourLiquidity: number;
  yourShare: number;
}

export interface TreasuryOperation {
  id: string;
  type: 'deposit' | 'withdraw' | 'swap' | 'bridge' | 'stake' | 'unstake';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  amount: number;
  token: string;
  destination?: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'threshold' | 'event';
    config: Record<string, any>;
  };
  action: {
    type: 'rebalance' | 'harvest' | 'compound' | 'alert' | 'bridge';
    config: Record<string, any>;
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface BridgeRoute {
  id: string;
  fromChain: string;
  toChain: string;
  token: string;
  estimatedTime: string;
  fee: number;
  available: boolean;
}

export interface LPIncentive {
  poolId: string;
  poolName: string;
  baseApr: number;
  boostApr: number;
  totalApr: number;
  axmRewards: number;
  duration: string;
  eligibleTvl?: number;
}

const automationRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Daily Yield Harvest',
    description: 'Automatically harvest yields from all LP positions daily',
    trigger: { type: 'schedule', config: { interval: '24h', time: '00:00' } },
    action: { type: 'harvest', config: { pools: ['all'], minAmount: 10 } },
    enabled: true,
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    nextRun: new Date(Date.now() + 86400000).toISOString()
  },
  {
    id: '2',
    name: 'Auto-Compound Rewards',
    description: 'Reinvest harvested rewards into LP positions',
    trigger: { type: 'threshold', config: { metric: 'pendingRewards', value: 100 } },
    action: { type: 'compound', config: { targetPool: 'axusd-usdc' } },
    enabled: true
  },
  {
    id: '3',
    name: 'Rebalance Alert',
    description: 'Alert when pool allocation drifts more than 10% from target',
    trigger: { type: 'threshold', config: { metric: 'allocationDrift', value: 10 } },
    action: { type: 'alert', config: { severity: 'warning', channels: ['dashboard', 'email'] } },
    enabled: true
  },
  {
    id: '4',
    name: 'Cross-Chain Bridge',
    description: 'Bridge excess AXUSD to Ethereum mainnet weekly',
    trigger: { type: 'schedule', config: { interval: '7d', time: '12:00' } },
    action: { type: 'bridge', config: { token: 'AXUSD', destination: 'ethereum', minAmount: 5000 } },
    enabled: false
  }
];

const bridgeRoutes: BridgeRoute[] = [
  { id: 'arb-eth', fromChain: 'Arbitrum One', toChain: 'Ethereum', token: 'AXUSD', estimatedTime: '~15 min', fee: 0.1, available: true },
  { id: 'arb-base', fromChain: 'Arbitrum One', toChain: 'Base', token: 'AXUSD', estimatedTime: '~5 min', fee: 0.05, available: true },
  { id: 'arb-op', fromChain: 'Arbitrum One', toChain: 'Optimism', token: 'AXUSD', estimatedTime: '~5 min', fee: 0.05, available: true },
  { id: 'arb-poly', fromChain: 'Arbitrum One', toChain: 'Polygon', token: 'AXUSD', estimatedTime: '~10 min', fee: 0.08, available: false }
];

const operations: TreasuryOperation[] = [];

export async function getLiquidityPoolsAsync(userAddress?: string): Promise<LiquidityPool[]> {
  try {
    const pools = await camelotPoolService.getAllPools(userAddress);
    return pools.map(pool => ({
      id: pool.id,
      name: pool.name,
      token0: pool.token0,
      token1: pool.token1,
      tvl: pool.tvl,
      apr: pool.apr,
      volume24h: pool.volume24h,
      fees24h: pool.fees24h,
      yourLiquidity: pool.yourLiquidity,
      yourShare: pool.yourShare
    }));
  } catch (error) {
    console.error('Error fetching liquidity pools from blockchain:', error);
    return [];
  }
}

export function getLiquidityPools(): LiquidityPool[] {
  return [];
}

export async function getLPIncentivesAsync(): Promise<LPIncentive[]> {
  try {
    const incentives = await camelotPoolService.getLPIncentives();
    return incentives.map(inc => ({
      poolId: inc.poolId,
      poolName: inc.poolName,
      baseApr: inc.baseApr,
      boostApr: inc.boostApr,
      totalApr: inc.totalApr,
      axmRewards: inc.axmRewards,
      duration: inc.duration,
      eligibleTvl: inc.eligibleTvl
    }));
  } catch (error) {
    console.error('Error fetching LP incentives from blockchain:', error);
    return [];
  }
}

export function getLPIncentives(): LPIncentive[] {
  return [];
}

export function getAutomationRules(): AutomationRule[] {
  return automationRules;
}

export function toggleAutomationRule(ruleId: string, enabled: boolean): boolean {
  const rule = automationRules.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = enabled;
    return true;
  }
  return false;
}

export function getBridgeRoutes(): BridgeRoute[] {
  return bridgeRoutes;
}

export function getOperations(): TreasuryOperation[] {
  return operations;
}

export function createOperation(op: Omit<TreasuryOperation, 'id' | 'createdAt' | 'status'>): TreasuryOperation {
  const newOp: TreasuryOperation = {
    ...op,
    id: `op-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  operations.push(newOp);
  
  setTimeout(() => {
    newOp.status = 'executing';
    setTimeout(() => {
      newOp.status = Math.random() > 0.1 ? 'completed' : 'failed';
      newOp.completedAt = new Date().toISOString();
      if (newOp.status === 'completed') {
        newOp.txHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      } else {
        newOp.error = 'Transaction reverted';
      }
    }, 3000);
  }, 1000);
  
  return newOp;
}

export default {
  getLiquidityPools,
  getLiquidityPoolsAsync,
  getAutomationRules,
  toggleAutomationRule,
  getBridgeRoutes,
  getOperations,
  createOperation,
  getLPIncentives,
  getLPIncentivesAsync
};
