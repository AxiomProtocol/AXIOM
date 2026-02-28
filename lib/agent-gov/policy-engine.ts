import { db } from '../../server/db';
import { agPolicies, agBudgets, agAgents, agIntents, agExecutions, sentinelRegimeSnapshots } from '../../shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import type {
  PolicyRules, DecisionResult, DecisionVerdict, CheckResult,
  RegimeBand, BudgetConstraints, IntentType, TradePayload,
} from './types';
import { DEFAULT_POLICY_RULES } from './types';

const AME_REGIME_MAP: Record<string, RegimeBand> = {
  TREND_UP: 'STABLE',
  RANGE_LOW_VOL: 'STABLE',
  TREND_DOWN: 'CAUTION',
  HIGH_VOL_DISLOCATION: 'STRESS',
};

async function getActivePolicy(): Promise<{ id: string; rules: PolicyRules }> {
  const rows = await db.select()
    .from(agPolicies)
    .where(eq(agPolicies.status, 'ACTIVE'))
    .orderBy(desc(agPolicies.updatedAt))
    .limit(1);

  if (rows.length > 0) {
    return { id: rows[0].id, rules: rows[0].rules as PolicyRules };
  }

  const [bootstrap] = await db.insert(agPolicies).values({
    name: 'Bootstrap Policy v1',
    version: 1,
    status: 'ACTIVE',
    rules: DEFAULT_POLICY_RULES as unknown as Record<string, unknown>,
  }).returning();

  return { id: bootstrap.id, rules: DEFAULT_POLICY_RULES };
}

async function getCurrentRegime(): Promise<{ id: string | null; band: RegimeBand }> {
  const rows = await db.select()
    .from(sentinelRegimeSnapshots)
    .orderBy(desc(sentinelRegimeSnapshots.createdAt))
    .limit(1);

  if (rows.length === 0) {
    return { id: null, band: 'STABLE' };
  }

  const row = rows[0];
  const band = AME_REGIME_MAP[row.regime] || 'STABLE';
  return { id: row.id, band };
}

async function getAgentBudget(agentId: string, policyId: string): Promise<BudgetConstraints | null> {
  const rows = await db.select()
    .from(agBudgets)
    .where(and(eq(agBudgets.agentId, agentId), eq(agBudgets.policyId, policyId)))
    .limit(1);

  if (rows.length === 0) return null;

  const b = rows[0];
  return {
    maxNotionalPerTrade: Number(b.maxNotionalPerTrade),
    maxNotionalPerDay: Number(b.maxNotionalPerDay),
    maxDailyLoss: Number(b.maxDailyLoss),
    maxOpenPositions: b.maxOpenPositions,
    allowedVenues: (b.allowedVenues as string[]) || [],
    allowedAssets: (b.allowedAssets as string[]) || [],
  };
}

async function countRecentIntents(agentId: string): Promise<number> {
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const rows = await db.select({ count: sql<number>`count(*)::int` })
    .from(agIntents)
    .where(and(eq(agIntents.agentId, agentId), gte(agIntents.requestedAt, oneMinuteAgo)));
  return rows[0]?.count ?? 0;
}

async function countRecentExecutions(agentId: string): Promise<number> {
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const rows = await db.select({ count: sql<number>`count(*)::int` })
    .from(agExecutions)
    .where(gte(agExecutions.executedAt, oneMinuteAgo));
  return rows[0]?.count ?? 0;
}

async function countOpenPositions(agentId: string): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` })
    .from(agExecutions)
    .where(and(
      eq(agExecutions.status, 'SIMULATED'),
    ));
  return rows[0]?.count ?? 0;
}

async function getDailyNotional(agentId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await db.select({ total: sql<string>`COALESCE(SUM(requested_notional), 0)` })
    .from(agExecutions)
    .where(and(
      eq(agExecutions.intentId, sql`(SELECT id FROM ag_intents WHERE agent_id = ${agentId} AND requested_at >= ${startOfDay})`),
      gte(agExecutions.executedAt, startOfDay),
    ));
  return Number(rows[0]?.total ?? 0);
}

export async function evaluateIntent(
  agentId: string,
  intentId: string,
  intentType: IntentType,
  payload: Record<string, unknown>
): Promise<DecisionResult> {
  const checks: CheckResult[] = [];
  let finalDecision: DecisionVerdict = 'APPROVE';

  const agent = await db.select().from(agAgents).where(eq(agAgents.id, agentId)).limit(1);
  if (agent.length === 0) {
    return {
      decision: 'REJECT',
      reason: 'Agent not found',
      checks: [{ check: 'agent_exists', passed: false, detail: 'Agent ID not found in registry' }],
      regime: 'STABLE',
      policyId: '',
      regimeId: null,
    };
  }

  if (agent[0].status === 'SUSPENDED') {
    return {
      decision: 'HALT',
      reason: 'Agent is suspended',
      checks: [{ check: 'agent_active', passed: false, detail: 'Agent status is SUSPENDED' }],
      regime: 'STABLE',
      policyId: '',
      regimeId: null,
    };
  }

  const policy = await getActivePolicy();
  const regime = await getCurrentRegime();
  const rules = policy.rules;
  const regimeRules = rules.per_regime[regime.band];

  if (regimeRules.halt_all) {
    return {
      decision: 'HALT',
      reason: `Regime ${regime.band} enforces full halt`,
      checks: [{ check: 'regime_halt', passed: false, detail: `Regime ${regime.band} has halt_all=true` }],
      regime: regime.band,
      policyId: policy.id,
      regimeId: regime.id,
    };
  }

  const actionAllowed = regimeRules.allowed_actions.includes(intentType);
  checks.push({
    check: 'regime_action_allowed',
    passed: actionAllowed,
    detail: actionAllowed
      ? `${intentType} is allowed in ${regime.band} regime`
      : `${intentType} is not allowed in ${regime.band} regime`,
  });
  if (!actionAllowed) finalDecision = 'REJECT';

  if (regimeRules.freeze_new_positions && (intentType === 'TRADE' || intentType === 'UNDERWRITE')) {
    checks.push({
      check: 'regime_freeze_new_positions',
      passed: false,
      detail: `New positions frozen in ${regime.band} regime`,
    });
    finalDecision = 'REJECT';
  }

  const scope = agent[0].permissionScope as { allowed_domains?: string[]; venues?: string[]; symbols?: string[] };
  if (intentType === 'TRADE' && scope.allowed_domains && scope.allowed_domains.length > 0) {
    const tradePayload = payload as unknown as TradePayload;
    const domainMatch = scope.allowed_domains.includes(tradePayload.asset_class || 'market');
    checks.push({
      check: 'permission_scope_domain',
      passed: domainMatch,
      detail: domainMatch
        ? `Domain ${tradePayload.asset_class} is within agent scope`
        : `Domain ${tradePayload.asset_class} is outside agent scope [${scope.allowed_domains.join(', ')}]`,
    });
    if (!domainMatch) finalDecision = 'REJECT';
  }

  const intentCount = await countRecentIntents(agentId);
  const rateOk = intentCount < (rules.rate_limits?.intents_per_minute ?? 30);
  checks.push({
    check: 'rate_limit_intents',
    passed: rateOk,
    detail: rateOk
      ? `${intentCount} intents in last minute (limit: ${rules.rate_limits.intents_per_minute})`
      : `Rate limit exceeded: ${intentCount} intents in last minute (limit: ${rules.rate_limits.intents_per_minute})`,
  });
  if (!rateOk) finalDecision = finalDecision === 'APPROVE' ? 'THROTTLE' : finalDecision;

  if (intentType === 'REPORT') {
    checks.push({ check: 'report_passthrough', passed: true, detail: 'REPORT intents bypass budget checks' });
    return {
      decision: finalDecision,
      reason: finalDecision === 'APPROVE' ? 'Report intent approved' : 'Report intent blocked by policy',
      checks,
      regime: regime.band,
      policyId: policy.id,
      regimeId: regime.id,
    };
  }

  const budget = await getAgentBudget(agentId, policy.id);
  if (!budget) {
    checks.push({
      check: 'budget_exists',
      passed: false,
      detail: 'No budget configured for this agent. Non-REPORT intents require a budget.',
    });
    return {
      decision: 'REJECT',
      reason: 'No budget configured for agent',
      checks,
      regime: regime.band,
      policyId: policy.id,
      regimeId: regime.id,
    };
  }

  const notional = Number((payload as Record<string, unknown>).notional ?? 0);
  const adjustedMaxPerTrade = budget.maxNotionalPerTrade * regimeRules.max_policy_multiplier;

  const notionalOk = notional <= adjustedMaxPerTrade;
  checks.push({
    check: 'budget_notional_per_trade',
    passed: notionalOk,
    detail: notionalOk
      ? `Notional ${notional} within per-trade limit ${adjustedMaxPerTrade} (base ${budget.maxNotionalPerTrade} x multiplier ${regimeRules.max_policy_multiplier})`
      : `Notional ${notional} exceeds per-trade limit ${adjustedMaxPerTrade}`,
  });
  if (!notionalOk) finalDecision = finalDecision === 'APPROVE' ? 'DOWNGRADE' : finalDecision;

  const dailyNotional = await getDailyNotional(agentId);
  const adjustedMaxPerDay = budget.maxNotionalPerDay * regimeRules.max_policy_multiplier;
  const dailyOk = (dailyNotional + notional) <= adjustedMaxPerDay;
  checks.push({
    check: 'budget_notional_per_day',
    passed: dailyOk,
    detail: dailyOk
      ? `Daily total ${dailyNotional + notional} within limit ${adjustedMaxPerDay}`
      : `Daily total ${dailyNotional + notional} exceeds limit ${adjustedMaxPerDay}`,
  });
  if (!dailyOk) finalDecision = finalDecision === 'APPROVE' ? 'REJECT' : finalDecision;

  const openPositions = await countOpenPositions(agentId);
  const positionsOk = openPositions < budget.maxOpenPositions;
  checks.push({
    check: 'budget_open_positions',
    passed: positionsOk,
    detail: positionsOk
      ? `${openPositions} open positions (limit: ${budget.maxOpenPositions})`
      : `Open positions ${openPositions} at limit ${budget.maxOpenPositions}`,
  });
  if (!positionsOk) finalDecision = finalDecision === 'APPROVE' ? 'REJECT' : finalDecision;

  if (intentType === 'TRADE') {
    const tradePayload = payload as unknown as TradePayload;
    if (budget.allowedVenues.length > 0 && tradePayload.venue) {
      const venueOk = budget.allowedVenues.includes(tradePayload.venue);
      checks.push({
        check: 'budget_venue_allowed',
        passed: venueOk,
        detail: venueOk
          ? `Venue ${tradePayload.venue} is allowed`
          : `Venue ${tradePayload.venue} not in allowed list [${budget.allowedVenues.join(', ')}]`,
      });
      if (!venueOk) finalDecision = 'REJECT';
    }

    if (budget.allowedAssets.length > 0 && tradePayload.symbol) {
      const assetOk = budget.allowedAssets.includes(tradePayload.symbol);
      checks.push({
        check: 'budget_asset_allowed',
        passed: assetOk,
        detail: assetOk
          ? `Asset ${tradePayload.symbol} is allowed`
          : `Asset ${tradePayload.symbol} not in allowed list [${budget.allowedAssets.join(', ')}]`,
      });
      if (!assetOk) finalDecision = 'REJECT';
    }
  }

  if (intentType === 'PARAM_CHANGE_PROPOSAL') {
    checks.push({
      check: 'governance_param_change',
      passed: true,
      detail: 'Parameter change proposals are logged as PROPOSAL_ONLY per governance rules',
    });
  }

  const envLiveEnabled = process.env.AXIOM_AGENT_LIVE_EXECUTION === 'true';
  const liveBlocked = !envLiveEnabled || !rules.global.live_execution_enabled || !regimeRules.allow_live;
  checks.push({
    check: 'live_execution_gate',
    passed: true,
    detail: liveBlocked
      ? `Live execution disabled (env=${envLiveEnabled}, policy=${rules.global.live_execution_enabled}, regime=${regimeRules.allow_live})`
      : 'Live execution enabled at all layers',
  });

  const reason = finalDecision === 'APPROVE'
    ? `Intent approved under ${regime.band} regime`
    : checks.filter(c => !c.passed).map(c => c.detail).join('; ');

  return {
    decision: finalDecision,
    reason,
    checks,
    regime: regime.band,
    policyId: policy.id,
    regimeId: regime.id,
  };
}
