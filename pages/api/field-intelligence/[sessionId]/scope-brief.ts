import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { generateText } from '../../../../lib/server/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawSessionId = req.query.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const sessionResult = await pool.query(
      `SELECT fis.*, rd.deal_name, rd.strategy, rp.city, rp.state, rp.zip
       FROM field_inspection_sessions fis
       LEFT JOIN re_deals rd ON rd.id = fis.deal_id
       LEFT JOIN re_properties rp ON rp.id = rd.property_id
       WHERE fis.id = $1 LIMIT 1`,
      [sessionId],
    );
    const session = sessionResult.rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const scopeResult = await pool.query(
      `SELECT * FROM re_rehab_scopes WHERE inspection_session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sessionId],
    );
    const scope = scopeResult.rows[0];
    if (!scope) return res.status(404).json({ error: 'No scope found for this session. Generate a scope first.' });

    const packageMix = scope.package_mix || {};
    const recommendedTier = packageMix.recommended_tier || 'standard';
    const recommendedStrategy = packageMix.recommended_strategy || 'flip';
    const region = packageMix.region || { name: 'National Average', factor: 1.0 };

    const lineItems = scope.line_items || {};
    const recommendedScope = lineItems[recommendedStrategy]?.[recommendedTier] || {};
    const lineItemLines = (recommendedScope.line_items || [])
      .map((li: any) => `  - ${li.description}: $${Number(li.cost).toLocaleString()}`)
      .join('\n');

    const totalUnits = session.total_units || 1;
    const unitsWalked = session.units_walked || 1;
    const samplingPct = Math.round((unitsWalked / totalUnits) * 100);
    const recommendedBudget = Number(scope.recommended_budget) || 0;
    const perUnit = totalUnits > 0 ? Math.round(recommendedBudget / totalUnits) : 0;
    const confidence = Math.round(Number(scope.confidence || 0) * 100);
    const location = [session.city, session.state].filter(Boolean).join(', ') || 'subject property';
    const propertyType = session.property_type === 'sfr' ? 'Single Family Residence' : 'Multi-Family';

    const prompt = `You are a professional real estate field underwriter writing a brief for an internal deal file.

Write a field scope brief of exactly 4-5 sentences. Be direct, factual, and institutional in tone.
Do NOT invent any numbers — only use the data provided below. Do not use the word "I".

PROPERTY: ${session.deal_name || 'Subject Property'}
LOCATION: ${location}
TYPE: ${propertyType} — ${totalUnits} units
INSPECTION: ${unitsWalked} of ${totalUnits} units walked (${samplingPct}% sample)
REGIONAL PRICING: ${region.name} (${region.factor < 1 ? Math.round((1 - region.factor) * 100) + '% below national' : region.factor > 1 ? Math.round((region.factor - 1) * 100) + '% above national' : 'national average'})
RECOMMENDED EXIT: ${recommendedStrategy.toUpperCase()} — ${recommendedTier.replace('_', ' ')} scope
RECOMMENDED BUDGET: $${recommendedBudget.toLocaleString()} ($${perUnit.toLocaleString()} per unit)
CONFIDENCE: ${confidence}%

TOP LINE ITEMS:
${lineItemLines || '  - No line items recorded'}

RATIONALE: ${recommendedScope.rationale || ''}

Write the brief now. Start with the property name and location. Cover: what was inspected, what condition was found, what the recommended scope is, the budget, and what the confidence is based on. End with one sentence about the regional pricing applied.`;

    const brief = await generateText(prompt, { model: 'gemini-3-flash', temperature: 0.3 });

    return res.status(200).json({ brief: brief.trim(), sessionId, scopeId: scope.id });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate scope brief', details: error?.message || String(error) });
  }
}
