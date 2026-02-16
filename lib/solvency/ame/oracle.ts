import { generateText } from '../../server/gemini';
import type { AmeMetricsResult, PolicyMode, StressProjection, WaterfallAllocation, YieldPermission } from './types';

const ORACLE_SYSTEM_PROMPT = `You are the Axiom Protocol Oracle, an institutional-grade risk interpretation engine. Your role is to read deterministic metrics from the Adaptive Metrics Engine (AME) and provide clear, factual interpretation for human operators.

RULES:
1. Never make predictions or promises about future outcomes.
2. Never recommend specific capital actions. You interpret, you do not direct.
3. Use institutional language: "automated control layers" not "smart contracts", "multi-party authorization" not "multi-sig", "settlement environment" not "blockchain", "reserve assets" not "crypto".
4. All statements are interpretive observations, not investment advice.
5. Be concise. Prioritize clarity over length.
6. Reference specific metric values when making observations.
7. Clearly label uncertainty. If data is missing or degraded, say so.
8. Frame tradeoffs explicitly: "prioritizing X comes at the cost of Y."

METRIC DEFINITIONS:
- Coverage Ratio (CR): Treasury liquid assets / net external exposure. Above 1.15 is normal.
- Reserve Ratio (RR): Designated reserves / circulating exposure. Above 0.10 is normal.
- Liquidity Stability Ratio (LSR): Redemption capacity / estimated redemption demand. Above 1.00 means demand is covered.
- Redemption Stress Ratio (RSR): Estimated redemption demand / redemption capacity. Above 0.85 indicates run formation risk.
- Volatility Pressure Index (VPI): Weighted composite of peg deviation, liquidity depth, redemption acceleration, correlation spike. 0-1 range. Above 0.30 is elevated. Above 0.55 is shock territory.
- Stability Score (SSS): Composite 0-100 score. 75+ is STABLE, 50-74 is CAUTION, 25-49 is STRESS, below 25 is CRISIS.

POLICY MODES: BOOTSTRAP (initialization), NORMAL (all targets met), CAUTION (advisory thresholds crossed), DEFENSIVE (intervention thresholds), RESTRICTED (capital preservation), EMERGENCY (critical breach, all non-essential suspended).

HARD BRAKE: Automatic circuit breaker that arms when CR < 1.00, LSR < 1.00, RSR > 0.85, or VPI > 0.55. Releases only after consecutive safe snapshots.

CAPITAL WATERFALL: Inflows are routed by policy mode. In EMERGENCY, 100% goes to stabilization. In NORMAL, flows split across loss buffer, reserves, stabilization, yield, and growth.`;

export interface OracleContext {
  metrics: AmeMetricsResult | null;
  previousMetrics?: AmeMetricsResult | null;
  yieldPermission?: YieldPermission | null;
  waterfall?: WaterfallAllocation[] | null;
  recentEvents?: Array<{
    eventType: string;
    severity: string;
    policyMode: string;
    createdAt: string;
    detailsJson: any;
  }>;
  stressProjections?: StressProjection[] | null;
}

export type OracleQueryType =
  | 'regime_narration'
  | 'stress_recommendation'
  | 'tradeoff_analysis'
  | 'audit_summary'
  | 'full_briefing';

function buildMetricsBlock(metrics: AmeMetricsResult): string {
  return `CURRENT METRICS:
  Coverage Ratio: ${metrics.coverageRatio.toFixed(4)}
  Reserve Ratio: ${metrics.reserveRatio.toFixed(4)}
  Liquidity Stability Ratio: ${metrics.liquidityStabilityRatio.toFixed(4)}
  Redemption Stress Ratio: ${metrics.redemptionStressRatio.toFixed(4)}
  Volatility Pressure Index: ${metrics.volatilityPressureIndex.toFixed(4)}
  Stability Score: ${metrics.stabilityScore}/100
  Policy Mode: ${metrics.policyMode}
  Regime Band: ${metrics.regimeBand}
  Hard Brake Armed: ${metrics.hardBrake ? 'YES' : 'NO'}
  ${metrics.hardBrake ? 'Hard Brake Reasons: ' + metrics.hardBrakeReasons.join('; ') : ''}
  Capital Adequacy: ${metrics.capitalAdequacy.toFixed(4)}
  Loss Buffer Ratio: ${metrics.lossBufferRatio.toFixed(4)}
  Trigger Metric: ${metrics.triggerMetric}
  Trigger Value: ${metrics.triggerValue.toFixed(4)}`;
}

function buildEventsBlock(events: OracleContext['recentEvents']): string {
  if (!events || events.length === 0) return 'RECENT EVENTS: None recorded.';
  return `RECENT ENFORCEMENT EVENTS (newest first):\n${events.map(e =>
    `  [${e.createdAt}] ${e.eventType} | ${e.severity} | Mode: ${e.policyMode} | ${JSON.stringify(e.detailsJson)}`
  ).join('\n')}`;
}

function buildStressBlock(projections: StressProjection[]): string {
  return `STRESS PROJECTIONS:\n${projections.map(p =>
    `  ${p.scenario.label}: Policy=${p.policyModeAfter}, HardBrake=${p.hardBrakeAfter}, Breaches=${p.breaches.length > 0 ? p.breaches.join('; ') : 'None'}, CR=${p.projectedMetrics.coverageRatio.toFixed(4)}, SSS=${p.projectedMetrics.stabilityScore}`
  ).join('\n')}`;
}

const QUERY_PROMPTS: Record<OracleQueryType, (ctx: OracleContext) => string> = {
  regime_narration: (ctx) => {
    const parts = [];
    if (ctx.metrics) parts.push(buildMetricsBlock(ctx.metrics));
    if (ctx.previousMetrics) {
      parts.push(`PREVIOUS SNAPSHOT METRICS:
  Coverage Ratio: ${ctx.previousMetrics.coverageRatio.toFixed(4)}
  Stability Score: ${ctx.previousMetrics.stabilityScore}/100
  Policy Mode: ${ctx.previousMetrics.policyMode}`);
    }
    if (ctx.recentEvents) parts.push(buildEventsBlock(ctx.recentEvents));

    return `${parts.join('\n\n')}

Provide a concise regime narration covering:
1. Current state assessment (2-3 sentences)
2. What changed since the previous snapshot, if available (1-2 sentences)
3. Key risk signals to monitor (bullet points)
4. Capital waterfall implications at current policy mode (1-2 sentences)

Keep it under 250 words. Do not speculate on future prices or outcomes.`;
  },

  stress_recommendation: (ctx) => {
    const parts = [];
    if (ctx.metrics) parts.push(buildMetricsBlock(ctx.metrics));
    if (ctx.stressProjections) parts.push(buildStressBlock(ctx.stressProjections));

    return `${parts.join('\n\n')}

Based on current metrics and market conditions, provide:
1. Which stress scenarios are most relevant right now and why (2-3 sentences each)
2. Which metrics are closest to their breach thresholds (ranked list)
3. What the stress results reveal about system resilience (2-3 sentences)

Keep it under 300 words. State observations, not recommendations.`;
  },

  tradeoff_analysis: (ctx) => {
    const parts = [];
    if (ctx.metrics) parts.push(buildMetricsBlock(ctx.metrics));
    if (ctx.yieldPermission) {
      parts.push(`YIELD PERMISSION:
  Yield Allowed: ${ctx.yieldPermission.yieldAllowed}
  Stability Modifier Factor: ${ctx.yieldPermission.stabilityModifierFactor.toFixed(4)}
  Max Yield Pct: ${(ctx.yieldPermission.maxYieldPct * 100).toFixed(2)}%
  Reason: ${ctx.yieldPermission.reason}`);
    }
    if (ctx.waterfall) {
      parts.push(`CAPITAL WATERFALL:\n${ctx.waterfall.map(w => `  ${w.bucket}: ${(w.pct * 100).toFixed(0)}%`).join('\n')}`);
    }

    return `${parts.join('\n\n')}

Analyze the current tradeoffs:
1. Tension between yield distribution and reserve building (2-3 sentences)
2. Capital efficiency vs safety margin at current stability score (2-3 sentences)
3. What the waterfall allocation prioritizes and what it deprioritizes (2-3 sentences)
4. Impact of the current stability modifier on yield capacity (1-2 sentences)

Keep it under 250 words. Frame as tradeoffs, not advice.`;
  },

  audit_summary: (ctx) => {
    const parts = [];
    if (ctx.metrics) parts.push(buildMetricsBlock(ctx.metrics));
    if (ctx.recentEvents) parts.push(buildEventsBlock(ctx.recentEvents));

    return `${parts.join('\n\n')}

Produce a concise audit summary covering:
1. Summary of enforcement actions taken in the event log (chronological narrative)
2. Policy mode transitions observed (if any)
3. Hard brake activations and releases (if any)
4. Data quality and completeness observations

Keep it under 300 words. Use factual, audit-grade language.`;
  },

  full_briefing: (ctx) => {
    const parts = [];
    if (ctx.metrics) parts.push(buildMetricsBlock(ctx.metrics));
    if (ctx.recentEvents) parts.push(buildEventsBlock(ctx.recentEvents));
    if (ctx.stressProjections) parts.push(buildStressBlock(ctx.stressProjections));
    if (ctx.yieldPermission) {
      parts.push(`YIELD: ${ctx.yieldPermission.yieldAllowed ? 'Permitted' : 'Suspended'} | SMF=${ctx.yieldPermission.stabilityModifierFactor.toFixed(4)} | ${ctx.yieldPermission.reason}`);
    }

    return `${parts.join('\n\n')}

Provide a full institutional briefing covering:
1. Executive summary (3-4 sentences on overall protocol health)
2. Key metrics assessment (which are strong, which need attention)
3. Enforcement activity (what actions have occurred)
4. Stress resilience (how the system performs under scenarios)
5. Yield and capital allocation state
6. Monitoring priorities (what to watch)

Keep it under 500 words. Institutional tone. No speculation.`;
  },
};

export async function queryOracle(
  queryType: OracleQueryType,
  context: OracleContext
): Promise<{ interpretation: string; queryType: string; timestamp: string; disclaimer: string }> {
  if (!context.metrics) {
    return {
      interpretation: 'No metrics data available. The Adaptive Metrics Engine has not yet produced an evaluation. Oracle interpretation requires at least one completed AME snapshot.',
      queryType,
      timestamp: new Date().toISOString(),
      disclaimer: 'AI-generated interpretation. Not financial advice. Deterministic metrics are the authoritative source.',
    };
  }

  const prompt = QUERY_PROMPTS[queryType](context);

  const interpretation = await generateText(prompt, {
    model: 'gemini-3-flash',
    systemPrompt: ORACLE_SYSTEM_PROMPT,
    temperature: 0.3,
  });

  return {
    interpretation,
    queryType,
    timestamp: new Date().toISOString(),
    disclaimer: 'AI-generated interpretation. Not financial advice. Deterministic metrics are the authoritative source. All observations are based on data provided and may not reflect real-time conditions.',
  };
}
