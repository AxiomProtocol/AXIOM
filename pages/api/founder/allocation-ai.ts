import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { validateAdminKey } from '@/src/config/adminRoles';
import { generateText } from '@/lib/server/gemini';
import { ALLOCATION_ASSETS, normalizeWeights, weightsSum, type AllocationWeights, type AllocationAssetKey } from '@/lib/allocation/assets';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

interface AiAllocationResponse {
  success: boolean;
  scope?: 'driver' | 'treasury';
  net_pay?: number;
  share_pct?: number;
  scope_amount?: number;
  weights?: AllocationWeights;
  rationale?: string;
  warnings?: string[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AiAllocationResponse>) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const body = (req.body ?? {}) as { documentId?: string; scope?: 'driver' | 'treasury' };
    const documentId = String(body.documentId ?? '').trim();
    const scope: 'driver' | 'treasury' = body.scope === 'treasury' ? 'treasury' : 'driver';
    if (!documentId) return res.status(400).json({ success: false, error: 'documentId is required' });

    const docRes = await pool().query(
      `SELECT e.payload, e.status, e.confidence
         FROM pilot_settlement_extractions e
        WHERE e.document_id = $1`,
      [documentId],
    );
    if (docRes.rows.length === 0) return res.status(404).json({ success: false, error: 'No extraction for this document' });
    const payload = docRes.rows[0].payload as Record<string, unknown> | null;
    const netPay = Number(payload?.total_net_pay_current);
    if (!payload || !Number.isFinite(netPay) || netPay <= 0) {
      return res.status(422).json({ success: false, error: 'Net pay missing from extraction; cannot generate allocation' });
    }

    const policyRes = await pool().query<{ scope: 'driver' | 'treasury'; share_pct: number; weights: AllocationWeights }>(
      `SELECT scope, share_pct::float AS share_pct, weights FROM pilot_allocation_policies WHERE scope=$1`,
      [scope],
    );
    const policy = policyRes.rows[0];
    const sharePct  = policy?.share_pct ?? (scope === 'driver' ? 80 : 20);
    const baseline  = policy?.weights   ?? null;
    const scopeAmount = Math.round((netPay * sharePct) * 10) / 1000; // round to cents

    const assetCatalog = ALLOCATION_ASSETS.map(a => `${a.key} (${a.label}, ${a.category}): ${a.note}`).join('\n');
    const fixedSplitText = baseline
      ? ALLOCATION_ASSETS.filter(a => (baseline[a.key] || 0) > 0).map(a => `${a.key}: ${baseline[a.key]}%`).join(', ')
      : '(none configured)';

    const prompt = `You are an allocation engineer for the Axiom Protocol — a sovereign digital-physical economy with a gold reserve (AXAU), silver reserve (KAG), unified stablecoin (AXUSD), and supported external assets (PAXG, USDC, WBTC, cbETH).

A weekly settlement statement was just filed. We need an allocation recommendation for the **${scope.toUpperCase()}** share of net pay.

Statement context:
- Driver: ${String(payload.driver_name ?? 'unknown')}
- Statement date: ${String(payload.statement_date ?? 'unknown')}
- Net pay (full): $${netPay.toFixed(2)}
- ${scope} share of net pay: ${sharePct}% = $${scopeAmount.toFixed(2)}
- Total miles: ${String(payload.total_miles ?? '—')} (loaded ${String(payload.loaded_miles ?? '—')} / empty ${String(payload.empty_miles ?? '—')})
- Total deductions this week: $${Number(payload.total_deductions_current ?? 0).toFixed(2)}
- Escrow movement this week: $${Number(payload.escrow_current ?? 0).toFixed(2)}
- Escrow ending balance: $${Number(payload.escrow_ending_balance ?? 0).toFixed(2)}

Operator's fixed-policy baseline for this scope: ${fixedSplitText}

Available assets (use these exact keys):
${assetCatalog}

Generate an allocation recommendation **for this week only** that may differ from the baseline if conditions warrant (e.g. negative escrow week → favor liquid stablecoins; large deductions → boost cash reserve; light deduction week → favor reserve assets like AXAU/PAXG/KAG).

For the ${scope} scope:
${scope === 'driver'
    ? '- Always keep at least 25% in operating_spend or cash_reserve (drivers need liquidity for fuel and personal bills).'
    : '- Treasury should favor reserve assets (AXAU, PAXG, KAG) and AXUSD; minimize operating_spend (target 0%).'}
- Weights MUST sum to exactly 100.
- Use 0 for any asset you choose not to allocate to.
- Round each weight to a whole number.

Respond with ONLY valid JSON in this exact shape (no prose, no markdown fences):
{
  "weights": { "axau": 0, "kag": 0, "paxg": 0, "axusd": 0, "usdc": 0, "wbtc": 0, "cbeth": 0, "cash_reserve": 0, "operating_spend": 0 },
  "rationale": "1-3 sentence justification explaining the deltas vs. the baseline."
}`;

    const raw = await generateText(prompt, { model: 'gemini-2.5-flash' });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ success: false, error: 'AI returned no JSON object' });

    let parsed: { weights?: unknown; rationale?: unknown };
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { return res.status(502).json({ success: false, error: 'AI JSON parse failed' }); }

    const weights = normalizeWeights(parsed.weights);
    const sum = weightsSum(weights);
    const warnings: string[] = [];
    if (Math.abs(sum - 100) > 0.5) {
      // Renormalize to 100 so the UI never sees a malformed total.
      if (sum > 0) {
        for (const a of ALLOCATION_ASSETS) weights[a.key as AllocationAssetKey] = Math.round((weights[a.key as AllocationAssetKey] / sum) * 100);
        warnings.push(`AI weights summed to ${sum}; renormalized to 100.`);
      }
    }

    return res.status(200).json({
      success: true,
      scope,
      net_pay: netPay,
      share_pct: sharePct,
      scope_amount: Math.round(netPay * sharePct) / 100,
      weights,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      warnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI allocation failed';
    console.error('[allocation-ai]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
