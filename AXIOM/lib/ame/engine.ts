import type {
  AMEInput,
  AMERatios,
  NormalizedStress,
  AdaptiveTargets,
  PolicyAction,
  AMEEvaluation,
  AMEConfig,
  AMEStressScenario,
  AMEStressResult,
  RegimeBand,
  EvaluationStatus,
} from './types';
import { MODEL_VERSION, STRESS_SCENARIOS } from './config';

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computeRatios(input: AMEInput): AMERatios {
  const eps = 1e-10;
  const denom = Math.max(input.outstandingLiabilitiesUsd, eps);

  const coverageRatio = Math.round((input.treasuryCapitalUsd / denom) * 1e8) / 1e8;
  const reserveRatio = Math.round((input.liquidReservesUsd / denom) * 1e8) / 1e8;
  const lossBufferRatio = Math.round(((input.treasuryCapitalUsd - input.liquidReservesUsd) / denom) * 1e8) / 1e8;
  const liquidityDepth = Math.round((input.redemptionCapacityUsd / denom) * 1e8) / 1e8;

  return { coverageRatio, reserveRatio, lossBufferRatio, liquidityDepth };
}

export function computeNormalizedStress(input: AMEInput, config: AMEConfig): NormalizedStress {
  const volShock = Math.round(clamp(input.realizedVolatility / config.rvRef, 0, 1) * 1e4) / 1e4;
  const drawdownPressure = Math.round(clamp(input.drawdownPct / config.ddRef, 0, 1) * 1e4) / 1e4;
  const flowStress = Math.round(clamp(input.flowImbalance, 0, 1) * 1e4) / 1e4;
  const liquidityStress = Math.round(clamp(input.liquidityCompression, 0, 1) * 1e4) / 1e4;

  return { volShock, drawdownPressure, flowStress, liquidityStress };
}

export function computeRS(stress: NormalizedStress, config: AMEConfig): number {
  const raw =
    config.weights.wv * stress.volShock +
    config.weights.wd * stress.drawdownPressure +
    config.weights.wf * stress.flowStress +
    config.weights.wl * stress.liquidityStress;

  return Math.round(clamp(raw, 0, 1) * 1e4) / 1e4;
}

export function computePM(rs: number, config: AMEConfig): number {
  const pmRaw = 1 / Math.max(1 - rs, config.rsEpsilon);
  const pm = clamp(pmRaw, config.pmMin, config.pmMax);
  return Math.round(pm * 1e4) / 1e4;
}

export function computeTargets(pm: number, config: AMEConfig): AdaptiveTargets {
  return {
    crTarget: Math.round(config.baseTargets.cr * pm * 1e4) / 1e4,
    rrTarget: Math.round(config.baseTargets.rr * pm * 1e4) / 1e4,
    lbrTarget: Math.round(config.baseTargets.lbr * pm * 1e4) / 1e4,
    ldTarget: Math.round(config.baseTargets.ld * pm * 1e4) / 1e4,
  };
}

export function determineRegimeBand(rs: number): RegimeBand {
  if (rs < 0.25) return 'STABLE';
  if (rs < 0.50) return 'CAUTION';
  if (rs < 0.75) return 'STRESS';
  return 'CRISIS';
}

export function computePayoutFactor(rs: number, regimeBand: RegimeBand, config: AMEConfig): number {
  let pf = config.basePayout * (1 - rs * rs);
  if (regimeBand === 'CRISIS') pf = 0;
  pf = clamp(pf, 0, 1);
  return Math.round(pf * 1e4) / 1e4;
}

export function computeActions(ratios: AMERatios, targets: AdaptiveTargets, rs: number): PolicyAction[] {
  const actions: PolicyAction[] = [];

  if (rs >= 0.80) {
    actions.push({
      action: 'ACTION_CRISIS_LOCKDOWN',
      reason: 'Regime Score has exceeded the crisis lockdown threshold of 0.80',
      threshold: 0.80,
      currentValue: rs,
      breached: true,
    });
  }

  if (ratios.coverageRatio < targets.crTarget) {
    actions.push({
      action: 'ACTION_FREEZE_DISTRIBUTIONS',
      reason: `Coverage ratio ${ratios.coverageRatio} is below adaptive target ${targets.crTarget}`,
      threshold: targets.crTarget,
      currentValue: ratios.coverageRatio,
      breached: true,
    });
  }

  if (ratios.liquidityDepth < targets.ldTarget) {
    actions.push({
      action: 'ACTION_LIQUIDITY_DEFENSE_MODE',
      reason: `Liquidity depth ${ratios.liquidityDepth} is below adaptive target ${targets.ldTarget}`,
      threshold: targets.ldTarget,
      currentValue: ratios.liquidityDepth,
      breached: true,
    });
  }

  if (ratios.reserveRatio < targets.rrTarget) {
    actions.push({
      action: 'ACTION_REDIRECT_FLOWS_TO_RESERVES',
      reason: `Reserve ratio ${ratios.reserveRatio} is below adaptive target ${targets.rrTarget}`,
      threshold: targets.rrTarget,
      currentValue: ratios.reserveRatio,
      breached: true,
    });
  }

  const priority: Record<string, number> = {
    'ACTION_CRISIS_LOCKDOWN': 0,
    'ACTION_FREEZE_DISTRIBUTIONS': 1,
    'ACTION_LIQUIDITY_DEFENSE_MODE': 2,
    'ACTION_REDIRECT_FLOWS_TO_RESERVES': 3,
  };

  actions.sort((a, b) => priority[a.action] - priority[b.action]);

  return actions;
}

export function determineStatus(actions: PolicyAction[], regimeBand: RegimeBand): EvaluationStatus {
  if (regimeBand === 'CRISIS') return 'CRISIS';
  if (actions.length > 0) return 'BREACH';
  return 'OK';
}

export function generateDisclosureSummary(regimeBand: RegimeBand, rs: number, actions: PolicyAction[]): string {
  switch (regimeBand) {
    case 'STABLE':
      return 'The protocol is operating within target parameters. All coverage and reserve ratios meet adaptive thresholds. No policy actions are active.';
    case 'CAUTION':
      return 'One or more stress indicators have crossed advisory thresholds. The Adaptive Metrics Engine has increased target ratios. Enhanced monitoring is in effect.';
    case 'STRESS':
      return 'Multiple stress indicators are elevated. Policy multiplier has significantly increased target thresholds. One or more hard brake triggers may be active. Capital preservation measures are under review.';
    case 'CRISIS':
      return 'The protocol is in crisis mode. All discretionary distributions are frozen. Crisis lockdown procedures are active. This condition requires immediate governance intervention.';
  }
}

export function buildEvaluation(
  input: AMEInput,
  config: AMEConfig,
  evaluationId: string,
  inputSnapshotRef: string
): AMEEvaluation {
  const ratios = computeRatios(input);
  const stress = computeNormalizedStress(input, config);
  const rs = computeRS(stress, config);
  const pm = computePM(rs, config);
  const targets = computeTargets(pm, config);
  const regimeBand = determineRegimeBand(rs);
  const payoutFactor = computePayoutFactor(rs, regimeBand, config);
  const actions = computeActions(ratios, targets, rs);
  const status = determineStatus(actions, regimeBand);
  const disclosureSummary = generateDisclosureSummary(regimeBand, rs, actions);

  return {
    evaluationId,
    modelVersion: MODEL_VERSION,
    inputSnapshotRef,
    regimeBand,
    rs,
    pm,
    ratios,
    targets,
    payoutFactor,
    actions,
    status,
    disclosureSummary,
    timestamp: new Date().toISOString(),
  };
}

export function applyStressShocks(input: AMEInput, scenario: AMEStressScenario): AMEInput {
  const shocked: AMEInput = { ...input };

  if (scenario.shocks.treasuryDrawdownPct !== undefined) {
    shocked.treasuryCapitalUsd = input.treasuryCapitalUsd * (1 - scenario.shocks.treasuryDrawdownPct / 100);
  }
  if (scenario.shocks.reserveDrawdownPct !== undefined) {
    shocked.liquidReservesUsd = input.liquidReservesUsd * (1 - scenario.shocks.reserveDrawdownPct / 100);
  }
  if (scenario.shocks.liabilityIncreasePct !== undefined) {
    shocked.outstandingLiabilitiesUsd = input.outstandingLiabilitiesUsd * (1 + scenario.shocks.liabilityIncreasePct / 100);
  }
  if (scenario.shocks.rcDrawdownPct !== undefined) {
    shocked.redemptionCapacityUsd = input.redemptionCapacityUsd * (1 - scenario.shocks.rcDrawdownPct / 100);
  }
  if (scenario.shocks.rvOverride !== undefined) {
    shocked.realizedVolatility = scenario.shocks.rvOverride;
  }
  if (scenario.shocks.ddOverride !== undefined) {
    shocked.drawdownPct = scenario.shocks.ddOverride;
  }
  if (scenario.shocks.fiOverride !== undefined) {
    shocked.flowImbalance = scenario.shocks.fiOverride;
  }

  return shocked;
}

export function runStressScenario(
  baseEvaluation: AMEEvaluation,
  input: AMEInput,
  scenario: AMEStressScenario,
  config: AMEConfig
): AMEStressResult {
  const shockedInput = applyStressShocks(input, scenario);
  const projectedRatios = computeRatios(shockedInput);
  const stress = computeNormalizedStress(shockedInput, config);
  const projectedRS = computeRS(stress, config);
  const projectedPM = computePM(projectedRS, config);
  const projectedTargets = computeTargets(projectedPM, config);
  const projectedRegimeBand = determineRegimeBand(projectedRS);
  const projectedActions = computeActions(projectedRatios, projectedTargets, projectedRS);
  const projectedStatus = determineStatus(projectedActions, projectedRegimeBand);

  const breaches = [
    {
      metric: 'coverageRatio',
      target: projectedTargets.crTarget,
      projected: projectedRatios.coverageRatio,
      breached: projectedRatios.coverageRatio < projectedTargets.crTarget,
    },
    {
      metric: 'reserveRatio',
      target: projectedTargets.rrTarget,
      projected: projectedRatios.reserveRatio,
      breached: projectedRatios.reserveRatio < projectedTargets.rrTarget,
    },
    {
      metric: 'lossBufferRatio',
      target: projectedTargets.lbrTarget,
      projected: projectedRatios.lossBufferRatio,
      breached: projectedRatios.lossBufferRatio < projectedTargets.lbrTarget,
    },
    {
      metric: 'liquidityDepth',
      target: projectedTargets.ldTarget,
      projected: projectedRatios.liquidityDepth,
      breached: projectedRatios.liquidityDepth < projectedTargets.ldTarget,
    },
  ];

  return {
    scenario,
    baselineEvaluation: baseEvaluation,
    projectedRatios,
    projectedTargets,
    projectedRS,
    projectedPM,
    projectedRegimeBand,
    projectedActions,
    projectedStatus,
    breaches,
  };
}

export function runAllStressScenarios(
  baseEvaluation: AMEEvaluation,
  input: AMEInput,
  config: AMEConfig
): AMEStressResult[] {
  return STRESS_SCENARIOS.map((scenario) => runStressScenario(baseEvaluation, input, scenario, config));
}
