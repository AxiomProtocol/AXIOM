import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import axios from 'axios';

type Grade = 'A' | 'B' | 'C' | 'WATCH' | 'ALERT';

interface DimensionResult {
  id: string;
  label: string;
  grade: Grade;
  score: number;
  keyMetric: string;
  trend: 'up' | 'up-slightly' | 'flat' | 'down-slightly' | 'down';
  thesis: string;
  weight: number;
}

interface PRSResponse {
  prs: number;
  grade: 'FAVORABLE' | 'NEUTRAL' | 'CAUTION' | 'RESTRICTED';
  dimensions: DimensionResult[];
  computedAt: string;
}

function gradeToScore(g: Grade): number {
  switch (g) {
    case 'A': return 10;
    case 'B': return 7;
    case 'C': return 4;
    case 'WATCH': return 5;
    case 'ALERT': return 2;
    default: return 5;
  }
}

function prsOverallGrade(prs: number): 'FAVORABLE' | 'NEUTRAL' | 'CAUTION' | 'RESTRICTED' {
  if (prs >= 7) return 'FAVORABLE';
  if (prs >= 5) return 'NEUTRAL';
  if (prs >= 3) return 'CAUTION';
  return 'RESTRICTED';
}

async function digitalCommodityIntelligence(): Promise<DimensionResult> {
  const weight = 0.15;
  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'bitcoin,ethereum,chainlink',
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
        timeout: 6000,
      }
    );

    const btcChange = data?.bitcoin?.usd_24h_change ?? 0;
    const ethChange = data?.ethereum?.usd_24h_change ?? 0;
    const linkChange = data?.chainlink?.usd_24h_change ?? 0;
    const avgChange = (btcChange + ethChange + linkChange) / 3;

    const btcPrice = data?.bitcoin?.usd ?? 0;

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (avgChange > 2) {
      grade = 'A';
      trend = 'up';
      thesis = 'Digital commodity basket trending upward — favorable accumulation conditions for treasury deployment.';
    } else if (avgChange > 0.3) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = 'Moderate positive momentum across BTC/ETH/LINK — watch for continuation before deploying.';
    } else if (avgChange > -1) {
      grade = 'C';
      trend = 'flat';
      thesis = 'Basket range-bound — no clear directional conviction. Hold current allocation.';
    } else if (avgChange > -3) {
      grade = 'WATCH';
      trend = 'down-slightly';
      thesis = 'Mild pullback in digital commodities — monitor for potential accumulation entry.';
    } else {
      grade = 'ALERT';
      trend = 'down';
      thesis = 'Significant drawdown across digital commodity basket — delay new deployments, protect treasury.';
    }

    return {
      id: 'digital-commodity',
      label: 'Digital Commodity Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `BTC $${btcPrice.toLocaleString()} (${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}% avg 24h)`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'digital-commodity',
      label: 'Digital Commodity Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Market data unavailable',
      trend: 'flat',
      thesis: 'External price feeds temporarily unavailable. Hold current positions.',
      weight,
    };
  }
}

async function protocolHealthIntelligence(): Promise<DimensionResult> {
  const weight = 0.20;
  try {
    const result = await pool.query(
      `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return {
        id: 'protocol-health',
        label: 'Protocol Health Intelligence',
        grade: 'WATCH',
        score: 5,
        keyMetric: 'No solvency snapshot available',
        trend: 'flat',
        thesis: 'Protocol health snapshot not yet generated. Run solvency computation to initialize.',
        weight,
      };
    }

    const payload = typeof result.rows[0].payload_json === 'string'
      ? JSON.parse(result.rows[0].payload_json)
      : result.rows[0].payload_json;

    const cr = parseFloat(payload.coverageRatio) || 0;
    const supply = parseFloat(payload.liabilitiesTotalUsd) || 0;
    const liquidity = parseFloat(payload.treasuryLiquidUsd) || 0;
    const policyMode: string = payload.policyMode || 'UNKNOWN';

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (cr >= 1.5) {
      grade = 'A';
      trend = 'up';
      thesis = `Coverage ratio ${cr.toFixed(2)}x — protocol overcollateralized with strong buffer. AXUSD peg structurally secure.`;
    } else if (cr >= 1.1) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = `Coverage ratio ${cr.toFixed(2)}x — adequate collateral buffer. Peg stable. Monitor for expansion below 1.1x.`;
    } else if (cr >= 1.0) {
      grade = 'C';
      trend = 'flat';
      thesis = `Coverage ratio ${cr.toFixed(2)}x — minimal buffer. Prioritize reserve growth before further AXUSD issuance.`;
    } else if (cr > 0) {
      grade = policyMode === 'BOOTSTRAP' ? 'WATCH' : 'ALERT';
      trend = 'down';
      thesis = `Coverage ratio ${cr.toFixed(6)}x — ${policyMode} phase. Treasury at $${liquidity.toFixed(2)} vs $${supply.toLocaleString(undefined, { maximumFractionDigits: 0 })} AXUSD outstanding. Treasury expansion is the protocol priority.`;
    } else {
      grade = 'WATCH';
      trend = 'flat';
      thesis = 'Protocol in bootstrap phase. Solvency metrics initializing.';
    }

    return {
      id: 'protocol-health',
      label: 'Protocol Health Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `CR ${cr.toFixed(4)}x | AXUSD $${supply.toLocaleString(undefined, { maximumFractionDigits: 0 })} | Liquid $${liquidity.toFixed(2)} | ${policyMode}`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'protocol-health',
      label: 'Protocol Health Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Protocol health data unavailable',
      trend: 'flat',
      thesis: 'Unable to read solvency data at this time.',
      weight,
    };
  }
}

async function realAssetMarketIntelligence(): Promise<DimensionResult> {
  const weight = 0.15;
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error('No Alpha Vantage key');

    const { data } = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'VNQ',
        apikey: apiKey,
      },
      timeout: 8000,
    });

    const quote = data?.['Global Quote'];
    const changePercent = quote?.['10. change percent']?.replace('%', '') ?? '0';
    const price = parseFloat(quote?.['05. price'] ?? '0');
    const change = parseFloat(changePercent);

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (change > 1) {
      grade = 'A';
      trend = 'up';
      thesis = `REIT index VNQ up ${change.toFixed(2)}% — real estate market momentum favorable for acquisition timing.`;
    } else if (change > 0) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = `Real estate market mildly positive (+${change.toFixed(2)}%). Conditions supportive for property pipeline advancement.`;
    } else if (change > -1) {
      grade = 'C';
      trend = 'flat';
      thesis = 'Real estate market range-bound. Standard underwriting discipline applies.';
    } else if (change > -2) {
      grade = 'WATCH';
      trend = 'down-slightly';
      thesis = `VNQ pulling back (${change.toFixed(2)}%). Review acquisition timing — market softening may create better entry.`;
    } else {
      grade = 'ALERT';
      trend = 'down';
      thesis = `Real estate market under pressure (VNQ ${change.toFixed(2)}%). Pause new acquisition commitments pending stabilization.`;
    }

    return {
      id: 'real-asset-market',
      label: 'Real Asset Market Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `VNQ $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}% today)`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'real-asset-market',
      label: 'Real Asset Market Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Market data temporarily unavailable',
      trend: 'flat',
      thesis: 'Real estate market data unavailable. Proceed with standard underwriting discipline.',
      weight,
    };
  }
}

async function constructionCostIntelligence(): Promise<DimensionResult> {
  const weight = 0.10;
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS signal_count,
        AVG(confidence::numeric) AS avg_confidence,
        AVG(capex_per_unit::numeric) AS avg_capex,
        MAX(created_at) AS last_updated
      FROM market_cost_signals
      WHERE capex_per_unit IS NOT NULL
    `);

    const row = result.rows[0];
    const signalCount = parseInt(row.signal_count) || 0;
    const avgConfidence = parseFloat(row.avg_confidence) || 0;
    const avgCapex = parseFloat(row.avg_capex) || 0;

    if (signalCount === 0) {
      return {
        id: 'construction-cost',
        label: 'Construction Cost Intelligence',
        grade: 'WATCH',
        score: 5,
        keyMetric: 'No cost signals recorded',
        trend: 'flat',
        thesis: 'No market cost signals on record. Seed construction benchmarks to activate this dimension.',
        weight,
      };
    }

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (avgConfidence >= 0.75 && signalCount >= 5) {
      grade = 'A';
      trend = 'flat';
      thesis = `${signalCount} cost signals at ${(avgConfidence * 100).toFixed(0)}% avg confidence — underwriting benchmarks well-calibrated.`;
    } else if (avgConfidence >= 0.50) {
      grade = 'B';
      trend = 'flat';
      thesis = `${signalCount} cost signals at ${(avgConfidence * 100).toFixed(0)}% confidence — moderate calibration. Add more field data to improve.`;
    } else {
      grade = 'C';
      trend = 'down-slightly';
      thesis = `Low confidence cost signals (${(avgConfidence * 100).toFixed(0)}%). Rehab underwriting carries elevated estimation risk.`;
    }

    return {
      id: 'construction-cost',
      label: 'Construction Cost Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `Avg $${avgCapex.toFixed(0)}/unit | ${signalCount} signals | ${(avgConfidence * 100).toFixed(0)}% confidence`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'construction-cost',
      label: 'Construction Cost Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Cost data unavailable',
      trend: 'flat',
      thesis: 'Construction cost signals temporarily unavailable.',
      weight,
    };
  }
}

async function dealFlowVelocityIntelligence(): Promise<DimensionResult> {
  const weight = 0.10;
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_deals,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS recent_deals,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'rejected', 'archived'))::int AS active_deals
      FROM re_deals
    `);

    const row = result.rows[0];
    const totalDeals = parseInt(row.total_deals) || 0;
    const recentDeals = parseInt(row.recent_deals) || 0;
    const activeDeals = parseInt(row.active_deals) || 0;

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (recentDeals >= 5 || activeDeals >= 3) {
      grade = 'A';
      trend = 'up';
      thesis = `${recentDeals} deals entered in last 30 days — acquisition pipeline active. Strong opportunity window.`;
    } else if (recentDeals >= 2 || activeDeals >= 1) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = `${totalDeals} total deals in pipeline — moderate velocity. Continue sourcing to build selection depth.`;
    } else if (totalDeals > 0) {
      grade = 'C';
      trend = 'flat';
      thesis = `${totalDeals} deals on record — pipeline seeded but not yet active. Accelerate sourcing and underwriting.`;
    } else {
      grade = 'WATCH';
      trend = 'down-slightly';
      thesis = 'No deals in pipeline yet. Bootstrap phase — distressed feed and direct sourcing are the priority.';
    }

    return {
      id: 'deal-flow',
      label: 'Deal Flow Velocity Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `${totalDeals} total | ${recentDeals} last 30d | ${activeDeals} active`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'deal-flow',
      label: 'Deal Flow Velocity Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Pipeline data unavailable',
      trend: 'flat',
      thesis: 'Deal flow data temporarily unavailable.',
      weight,
    };
  }
}

async function creditPortfolioIntelligence(): Promise<DimensionResult> {
  const weight = 0.10;
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'drawn')::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'drawn' AND repayment_due_date < NOW())::int AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'defaulted')::int AS default_count,
        COUNT(*) FILTER (WHERE status = 'repaid')::int AS repaid_count,
        COALESCE(SUM(outstanding_balance_usd) FILTER (WHERE status = 'drawn'), 0)::numeric AS outstanding_usd,
        COALESCE(SUM(interest_earned_usd), 0)::numeric AS total_interest
      FROM income_credit_lines
    `);

    const row = result.rows[0];
    const total = parseInt(row.total) || 0;
    const active = parseInt(row.active_count) || 0;
    const overdue = parseInt(row.overdue_count) || 0;
    const defaults = parseInt(row.default_count) || 0;
    const repaid = parseInt(row.repaid_count) || 0;
    const outstanding = parseFloat(row.outstanding_usd) || 0;
    const interest = parseFloat(row.total_interest) || 0;

    if (total === 0) {
      return {
        id: 'credit-portfolio',
        label: 'Credit Portfolio Intelligence',
        grade: 'WATCH',
        score: 5,
        keyMetric: 'No credit lines originated',
        trend: 'flat',
        thesis: 'Credit portfolio not yet activated. Bootstrap phase — first credit line origination pending.',
        weight,
      };
    }

    const overdueRate = active > 0 ? overdue / active : 0;
    const defaultRate = total > 0 ? defaults / total : 0;

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (overdue === 0 && defaults === 0) {
      grade = 'A';
      trend = 'up';
      thesis = `${active} active credit lines — 0% overdue rate. Credit portfolio clean. Interest yield: $${interest.toFixed(0)} collected.`;
    } else if (overdueRate < 0.05 && defaultRate < 0.02) {
      grade = 'B';
      trend = 'flat';
      thesis = `${overdue} overdue (${(overdueRate * 100).toFixed(1)}% rate) — within acceptable range. Monitor for escalation.`;
    } else if (overdueRate < 0.15) {
      grade = 'WATCH';
      trend = 'down-slightly';
      thesis = `Credit stress emerging — ${overdue} overdue lines (${(overdueRate * 100).toFixed(1)}% rate). Initiate workout review.`;
    } else {
      grade = 'ALERT';
      trend = 'down';
      thesis = `Elevated credit distress — ${overdue} overdue, ${defaults} defaulted. Portfolio requires immediate intervention.`;
    }

    return {
      id: 'credit-portfolio',
      label: 'Credit Portfolio Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `$${outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })} outstanding | ${overdue} overdue | ${repaid} repaid`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'credit-portfolio',
      label: 'Credit Portfolio Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Credit data unavailable',
      trend: 'flat',
      thesis: 'Credit portfolio data temporarily unavailable.',
      weight,
    };
  }
}

async function communityCoordinationIntelligence(): Promise<DimensionResult> {
  const weight = 0.10;
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_groups,
        COUNT(*) FILTER (WHERE is_active = true)::int AS active_groups,
        COALESCE(AVG(member_count::numeric), 0) AS avg_members,
        COALESCE(SUM(contribution_amount::numeric * member_count::numeric), 0) AS total_committed
      FROM susu_purpose_groups
    `);

    const row = result.rows[0];
    const totalGroups = parseInt(row.total_groups) || 0;
    const activeGroups = parseInt(row.active_groups) || 0;
    const avgMembers = parseFloat(row.avg_members) || 0;
    const totalCommitted = parseFloat(row.total_committed) || 0;

    if (totalGroups === 0) {
      return {
        id: 'community-coordination',
        label: 'Community Coordination Intelligence',
        grade: 'WATCH',
        score: 5,
        keyMetric: 'No Wealth Practice groups yet',
        trend: 'flat',
        thesis: 'Community coordination not yet initialized. First Wealth Practice group formation is the priority.',
        weight,
      };
    }

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (activeGroups >= 5) {
      grade = 'A';
      trend = 'up';
      thesis = `${activeGroups} active Wealth Practice groups — community capital coordination operating at scale. $${totalCommitted.toFixed(0)} committed.`;
    } else if (activeGroups >= 2) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = `${activeGroups} active Wealth Practice groups with avg ${avgMembers.toFixed(1)} members — community coordination building.`;
    } else if (activeGroups >= 1) {
      grade = 'C';
      trend = 'flat';
      thesis = `${activeGroups} active group — initial community coordination established. Scale to 5+ groups for full capital impact.`;
    } else {
      grade = 'WATCH';
      trend = 'down-slightly';
      thesis = `${totalGroups} groups registered but none active — coordination stalled. Re-engage group members to restart cycles.`;
    }

    return {
      id: 'community-coordination',
      label: 'Community Coordination Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `${activeGroups} active / ${totalGroups} total groups | ~${avgMembers.toFixed(0)} members avg`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'community-coordination',
      label: 'Community Coordination Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Community data unavailable',
      trend: 'flat',
      thesis: 'Community coordination data temporarily unavailable.',
      weight,
    };
  }
}

async function modelAccuracyIntelligence(): Promise<DimensionResult> {
  const weight = 0.05;
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_variances,
        AVG(ABS(variance_pct::numeric)) AS avg_abs_variance,
        MAX(created_at) AS last_outcome
      FROM prediction_actual_variances
      WHERE variance_pct IS NOT NULL
    `);

    const row = result.rows[0];
    const total = parseInt(row.total_variances) || 0;
    const avgVariance = parseFloat(row.avg_abs_variance) || 0;

    if (total === 0) {
      return {
        id: 'model-accuracy',
        label: 'Model Accuracy Intelligence',
        grade: 'WATCH',
        score: 5,
        keyMetric: 'No outcomes recorded yet',
        trend: 'flat',
        thesis: 'No verified outcomes on record. IVCEE model accuracy tracking initializes after first project completion.',
        weight,
      };
    }

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (avgVariance <= 5) {
      grade = 'A';
      trend = 'up';
      thesis = `Avg prediction variance ${avgVariance.toFixed(1)}% across ${total} metrics — IVCEE underwriting model well-calibrated.`;
    } else if (avgVariance <= 15) {
      grade = 'B';
      trend = 'flat';
      thesis = `Avg prediction variance ${avgVariance.toFixed(1)}% — model acceptable. Review outlier metrics to tighten assumptions.`;
    } else if (avgVariance <= 30) {
      grade = 'C';
      trend = 'down-slightly';
      thesis = `Avg prediction variance ${avgVariance.toFixed(1)}% — model drifting. Recalibrate IVCEE assumptions against outcomes.`;
    } else {
      grade = 'ALERT';
      trend = 'down';
      thesis = `High prediction error (${avgVariance.toFixed(1)}% avg variance) — underwriting assumptions need systematic review.`;
    }

    return {
      id: 'model-accuracy',
      label: 'Model Accuracy Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `${avgVariance.toFixed(1)}% avg prediction variance | ${total} data points`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'model-accuracy',
      label: 'Model Accuracy Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Model accuracy data unavailable',
      trend: 'flat',
      thesis: 'Model accuracy data temporarily unavailable.',
      weight,
    };
  }
}

async function growthVelocityIntelligence(): Promise<DimensionResult> {
  const weight = 0.05;
  try {
    const usersResult = await pool.query(`
      SELECT COUNT(*)::int AS total FROM users
    `);
    const recentResult = await pool.query(`
      SELECT COUNT(*)::int AS recent_users FROM users WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    const leadsResult = await pool.query(`
      SELECT COUNT(*)::int AS total_leads FROM leads
    `).catch(() => ({ rows: [{ total_leads: 0 }] }));
    const pmaResult = await pool.query(`
      SELECT COUNT(*)::int AS total_apps FROM pma_applications
    `).catch(() => ({ rows: [{ total_apps: 0 }] }));

    const totalUsers = parseInt(usersResult.rows[0]?.total) || 0;
    const recentUsers = parseInt(recentResult.rows[0]?.recent_users) || 0;
    const totalLeads = parseInt(leadsResult.rows[0]?.total_leads) || 0;
    const totalApps = parseInt(pmaResult.rows[0]?.total_apps) || 0;

    let grade: Grade;
    let trend: DimensionResult['trend'];
    let thesis: string;

    if (recentUsers >= 50 || totalUsers >= 500) {
      grade = 'A';
      trend = 'up';
      thesis = `${recentUsers} new users in 30 days — strong adoption momentum. ${totalLeads} leads in pipeline.`;
    } else if (recentUsers >= 10 || totalUsers >= 100) {
      grade = 'B';
      trend = 'up-slightly';
      thesis = `${totalUsers} total users, ${recentUsers} new this month — steady growth. Increase community outreach.`;
    } else if (totalUsers > 0) {
      grade = 'C';
      trend = 'flat';
      thesis = `${totalUsers} registered users — early-stage growth. ${totalApps} PMA applications submitted.`;
    } else {
      grade = 'WATCH';
      trend = 'flat';
      thesis = 'Platform in pre-launch phase. Growth metrics will initialize with first user registrations.';
    }

    return {
      id: 'growth-velocity',
      label: 'Growth Velocity Intelligence',
      grade,
      score: gradeToScore(grade),
      keyMetric: `${totalUsers.toLocaleString()} users | ${recentUsers} new (30d) | ${totalLeads} leads`,
      trend,
      thesis,
      weight,
    };
  } catch {
    return {
      id: 'growth-velocity',
      label: 'Growth Velocity Intelligence',
      grade: 'WATCH',
      score: 5,
      keyMetric: 'Growth data unavailable',
      trend: 'flat',
      thesis: 'Growth velocity data temporarily unavailable.',
      weight,
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [
    dim1,
    dim2,
    dim3,
    dim4,
    dim5,
    dim6,
    dim7,
    dim8,
    dim9,
  ] = await Promise.all([
    digitalCommodityIntelligence(),
    protocolHealthIntelligence(),
    realAssetMarketIntelligence(),
    constructionCostIntelligence(),
    dealFlowVelocityIntelligence(),
    creditPortfolioIntelligence(),
    communityCoordinationIntelligence(),
    modelAccuracyIntelligence(),
    growthVelocityIntelligence(),
  ]);

  const dimensions = [dim1, dim2, dim3, dim4, dim5, dim6, dim7, dim8, dim9];

  const prs = dimensions.reduce((acc, d) => acc + d.score * d.weight, 0);
  const normalizedPrs = Math.min(10, Math.max(0, prs));

  const response: PRSResponse = {
    prs: parseFloat(normalizedPrs.toFixed(1)),
    grade: prsOverallGrade(normalizedPrs),
    dimensions,
    computedAt: new Date().toISOString(),
  };

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).json(response);
}
