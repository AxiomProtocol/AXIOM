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

const liquidityPools: LiquidityPool[] = [
  { id: 'axm-eth', name: 'AXM-ETH', token0: 'AXM', token1: 'ETH', tvl: 450000, apr: 18.5, volume24h: 125000, fees24h: 375, yourLiquidity: 0, yourShare: 0 },
  { id: 'axusd-usdc', name: 'AXUSD-USDC', token0: 'AXUSD', token1: 'USDC', tvl: 890000, apr: 8.2, volume24h: 340000, fees24h: 680, yourLiquidity: 0, yourShare: 0 },
  { id: 'axm-axusd', name: 'AXM-AXUSD', token0: 'AXM', token1: 'AXUSD', tvl: 320000, apr: 24.7, volume24h: 89000, fees24h: 267, yourLiquidity: 0, yourShare: 0 },
  { id: 'axusd-dai', name: 'AXUSD-DAI', token0: 'AXUSD', token1: 'DAI', tvl: 156000, apr: 6.8, volume24h: 45000, fees24h: 90, yourLiquidity: 0, yourShare: 0 }
];

const automationRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Daily Yield Harvest',
    description: 'Automatically harvest yields from all LP positions daily',
    trigger: { type: 'schedule', config: { interval: '24h', time: '00:00' } },
    action: { type: 'harvest', config: { pools: ['all'], minAmount: 10 } },
    enabled: true,
    lastRun: '2026-01-09T00:00:00Z',
    nextRun: '2026-01-10T00:00:00Z'
  },
  {
    id: '2',
    name: 'Auto-Compound Rewards',
    description: 'Reinvest harvested rewards into LP positions',
    trigger: { type: 'threshold', config: { metric: 'pendingRewards', value: 100 } },
    action: { type: 'compound', config: { targetPool: 'axm-axusd' } },
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

export function getLiquidityPools(): LiquidityPool[] {
  return liquidityPools;
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

export interface LPIncentive {
  poolId: string;
  poolName: string;
  baseApr: number;
  boostApr: number;
  totalApr: number;
  axmRewards: number;
  duration: string;
  eligibleTvl: number;
}

export function getLPIncentives(): LPIncentive[] {
  return [
    { poolId: 'axusd-usdc', poolName: 'AXUSD-USDC', baseApr: 8.2, boostApr: 5.0, totalApr: 13.2, axmRewards: 10000, duration: '30 days', eligibleTvl: 500000 },
    { poolId: 'axm-axusd', poolName: 'AXM-AXUSD', baseApr: 24.7, boostApr: 10.0, totalApr: 34.7, axmRewards: 25000, duration: '30 days', eligibleTvl: 200000 },
    { poolId: 'axm-eth', poolName: 'AXM-ETH', baseApr: 18.5, boostApr: 7.5, totalApr: 26.0, axmRewards: 15000, duration: '30 days', eligibleTvl: 300000 }
  ];
}

export default {
  getLiquidityPools,
  getAutomationRules,
  toggleAutomationRule,
  getBridgeRoutes,
  getOperations,
  createOperation,
  getLPIncentives
};
