/**
 * Axiom — AI Auto-Allocation Service
 *
 * Triggered automatically after a wallet top-up credit is confirmed.
 * Uses Gemini to recommend a bucket split aligned with the configured
 * AllocationPolicy, then writes the result to treasury_allocations.
 *
 * Non-blocking: callers fire-and-forget. All failures are caught and
 * logged — they never block the wallet credit path.
 */

import { db } from '../../server/db';
import { treasuryAllocations } from '../../shared/treasurySchema';
import { capAuditEvents } from '../../shared/capInfraSchema';
import { allocationPolicyService } from '../services/AllocationPolicyService';
import { generateText } from '../server/gemini';
import { generateId } from '../capinfra/ids';
import { customAlphabet } from 'nanoid';

const nanoid8 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

// Canonical bucket → primary asset mapping
const BUCKET_ASSET: Record<string, string> = {
  operating_cash:       'USD',
  settlement_liquidity: 'USDC',
  reserve:              'PAXG',
  capital_deployment:   'USD',
  protocol_ops:         'USD',
};

export interface AutoAllocResult {
  runId: string;
  amountUsd: number;
  buckets: Array<{ bucket: string; pct: number; usdAmount: number; asset: string }>;
  rationale: string;
  source: 'AUTO_AI';
}

/**
 * Run an AI-driven allocation for a wallet top-up deposit.
 * Writes one treasury_allocations row per bucket and one audit event.
 */
export async function runAutoAlloc(opts: {
  amountCents: number;
  depositId: string;
}): Promise<AutoAllocResult> {
  const { amountCents, depositId } = opts;
  const amountUsd = amountCents / 100;
  const runId = `aa_${nanoid8()}`;

  // 1. Load active policies (targets and bounds for each bucket)
  const policies = await allocationPolicyService.getPolicies();
  const activePolicies = policies.length > 0
    ? policies
    : [
        { bucketName: 'operating_cash',       targetPct: '20.0000', assetSymbol: 'USD'  },
        { bucketName: 'settlement_liquidity',  targetPct: '15.0000', assetSymbol: 'USDC' },
        { bucketName: 'reserve',               targetPct: '40.0000', assetSymbol: 'PAXG' },
        { bucketName: 'capital_deployment',    targetPct: '20.0000', assetSymbol: 'USD'  },
        { bucketName: 'protocol_ops',          targetPct: '5.0000',  assetSymbol: 'USD'  },
      ];

  const policyLines = activePolicies
    .map(p => `  ${p.bucketName}: ${Number(p.targetPct).toFixed(1)}% → $${((amountUsd * Number(p.targetPct)) / 100).toFixed(2)}`)
    .join('\n');

  const bucketNames = activePolicies.map(p => p.bucketName);

  // 2. Build Gemini prompt
  const prompt = `You are the allocation engine for Axiom Protocol — a sovereign digital-physical economy.

A $${amountUsd.toFixed(2)} USD deposit just arrived via debit card top-up. The configured allocation policy is:
${policyLines}

Recommend how to split $${amountUsd.toFixed(2)} across these buckets. You may adjust slightly from the baseline based on the deposit size (very small deposits should favor liquid buckets).

Respond ONLY with valid JSON — no markdown, no prose:
{
  "allocations": {
    "operating_cash": <pct as integer>,
    "settlement_liquidity": <pct as integer>,
    "reserve": <pct as integer>,
    "capital_deployment": <pct as integer>,
    "protocol_ops": <pct as integer>
  },
  "rationale": "<1-2 sentence justification>"
}

Rules:
- All percentages must be non-negative integers
- They MUST sum to exactly 100
- Use the exact bucket names listed above`;

  // 3. Call Gemini
  const raw = await generateText(prompt, { model: 'gemini-2.5-flash' });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`AI returned no JSON: ${raw.slice(0, 200)}`);

  let parsed: { allocations?: Record<string, number>; rationale?: string };
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { throw new Error('AI JSON parse failed'); }

  const allocations = parsed.allocations ?? {};
  const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : 'AI allocation applied.';

  // 4. Validate + normalize to sum to 100
  let total = bucketNames.reduce((s, b) => s + (Number(allocations[b]) || 0), 0);
  if (total <= 0) total = 100;
  const normalized = Object.fromEntries(
    bucketNames.map(b => [b, Math.round(((Number(allocations[b]) || 0) / total) * 100)])
  );
  // Assign any rounding remainder to the first bucket
  const sum = Object.values(normalized).reduce((s, v) => s + v, 0);
  if (sum !== 100 && bucketNames[0]) normalized[bucketNames[0]] += (100 - sum);

  // 5. Write treasury_allocations rows
  const bucketResults: AutoAllocResult['buckets'] = [];
  const now = new Date();

  for (const policy of activePolicies) {
    const pct = normalized[policy.bucketName] ?? 0;
    const usdAmount = Math.round((amountUsd * pct) / 100 * 100) / 100;
    const asset = BUCKET_ASSET[policy.bucketName] ?? (policy.assetSymbol || 'USD');

    await db.insert(treasuryAllocations).values({
      allocationBucket: policy.bucketName,
      assetSymbol: asset,
      amount: usdAmount.toFixed(8),
      usdValue: usdAmount.toFixed(2),
      status: 'recorded',
      notes: `AUTO_AI · ${rationale}`,
      effectiveAt: now,
      metadata: {
        source: 'AUTO_AI',
        run_id: runId,
        deposit_id: depositId,
        pct,
        rationale,
      },
    });

    bucketResults.push({ bucket: policy.bucketName, pct, usdAmount, asset });
  }

  // 6. Write success audit event
  await db.insert(capAuditEvents).values({
    id: generateId('ae'),
    eventType: 'card_deposit.auto_allocated',
    aggregateType: 'card_deposit',
    aggregateId: depositId,
    payloadJson: {
      run_id: runId,
      amount_usd: amountUsd,
      buckets: bucketResults,
      rationale,
      source: 'AUTO_AI',
    },
    actor: 'system',
  }).onConflictDoNothing();

  return { runId, amountUsd, buckets: bucketResults, rationale, source: 'AUTO_AI' };
}
