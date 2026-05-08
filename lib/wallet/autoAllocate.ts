/**
 * Axiom — AI Auto-Allocation Service
 *
 * Triggered automatically after a wallet top-up credit is confirmed.
 * Uses Gemini to recommend a split across the 6 canonical protocol asset
 * buckets, aligned with the configured AllocationPolicy.
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

/**
 * Six canonical treasury asset buckets.
 * Used as the fallback when allocation_policies table is empty.
 */
const DEFAULT_BUCKETS = [
  { bucketName: 'eth_reserve',    targetPct: 20, assetSymbol: 'ETH'   },
  { bucketName: 'paxg_reserve',   targetPct: 25, assetSymbol: 'PAXG'  },
  { bucketName: 'axau_reserve',   targetPct: 15, assetSymbol: 'AXAU'  },
  { bucketName: 'axm_treasury',   targetPct: 10, assetSymbol: 'AXM'   },
  { bucketName: 'axusd_liquidity',targetPct: 15, assetSymbol: 'AXUSD' },
  { bucketName: 'usdc_operations',targetPct: 15, assetSymbol: 'USDC'  },
] as const;

export interface AutoAllocResult {
  runId: string;
  amountUsd: number;
  buckets: Array<{ bucket: string; pct: number; usdAmount: number; asset: string }>;
  rationale: string;
  source: 'AUTO_AI';
}

interface ValidatedAllocations {
  normalized: Record<string, number>;
  rationale: string;
}

/**
 * Validate and strictly enforce allocation invariants on raw AI output.
 * Throws a descriptive Error on any violation.
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
    if (raw_val === undefined || raw_val === null) {
      throw new Error(`AI response missing required bucket: ${bucket}`);
    }
    const n = Number(raw_val);
    if (!Number.isFinite(n)) {
      throw new Error(`Bucket "${bucket}" value is not a finite number: ${String(raw_val)}`);
    }
    if (n < 0) {
      throw new Error(`Bucket "${bucket}" percentage is negative: ${n}`);
    }
    if (!Number.isInteger(n)) {
      throw new Error(`Bucket "${bucket}" percentage is not an integer: ${n}`);
    }
    normalized[bucket] = n;
  }

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
 * Run an AI-driven allocation for a wallet top-up deposit across the
 * 6 canonical asset buckets: ETH, PAXG, AXAU, AXM, AXUSD, USDC.
 *
 * Writes one treasury_allocations row per bucket and one success audit
 * event, all inside a single DB transaction.
 */
export async function runAutoAlloc(opts: {
  amountCents: number;
  depositId: string;
}): Promise<AutoAllocResult> {
  const { amountCents, depositId } = opts;
  const amountUsd = amountCents / 100;
  const runId = `aa_${nanoid8()}`;

  // 1. Load active policies from DB; fall back to canonical defaults
  const dbPolicies = await allocationPolicyService.getPolicies();
  const activePolicies = dbPolicies.length > 0
    ? dbPolicies.map(p => ({
        bucketName: p.bucketName,
        targetPct: Number(p.targetPct),
        assetSymbol: p.assetSymbol ?? 'USD',
      }))
    : DEFAULT_BUCKETS.map(b => ({ ...b, targetPct: b.targetPct }));

  const bucketNames = activePolicies.map(p => p.bucketName);

  const policyLines = activePolicies
    .map(p => `  ${p.bucketName} (${p.assetSymbol}): ${Number(p.targetPct).toFixed(0)}% → $${((amountUsd * Number(p.targetPct)) / 100).toFixed(2)}`)
    .join('\n');

  const bucketListForJson = bucketNames
    .map(b => `    "${b}": <non-negative integer percentage>`)
    .join(',\n');

  // 2. Build Gemini prompt
  const prompt = `You are the treasury allocation engine for Axiom Protocol — a sovereign digital-physical economy.

A $${amountUsd.toFixed(2)} USD deposit just arrived via debit card. Allocate it across the 6 protocol asset buckets below based on their target weightings. You may adjust slightly from the targets based on deposit size (small deposits should favor liquid assets like USDC and AXUSD).

Policy targets:
${policyLines}

Asset context:
- ETH: gas reserve and on-chain infrastructure costs
- PAXG: physical gold backing the AXAU reserve instrument
- AXAU: the protocol's own gold reserve token (self-held)
- AXM: governance token held in protocol treasury
- AXUSD: stablecoin for settlement and redemption liquidity
- USDC: off-chain operating liquidity and settlement rail

Respond ONLY with valid JSON — no markdown, no prose:
{
  "allocations": {
${bucketListForJson}
  },
  "rationale": "<1-2 sentence justification>"
}

Strict rules:
- All values must be non-negative integers (≥0, no decimals, no negatives)
- Values MUST sum to exactly 100
- All six bucket names must appear exactly as listed above`;

  // 3. Call Gemini
  const raw = await generateText(prompt, { model: 'gemini-2.5-flash' });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI returned no JSON block — raw: ${raw.slice(0, 300)}`);
  }

  let parsed: unknown;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { throw new Error('AI response JSON could not be parsed'); }

  // 4. Strict validation — throws descriptively on any violation
  const { normalized, rationale } = validateAiOutput(parsed, bucketNames);

  // 5. Build bucket results
  const now = new Date();
  const bucketResults: AutoAllocResult['buckets'] = activePolicies.map(policy => {
    const pct = normalized[policy.bucketName] as number;
    const usdAmount = Math.round((amountUsd * pct) / 100 * 100) / 100;
    return { bucket: policy.bucketName, pct, usdAmount, asset: policy.assetSymbol };
  });

  // 6. Write all rows + audit event atomically
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
