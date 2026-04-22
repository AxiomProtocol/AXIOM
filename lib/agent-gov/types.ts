export interface PermissionScope {
  allowed_domains: string[];
  venues: string[];
  symbols: string[];
}

export interface RegimeConstraints {
  max_policy_multiplier: number;
  allow_live: boolean;
  allowed_actions: string[];
  forced_position_reduction?: boolean;
  freeze_new_positions?: boolean;
  halt_all?: boolean;
}

export interface HardBrakes {
  drawdown_threshold: number;
  coverage_ratio_min: number;
  liquidity_depth_min: number;
  reserve_ratio_min: number;
}

export interface RateLimits {
  intents_per_minute: number;
  executions_per_minute: number;
}

export interface GovernanceRules {
  parameter_change_requires: 'PROPOSAL_ONLY';
  active_policy_change_requires_admin: boolean;
}

export interface PolicyRules {
  global: {
    live_execution_enabled: boolean;
    default_mode: 'ADVISORY' | 'CONSTRAINED';
  };
  per_regime: {
    STABLE: RegimeConstraints;
    CAUTION: RegimeConstraints;
    STRESS: RegimeConstraints;
    CRISIS: RegimeConstraints;
  };
  hard_brakes: HardBrakes;
  rate_limits: RateLimits;
  allowlists: {
    venues: string[];
    assets: string[];
  };
  governance: GovernanceRules;
}

export type IntentType = 'TRADE' | 'UNDERWRITE' | 'PARAM_CHANGE_PROPOSAL' | 'REPORT';
export type IntentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'SIMULATED';
export type DecisionVerdict = 'APPROVE' | 'REJECT' | 'THROTTLE' | 'DOWNGRADE' | 'HALT';
export type RegimeBand = 'STABLE' | 'CAUTION' | 'STRESS' | 'CRISIS';
export type ExecutionMode = 'PAPER' | 'LIVE';
export type AuditEntityType = 'INTENT' | 'DECISION' | 'EXECUTION' | 'POLICY' | 'REGIME' | 'AGENT' | 'BUDGET';

export interface TradePayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  notional: number;
  venue: string;
  asset_class: string;
  reason?: string;
}

export interface UnderwritePayload {
  property_id: string;
  action: string;
  notional: number;
  venue: string;
  reason?: string;
}

export interface ParamChangePayload {
  parameter: string;
  current_value: unknown;
  proposed_value: unknown;
  reason: string;
}

export interface ReportPayload {
  report_type: string;
  data: Record<string, unknown>;
}

export type IntentPayload = TradePayload | UnderwritePayload | ParamChangePayload | ReportPayload;

export interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

export interface DecisionResult {
  decision: DecisionVerdict;
  reason: string;
  checks: CheckResult[];
  regime: RegimeBand;
  policyId: string;
  regimeId: string | null;
}

export interface BudgetConstraints {
  maxNotionalPerTrade: number;
  maxNotionalPerDay: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  allowedVenues: string[];
  allowedAssets: string[];
}

export const DEFAULT_POLICY_RULES: PolicyRules = {
  global: {
    live_execution_enabled: false,
    default_mode: 'ADVISORY',
  },
  per_regime: {
    STABLE: {
      max_policy_multiplier: 1.0,
      allow_live: false,
      allowed_actions: ['TRADE', 'UNDERWRITE', 'REPORT', 'PARAM_CHANGE_PROPOSAL'],
    },
    CAUTION: {
      max_policy_multiplier: 0.7,
      allow_live: false,
      allowed_actions: ['TRADE', 'UNDERWRITE', 'REPORT', 'PARAM_CHANGE_PROPOSAL'],
      forced_position_reduction: false,
    },
    STRESS: {
      max_policy_multiplier: 0.3,
      allow_live: false,
      allowed_actions: ['REPORT', 'PARAM_CHANGE_PROPOSAL'],
      freeze_new_positions: true,
    },
    CRISIS: {
      max_policy_multiplier: 0.0,
      allow_live: false,
      allowed_actions: ['REPORT'],
      halt_all: true,
    },
  },
  hard_brakes: {
    drawdown_threshold: 0.15,
    coverage_ratio_min: 1.0,
    liquidity_depth_min: 0.2,
    reserve_ratio_min: 0.1,
  },
  rate_limits: {
    intents_per_minute: 30,
    executions_per_minute: 10,
  },
  allowlists: {
    venues: ['PAPER_DEX', 'CAMELOT', 'UNISWAP'],
    assets: ['ETH', 'BTC', 'ARB', 'AXUSD', 'USDC'],
  },
  governance: {
    parameter_change_requires: 'PROPOSAL_ONLY',
    active_policy_change_requires_admin: true,
  },
};
