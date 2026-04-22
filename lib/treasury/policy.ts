/**
 * AXIOM 3-Layer Treasury Policy Configuration
 * 
 * Expresses treasury operational policy using existing contracts:
 * - Layer A: Survival Buffer (external/off-protocol)
 * - Layer B: Operating Cash (daily/weekly draws)
 * - Layer C: Treasury Reserve (timelocked, emergency-only)
 * 
 * No new smart contracts required - uses BackstopVault, AXUSDRevenueRouter, GovernanceHub
 */

import { CORE_CONTRACTS, AXUSD_STABLECOIN_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS, GOVERNANCE_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../shared/contracts';

export const TREASURY_POLICY_VERSION = '1.0.0';
export const POLICY_EFFECTIVE_DATE = '2026-01-25';

export const TREASURY_ADDRESSES = {
  TREASURY_HUB: CORE_CONTRACTS.TREASURY_REVENUE,
  BACKSTOP_VAULT: AXUSD_STABLECOIN_CONTRACTS.BACKSTOP_VAULT,
  BACKSTOP_VAULT_USDC: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
  BACKSTOP_VAULT_ETH: AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_ETH,
  REVENUE_ROUTER: AXUSD_INTEGRATION_CONTRACTS.REVENUE_ROUTER,
  SEED_DISTRIBUTOR: AXUSD_INTEGRATION_CONTRACTS.SEED_YIELD_DISTRIBUTOR,
  GOVERNANCE_HUB: GOVERNANCE_CONTRACTS.GOVERNANCE_HUB,
} as const;

export type TreasuryLayer = 'survival' | 'operating' | 'reserve';
export type TreasuryStatus = 'normal' | 'caution' | 'stressed' | 'emergency';
export type DrawFrequency = 'daily' | 'weekly' | 'monthly' | 'on-demand';

export interface TreasuryLayerConfig {
  name: string;
  layer: TreasuryLayer;
  description: string;
  targetBalanceUsd: number;
  minBalanceUsd: number;
  maxBalanceUsd: number;
  drawFrequency: DrawFrequency;
  maxDrawPerPeriodUsd: number;
  replenishmentSource: TreasuryLayer | 'revenue' | 'external';
  accessRoles: string[];
  timelockHours: number;
  onChainAddress: string | null;
}

export interface TreasuryPolicyConfig {
  version: string;
  effectiveDate: string;
  layers: Record<TreasuryLayer, TreasuryLayerConfig>;
  revenueAllocation: {
    seedShareBps: number;
    operatingShareBps: number;
    reserveShareBps: number;
    totalBps: number;
  };
  stressThresholds: {
    lowIncomeWeekThresholdUsd: number;
    reserveDrawTriggerUsd: number;
    emergencyPauseTriggerUsd: number;
  };
  emergencyConditions: {
    pauseOnReserveBelow: number;
    pauseOnDailyDrawExceeded: boolean;
    pauseOnMultipleStressWeeks: number;
    autoUnpauseAfterHours: number | null;
  };
  drawLimits: {
    dailyOperatingMaxUsd: number;
    weeklyOperatingMaxUsd: number;
    monthlyOperatingMaxUsd: number;
    emergencyReserveMaxUsd: number;
    emergencyReserveTimelockHours: number;
  };
  reportingFrequency: {
    balanceSnapshot: 'hourly' | 'daily' | 'weekly';
    drawReport: 'per-draw' | 'daily' | 'weekly';
    stressAssessment: 'daily' | 'weekly';
  };
}

export const TREASURY_POLICY: TreasuryPolicyConfig = {
  version: TREASURY_POLICY_VERSION,
  effectiveDate: POLICY_EFFECTIVE_DATE,

  layers: {
    survival: {
      name: 'Survival Buffer',
      layer: 'survival',
      description: 'External holdings for extreme emergencies (off-protocol)',
      targetBalanceUsd: 500_000,
      minBalanceUsd: 250_000,
      maxBalanceUsd: 1_000_000,
      drawFrequency: 'on-demand',
      maxDrawPerPeriodUsd: 100_000,
      replenishmentSource: 'external',
      accessRoles: ['ADMIN_MULTISIG', 'BOARD_APPROVAL'],
      timelockHours: 72,
      onChainAddress: null,
    },

    operating: {
      name: 'Operating Cash',
      layer: 'operating',
      description: 'Weekly operational expenses: payroll, vendors, infrastructure',
      targetBalanceUsd: 150_000,
      minBalanceUsd: 50_000,
      maxBalanceUsd: 300_000,
      drawFrequency: 'weekly',
      maxDrawPerPeriodUsd: 50_000,
      replenishmentSource: 'revenue',
      accessRoles: ['MARKET_OPS_ROLE', 'ADMIN_ROLE'],
      timelockHours: 0,
      onChainAddress: TREASURY_ADDRESSES.BACKSTOP_VAULT,
    },

    reserve: {
      name: 'Treasury Reserve',
      layer: 'reserve',
      description: 'Protocol backstop for stress events and long-term reserves',
      targetBalanceUsd: 1_000_000,
      minBalanceUsd: 500_000,
      maxBalanceUsd: 5_000_000,
      drawFrequency: 'on-demand',
      maxDrawPerPeriodUsd: 100_000,
      replenishmentSource: 'revenue',
      accessRoles: ['GUARDIAN_ROLE', 'ADMIN_ROLE'],
      timelockHours: 24,
      onChainAddress: TREASURY_ADDRESSES.BACKSTOP_VAULT,
    },
  },

  revenueAllocation: {
    seedShareBps: 5000,
    operatingShareBps: 3000,
    reserveShareBps: 2000,
    totalBps: 10000,
  },

  stressThresholds: {
    lowIncomeWeekThresholdUsd: 10_000,
    reserveDrawTriggerUsd: 25_000,
    emergencyPauseTriggerUsd: 100_000,
  },

  emergencyConditions: {
    pauseOnReserveBelow: 100_000,
    pauseOnDailyDrawExceeded: true,
    pauseOnMultipleStressWeeks: 3,
    autoUnpauseAfterHours: null,
  },

  drawLimits: {
    dailyOperatingMaxUsd: 10_000,
    weeklyOperatingMaxUsd: 50_000,
    monthlyOperatingMaxUsd: 150_000,
    emergencyReserveMaxUsd: 100_000,
    emergencyReserveTimelockHours: 24,
  },

  reportingFrequency: {
    balanceSnapshot: 'hourly',
    drawReport: 'per-draw',
    stressAssessment: 'weekly',
  },
};

export interface TreasuryState {
  timestamp: string;
  status: TreasuryStatus;
  isPaused: boolean;
  balances: {
    operatingUsd: number;
    reserveUsd: number;
    survivalUsd: number;
    totalUsd: number;
  };
  weeklyMetrics: {
    incomeUsd: number;
    drawsUsd: number;
    netFlowUsd: number;
    isLowIncomeWeek: boolean;
  };
  drawsRemaining: {
    dailyOperatingUsd: number;
    weeklyOperatingUsd: number;
    emergencyReserveUsd: number;
  };
  consecutiveStressWeeks: number;
  lastDrawTimestamp: string | null;
  alerts: TreasuryAlert[];
}

export interface TreasuryAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  layer: TreasuryLayer | 'system';
  actionRequired: boolean;
}

export interface DrawRequest {
  id: string;
  layer: TreasuryLayer;
  amountUsd: number;
  purpose: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'executed' | 'blocked' | 'expired';
  blockReason?: string;
  executeAfter?: string;
  txHash?: string;
}

export function evaluateTreasuryStatus(state: TreasuryState): TreasuryStatus {
  const policy = TREASURY_POLICY;

  if (state.isPaused) return 'emergency';

  if (state.balances.reserveUsd < policy.emergencyConditions.pauseOnReserveBelow) {
    return 'emergency';
  }

  if (state.consecutiveStressWeeks >= policy.emergencyConditions.pauseOnMultipleStressWeeks) {
    return 'emergency';
  }

  const dailyDrawUsed = policy.drawLimits.dailyOperatingMaxUsd - state.drawsRemaining.dailyOperatingUsd;
  if (policy.emergencyConditions.pauseOnDailyDrawExceeded && dailyDrawUsed >= policy.drawLimits.dailyOperatingMaxUsd) {
    return 'stressed';
  }

  if (state.balances.operatingUsd < policy.stressThresholds.reserveDrawTriggerUsd) {
    return 'stressed';
  }

  if (state.consecutiveStressWeeks >= 2) {
    return 'stressed';
  }

  if (state.weeklyMetrics.isLowIncomeWeek) {
    return 'caution';
  }

  if (state.balances.operatingUsd < policy.layers.operating.minBalanceUsd) {
    return 'caution';
  }

  return 'normal';
}

export function canExecuteDraw(request: DrawRequest, state: TreasuryState): { allowed: boolean; reason: string } {
  const policy = TREASURY_POLICY;

  if (state.isPaused && request.layer !== 'survival') {
    return { allowed: false, reason: 'Treasury is paused. Only survival layer draws permitted.' };
  }

  if (request.layer === 'operating') {
    if (request.amountUsd > state.drawsRemaining.dailyOperatingUsd) {
      return { allowed: false, reason: `Exceeds daily operating limit. Remaining: $${state.drawsRemaining.dailyOperatingUsd.toLocaleString()}` };
    }
    if (request.amountUsd > state.drawsRemaining.weeklyOperatingUsd) {
      return { allowed: false, reason: `Exceeds weekly operating limit. Remaining: $${state.drawsRemaining.weeklyOperatingUsd.toLocaleString()}` };
    }
    if (state.balances.operatingUsd - request.amountUsd < policy.layers.operating.minBalanceUsd) {
      return { allowed: false, reason: `Would breach minimum operating balance of $${policy.layers.operating.minBalanceUsd.toLocaleString()}` };
    }
  }

  if (request.layer === 'reserve') {
    if (state.status !== 'stressed' && state.status !== 'emergency') {
      return { allowed: false, reason: 'Reserve draws only permitted during stressed or emergency status.' };
    }
    if (request.amountUsd > state.drawsRemaining.emergencyReserveUsd) {
      return { allowed: false, reason: `Exceeds emergency reserve limit. Remaining: $${state.drawsRemaining.emergencyReserveUsd.toLocaleString()}` };
    }
    if (state.balances.reserveUsd - request.amountUsd < policy.emergencyConditions.pauseOnReserveBelow) {
      return { allowed: false, reason: `Would trigger emergency pause. Reserve floor: $${policy.emergencyConditions.pauseOnReserveBelow.toLocaleString()}` };
    }
  }

  return { allowed: true, reason: 'Draw approved' };
}

export function calculateReplenishment(state: TreasuryState): { operatingNeeded: number; reserveNeeded: number } {
  const policy = TREASURY_POLICY;

  const operatingNeeded = Math.max(0, policy.layers.operating.targetBalanceUsd - state.balances.operatingUsd);
  const reserveNeeded = Math.max(0, policy.layers.reserve.targetBalanceUsd - state.balances.reserveUsd);

  return { operatingNeeded, reserveNeeded };
}

export function shouldPauseTreasury(state: TreasuryState): { shouldPause: boolean; reasons: string[] } {
  const policy = TREASURY_POLICY;
  const reasons: string[] = [];

  if (state.balances.reserveUsd < policy.emergencyConditions.pauseOnReserveBelow) {
    reasons.push(`Reserve below emergency floor ($${policy.emergencyConditions.pauseOnReserveBelow.toLocaleString()})`);
  }

  if (state.consecutiveStressWeeks >= policy.emergencyConditions.pauseOnMultipleStressWeeks) {
    reasons.push(`${state.consecutiveStressWeeks} consecutive stress weeks`);
  }

  const dailyDrawUsed = policy.drawLimits.dailyOperatingMaxUsd - state.drawsRemaining.dailyOperatingUsd;
  if (policy.emergencyConditions.pauseOnDailyDrawExceeded && dailyDrawUsed >= policy.drawLimits.dailyOperatingMaxUsd) {
    reasons.push('Daily operating draw limit exhausted');
  }

  if (state.balances.totalUsd < policy.stressThresholds.emergencyPauseTriggerUsd) {
    reasons.push(`Total balance ($${state.balances.totalUsd.toLocaleString()}) below emergency trigger ($${policy.stressThresholds.emergencyPauseTriggerUsd.toLocaleString()})`);
  }

  return { shouldPause: reasons.length > 0, reasons };
}

export function isStressedState(state: TreasuryState): boolean {
  const policy = TREASURY_POLICY;
  return (
    state.balances.operatingUsd < policy.stressThresholds.reserveDrawTriggerUsd ||
    state.consecutiveStressWeeks >= 2 ||
    state.weeklyMetrics.isLowIncomeWeek
  );
}

export default TREASURY_POLICY;
