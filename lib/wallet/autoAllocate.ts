/**
 * Axiom — AI Auto-Allocation Service
 *
 * Triggered automatically after a wallet top-up credit is confirmed.
 * Uses Gemini to recommend a bucket split aligned with the configured
 * AllocationPolicy, then writes the result to treasury_allocations.
 *
 * Non-blocking: callers fire-and-forget. All failures are caught and
 * logged — they never block the wallet credit path.
 *
 * Invariants enforced before any DB write:
 *  - Every expected bucket must be present in the AI response.
 *  - All percentages must be non-negative integers.
 *  - Percentages must sum to exactly 100.
 *  - If any invariant fails, the function throws — the caller's catch
 *    block writes a card_deposit.auto_allocation_failed audit event.
 *
 * All per-run DB writes (treasury_allocations rows + success audit event)
 * are wrapped in a single transaction to prevent partial persistence.
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

/** Parsed and validated bucket percentages returned by Gemini. */
interface ValidatedAllocations {
  normalized: Record<string, number>;
  rationale: string;
}

/**
 * Validate and strictly enforce allocation invariants on raw AI output.
 *
 * Throws a descriptive Error if any invariant is violated — the caller's
 * catch block is responsible for emitting the failure audit event.
 */
function validateAiOutput(
  raw: unknown,
  bucketNames: string[],
): ValidatedAllocations {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response is not an object');
  }

  const resp = raw as Record<string, unknown>;
  const allocations = resp.allocations;

  if (!allocations || typeof allocations !== 'object') {
    throw new Error('AI response missing "allocations" object');
  }

  const alloc = allocations as Record<string, unknown>;
  const normalized: Record<string, number> = {};

  for (const bucket of bucketNames) {
    const raw_val = alloc[bucket];

    // Bucket must be present
    if (raw_val === undefined || raw_val === null) {
      throw new Error(`AI response missing required bucket: ${bucket}`);
    }

    const n = Number(raw_val);

    // Must be a finite number
    if (!Number.isFinite(n)) {
      throw new Error(`Bucket "${bucket}" value is not a finite number: ${String(raw_val)}`);
    }

    // Must be non-negative
    if (n < 0) {
      throw new Error(`Bucket "${bucket}" percentage is negative: ${n}`);
    }

    // Must be an integer
    if (!Number.isInteger(n)) {
      throw new Error(`Bucket "${bucket}" percentage is not an integer: ${n}`);
    }

    normalized[bucket] = n;
  }

  // Must sum to exactly 100
  const total = Object.values(normalized).reduce((s, v) => s + v, 0);
  if (total !== 100) {
    throw new Error(`Bucket percentages sum to ${total}, expected 100`);
  }

  const rationale =
    typeof resp.rationale === 'string' && resp.rationale.trim().length > 0
      ? resp.rationale.trim()
      : 'AI allocation applied.';

  return { normalized, rationale };
}

/**
 * Run an AI-driven allocation for a wallet top-up deposit.
 *
 * Writes one treasury_allocations row per bucket and one success audit
 * event, all inside a single DB transaction.
 *
 * Throws on AI validation failure or DB error — the fire-and-forget caller
 * in creditTopUp catches and writes the failure audit event.
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

  const bucketNames = activePolicies.map(p => p.bucketName);

  const policyLines = activePolicies
    .map(p => `  ${p.bucketName}: ${Number(p.targetPct).toFixed(1)}% → $${((amountUsd * Number(p.targetPct)) / 100).toFixed(2)}`)
    .join('\n');

  // 2. Build Gemini prompt
  const prompt = `You are the allocation engine for Axiom Protocol — a sovereign digital-physical economy.

A $${amountUsd.toFixed(2)} USD deposit just arrived via debit card top-up. The configured allocation policy is:
${policyLines}

Recommend how to split $${amountUsd.toFixed(2)} across these buckets. You may adjust slightly from the baseline based on the deposit size (very small deposits should favor liquid buckets).

Respond ONLY with valid JSON — no markdown, no prose:
{
  "allocations": {
    "operating_cash": <non-negative integer percentage>,
    "settlement_liquidity": <non-negative integer percentage>,
    "reserve": <non-negative integer percentage>,
    "capital_deployment": <non-negative integer percentage>,
    "protocol_ops": <non-negative integer percentage>
  },
  "rationale": "<1-2 sentence justification>"
}

Strict rules:
- All values must be non-negative integers (0 or greater, no decimals, no negatives)
- Values MUST sum to exactly 100
- All five bucket names must be present exactly as listed above`;

  // 3. Call Gemini
  const raw = await generateText(prompt, { model: 'gemini-2.5-flash' });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI returned no JSON block — raw output: ${raw.slice(0, 300)}`);
  }

  let parsed: unknown;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { throw new Error('AI response JSON could not be parsed'); }

  // 4. Strict validation — throws descriptively on any violation
  const { normalized, rationale } = validateAiOutput(parsed, bucketNames);

  // 5. Build bucket results array (for audit payload)
  const now = new Date();
  const bucketResults: AutoAllocResult['buckets'] = activePolicies.map(policy => {
    const pct = normalized[policy.bucketName] as number;
    const usdAmount = Math.round((amountUsd * pct) / 100 * 100) / 100;
    const asset = BUCKET_ASSET[policy.bucketName] ?? (policy.assetSymbol || 'USD');
    return { bucket: policy.bucketName, pct, usdAmount, asset };
  });

  // 6. Write all rows + success audit event inside a single transaction.
  //    If any insert fails, the whole run is rolled back — no partial state.
  await db.transaction(async (tx) => {
    for (const { bucket, pct, usdAmount, asset } of bucketResults) {
      await tx.insert(treasuryAllocations).values({
        allocationBucket: bucket,
        assetSymbol: asset,
        amount: usdAmount.toFixed(8),
        usdValue: usdAmount.toFixed(2),
        status: 'recorded',
        notes: `AUTO (AI) · ${rationale}`,
        effectiveAt: now,
        metadata: {
          source: 'AUTO_AI',
          run_id: runId,
          deposit_id: depositId,
          pct,
          rationale,
        },
      });
    }

    await tx.insert(capAuditEvents).values({
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
        source_label: 'AUTO (AI)',
      },
      actor: 'system',
    }).onConflictDoNothing();
  });

  return { runId, amountUsd, buckets: bucketResults, rationale, source: 'AUTO_AI' };
}
