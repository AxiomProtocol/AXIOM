/**
 * DEV / TEST ONLY — seeds and tears down a `pending` property_reports row
 * paired with deterministic in-memory overrides so the Playwright spec at
 * `e2e/property-recover-form.spec.ts` can drive the buyer self-recovery
 * form (task #280) end-to-end without touching real RPC, real Resend, or
 * the real data-provider pipeline.
 *
 * Disabled in production.
 *
 * ⚠️  CONCURRENCY WARNING
 *   The `seed` action mutates *process-global* module state via
 *   `__setVerifyOnchainPaymentOverride` and `__setGenerateReportOverride`.
 *   Two seeded rows alive in the same dev:e2e process at the same time
 *   would step on each other's overrides — the second seed wins, and
 *   the first row's recover request would be rejected by the second
 *   row's verify-override (different expected txHash). The current
 *   Playwright spec runs `--workers=1` and seeds → recovers → cleans
 *   up serially within each test, so this is safe today. If anybody
 *   wants to parallelize this spec or run it alongside other specs
 *   that touch the same module overrides, switch to a per-test
 *   override registry (keyed by reportId) before bumping the worker
 *   count.
 *
 * Why two overrides?
 *   The recovery form POSTs to `/api/property/recover-payment` →
 *   `resolveSingleByTxHash` → `promoteToPaid` which then chains:
 *     1. `verifyOnchainPayment(txHash, priceCents)` — needs a real
 *         Arbitrum RPC + a confirmed transfer. Replaced by the seam
 *         `__setVerifyOnchainPaymentOverride` so the seeded txHash
 *         returns a deterministic VerifiedPayment (with `from` matching
 *         the row's buyerWallet so the sender-wallet check passes).
 *     2. `generateReport(reportId)` — walks Census/FHFA/Repliers/etc,
 *         which requires API keys absent from the e2e env. Replaced by
 *         `__setGenerateReportOverride` which just flips the row to
 *         `ready` and returns a stub EstimationResult so `promoteToPaid`
 *         resolves as `{ ok: true, status: 'ready' }`.
 *
 *   Both overrides + the seeded row are torn down in `cleanup` so the
 *   test leaves no global module state behind for the next spec.
 *
 * Actions (POST body):
 *   { action: 'seed', initialStatus?: 'pending' | 'expired' }
 *     - Inserts one new property_reports row (default status='pending';
 *       'expired' lets the test cover the headline self-rescue path
 *       where the resolver auto-expired the row before the buyer
 *       returned to paste their tx hash).
 *     - Returns { id, txHash, buyerWallet, addressRaw }.
 *
 *   { action: 'cleanup', id }
 *     - Deletes the row, clears both overrides.
 *     - Returns { id, deleted: true }.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import {
  __setVerifyOnchainPaymentOverride,
  PROPERTY_PAYMENT_CHAIN_ID,
  PROPERTY_PAYMENT_TOKEN,
  type PaymentVerificationResult,
} from '../../../lib/property/onchainPayment';
import { __setGenerateReportOverride } from '../../../server/services/property/pipeline';
import type { EstimationResult } from '../../../server/services/property/estimationEngine';

interface SeedBody {
  action?: 'seed' | 'cleanup';
  id?: string;
  initialStatus?: 'pending' | 'expired';
}

/** Stub EstimationResult shape — fields are intentionally minimal. The
 *  recovery flow only cares that the row's status flips to `ready`; the
 *  EstimationResult return value is not consumed by the resolver. */
const STUB_ESTIMATION = {} as EstimationResult;

function buildVerifyOverride(
  expectedTxHash: string,
  buyerWallet: string,
): (txHash: string, requiredAmountCents: number) => Promise<PaymentVerificationResult> {
  const expectedLower = expectedTxHash.toLowerCase();
  return async (txHash, requiredAmountCents) => {
    if (txHash.toLowerCase() !== expectedLower) {
      return {
        ok: false,
        reason: `[test-seed-recoverable] verify override only matches ${expectedTxHash}; got ${txHash}.`,
      };
    }
    const usd = (requiredAmountCents / 100).toFixed(2);
    return {
      ok: true,
      txHash,
      from: buyerWallet,
      to: '0x' + '00'.repeat(20),
      token: PROPERTY_PAYMENT_TOKEN.toLowerCase(),
      chainId: PROPERTY_PAYMENT_CHAIN_ID,
      // 6-decimal AXUSD-equivalent units. The resolver only checks
      // verification.from + chainId + token; amount is informational here.
      amountTokenUnits: ethers.parseUnits(usd, 6),
      amountUsd: usd,
      decimals: 6,
    };
  };
}

function buildGenerateReportOverride(
  expectedReportId: string,
): (reportId: string) => Promise<EstimationResult> {
  return async (reportId) => {
    if (reportId !== expectedReportId) {
      // Don't silently succeed for some unrelated report id the test
      // didn't create — a real bug deserves a real failure surface.
      throw new Error(
        `[test-seed-recoverable] generateReport override only handles ${expectedReportId}; got ${reportId}.`,
      );
    }
    await db
      .update(propertyReports)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(eq(propertyReports.id, reportId));
    return STUB_ESTIMATION;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const body = (req.body ?? {}) as SeedBody;
  const action = body.action ?? 'seed';

  try {
    if (action === 'seed') {
      const initialStatus = body.initialStatus === 'expired' ? 'expired' : 'pending';

      // Unique-ish suffix so multiple seeded rows don't collide and the
      // test can isolate its own row even with leftover dev DB state.
      // MUST be hex-only — `recover-payment` validates txHash with
      // /^0x[0-9a-fA-F]{64}$/, so tags from base36 (which can include
      // g-z) would be rejected at the edge before the resolver ever
      // ran. Use a hex-only random tag so the seeded values are
      // structurally identical to a real payment.
      const tag = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');
      const addressRaw = `e2e-recover-${tag} 456 Recovery Way, Testville, TT 00000`;
      const buyerWallet = `0x${tag.padEnd(40, '0').slice(0, 40)}`;
      const buyerEmail = `e2e-recover-${tag}@axiom.local`;
      // Deterministic 32-byte hex tx hash derived from the same tag —
      // never collides with mainnet tx hashes (would be astronomically
      // unlikely) and is stable across the seed → recover → cleanup flow.
      const txHash = `0x${tag.padEnd(64, '0').slice(0, 64)}`;

      let inserted: { id: string };
      try {
        [inserted] = await db
          .insert(propertyReports)
          .values({
            tier: 'base',
            status: initialStatus,
            addressRaw,
            buyerWallet,
            buyerEmail,
            amountPaidCents: 499,
          })
          .returning({ id: propertyReports.id });
      } catch (insertErr) {
        // No overrides installed yet, but be defensive in case a future
        // refactor moves the install up: clear them so the resolver
        // module can't be left pinned to a stale fake.
        __setVerifyOnchainPaymentOverride(null);
        __setGenerateReportOverride(null);
        throw insertErr;
      }

      // Install the overrides AFTER the insert succeeded so a failed
      // seed never leaves the resolver pinned to a fake provider.
      __setVerifyOnchainPaymentOverride(buildVerifyOverride(txHash, buyerWallet));
      __setGenerateReportOverride(buildGenerateReportOverride(inserted.id));

      return res.status(200).json({
        id: inserted.id,
        txHash,
        buyerWallet,
        buyerEmail,
        addressRaw,
        initialStatus,
      });
    }

    if (action === 'cleanup') {
      if (!body.id || typeof body.id !== 'string') {
        return res
          .status(400)
          .json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      await db.delete(propertyReports).where(eq(propertyReports.id, body.id));
      __setVerifyOnchainPaymentOverride(null);
      __setGenerateReportOverride(null);
      return res.status(200).json({ id: body.id, deleted: true });
    }

    return res.status(400).json({
      error: 'BAD_REQUEST',
      detail: `unknown action: ${String(action)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err && typeof err === 'object' && 'cause' in err
        ? String((err as { cause: unknown }).cause)
        : undefined;
    return res.status(500).json({
      error: 'SEED_FAILED',
      message,
      cause,
    });
  }
}
