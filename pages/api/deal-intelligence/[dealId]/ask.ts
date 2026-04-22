import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { generateText } from '../../../../lib/server/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawDealId = req.query.dealId;
  const dealId = Array.isArray(rawDealId) ? rawDealId[0] : rawDealId;
  if (!dealId) return res.status(400).json({ error: 'dealId is required' });

  const { question, scenarioId } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

  try {
    // ── Load deal + property ──────────────────────────────────────────────
    const dealResult = await pool.query(
      `SELECT rd.deal_name, rd.strategy, rd.status, rd.notes, rd.target_purchase_price,
              rp.address_normalized, rp.city, rp.state, rp.zip,
              rp.property_type, rp.year_built, rp.sqft, rp.lot_sqft,
              rp.bedrooms, rp.bathrooms, rp.stories, rp.units
       FROM re_deals rd
       LEFT JOIN re_properties rp ON rp.id = rd.property_id
       WHERE rd.id = $1 LIMIT 1`,
      [dealId],
    );
    const deal = dealResult.rows[0];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    // ── Load scenario (latest if no scenarioId) ───────────────────────────
    const scenarioResult = await pool.query(
      scenarioId
        ? `SELECT id FROM re_deal_scenarios WHERE id = $1 LIMIT 1`
        : `SELECT id FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [scenarioId || dealId],
    );
    const scenario = scenarioResult.rows[0];

    // ── Load assumptions ──────────────────────────────────────────────────
    let assumptions: any = {};
    let metrics: any = {};
    let riskFlags: any[] = [];
    if (scenario?.id) {
      const [aRes, mRes, rRes] = await Promise.all([
        pool.query(`SELECT * FROM re_deal_assumptions WHERE scenario_id = $1 LIMIT 1`, [scenario.id]),
        pool.query(`SELECT * FROM re_deal_metrics WHERE scenario_id = $1 LIMIT 1`, [scenario.id]),
        pool.query(`SELECT flag_type, severity, message, detail FROM re_risk_flags WHERE scenario_id = $1`, [scenario.id]),
      ]);
      assumptions = aRes.rows[0] || {};
      metrics = mRes.rows[0] || {};
      riskFlags = rRes.rows;
    }

    // ── Load scope ────────────────────────────────────────────────────────
    const scopeRes = await pool.query(
      `SELECT rs.scope_name, rs.recommended_budget, rs.confidence, rs.package_mix
       FROM re_rehab_scopes rs
       WHERE rs.deal_id = $1 ORDER BY rs.created_at DESC LIMIT 1`,
      [dealId],
    );
    const scope = scopeRes.rows[0];

    // ── Load latest inspection session summary ────────────────────────────
    const inspectionRes = await pool.query(
      `SELECT session_name, total_units, units_walked, sampling_confidence_score, summary_json, property_type
       FROM field_inspection_sessions
       WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [dealId],
    );
    const inspection = inspectionRes.rows[0];

    // ── Build context block ───────────────────────────────────────────────
    const location = [deal.address_normalized || '', deal.city, deal.state, deal.zip].filter(Boolean).join(', ');
    const packageMix = scope?.package_mix || {};

    const contextLines: string[] = [
      `DEAL: ${deal.deal_name}`,
      `LOCATION: ${location || 'Not specified'}`,
      `PROPERTY TYPE: ${deal.property_type || inspection?.property_type || 'Unknown'} | Year Built: ${deal.year_built || 'Unknown'} | SqFt: ${deal.sqft || 'Unknown'}`,
      `STRATEGY: ${deal.strategy || 'Not set'} | STATUS: ${deal.status || 'active'}`,
      '',
      '── ASSUMPTIONS ──',
      `Purchase Price: $${Number(assumptions.purchase_price || deal.target_purchase_price || 0).toLocaleString()}`,
      `ARV Estimate: $${Number(assumptions.arv_estimate || 0).toLocaleString()}`,
      `Rehab Budget: $${Number(assumptions.rehab_budget || 0).toLocaleString()}`,
      `Monthly Rent: $${Number(assumptions.monthly_rent || 0).toLocaleString()}`,
      `Down Payment: ${Number(assumptions.down_payment_pct || 0).toFixed(1)}%`,
      `Interest Rate: ${Number(assumptions.interest_rate || 0).toFixed(2)}%`,
      `Vacancy: ${Number(assumptions.vacancy_pct || 0).toFixed(1)}%`,
      `Hold Period: ${assumptions.hold_period_months || 0} months`,
    ];

    if (metrics.noi) {
      contextLines.push('', '── COMPUTED METRICS ──');
      if (metrics.noi) contextLines.push(`NOI: $${Number(metrics.noi).toLocaleString()}`);
      if (metrics.cap_rate) contextLines.push(`Cap Rate: ${Number(metrics.cap_rate).toFixed(2)}%`);
      if (metrics.cash_on_cash) contextLines.push(`Cash-on-Cash: ${Number(metrics.cash_on_cash).toFixed(2)}%`);
      if (metrics.dscr) contextLines.push(`DSCR: ${Number(metrics.dscr).toFixed(2)}`);
      if (metrics.monthly_cash_flow) contextLines.push(`Monthly Cash Flow: $${Number(metrics.monthly_cash_flow).toLocaleString()}`);
      if (metrics.deal_grade) contextLines.push(`Deal Grade: ${metrics.deal_grade}`);
    }

    if (riskFlags.length > 0) {
      contextLines.push('', '── RISK FLAGS ──');
      for (const flag of riskFlags.slice(0, 8)) {
        contextLines.push(`[${flag.severity?.toUpperCase()}] ${flag.flag_type}: ${flag.message}`);
      }
    }

    if (scope) {
      contextLines.push('', '── REHAB SCOPE ──');
      contextLines.push(`Scope: ${scope.scope_name}`);
      contextLines.push(`Recommended Budget: $${Number(scope.recommended_budget).toLocaleString()}`);
      contextLines.push(`Confidence: ${Math.round(Number(scope.confidence || 0) * 100)}%`);
      if (packageMix.recommended_tier) contextLines.push(`Recommended Tier: ${packageMix.recommended_tier} — ${packageMix.recommended_strategy}`);
      if (packageMix.region) contextLines.push(`Regional Pricing: ${packageMix.region.name} (${packageMix.region.factor}x)`);
    }

    if (inspection) {
      contextLines.push('', '── FIELD INSPECTION ──');
      contextLines.push(`Session: ${inspection.session_name}`);
      contextLines.push(`Units Walked: ${inspection.units_walked} of ${inspection.total_units} (${Math.round((inspection.units_walked / Math.max(inspection.total_units, 1)) * 100)}% sample)`);
      contextLines.push(`Confidence Score: ${Math.round(Number(inspection.sampling_confidence_score || 0) * 100)}%`);
    }

    const context = contextLines.join('\n');

    const prompt = `You are the Deal Assistant for Axiom Protocol, an institutional real estate underwriting platform.
You help operators quickly understand deals. Answer questions accurately and concisely using only the data below.

Rules:
- If data is missing or zero, say so honestly — do not estimate or guess.
- Do not recommend investments or provide legal/financial advice.
- Keep answers under 150 words unless the question specifically requires more detail.
- Use institutional real estate vocabulary.

DEAL DATA:
${context}

QUESTION: ${question.trim()}

Answer:`;

    const answer = await generateText(prompt, { model: 'gemini-3-flash', temperature: 0.2 });

    return res.status(200).json({ answer: answer.trim(), dealId, question: question.trim() });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to process question', details: error?.message || String(error) });
  }
}
