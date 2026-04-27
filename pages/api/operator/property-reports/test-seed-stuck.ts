/**
 * DEV / TEST ONLY — seeds and mutates rows in `property_reports` so the
 * Playwright spec at e2e/operator-property-reports-stuck.spec.ts can
 * deterministically verify the operator stuck-payments console at
 * `/operator/property-reports/stuck`.
 *
 * Disabled in production.
 *
 * Why a fake provider? `resolveStuckPayments` (used by the "Run resolver
 * sweep" button) calls `provider.getBlockNumber()` + `provider.getLogs(...)`
 * via an ethers JsonRpcProvider against ARBITRUM_RPC_URL. In CI / dev that
 * either hangs (no network) or hits the public RPC (slow, flaky). Installing
 * a deterministic in-memory provider via the existing
 * `__setStuckPaymentProvider` test seam makes the sweep return in
 * milliseconds with `scanned=N, resolved=0, expired=0` — exactly the state
 * the test needs to drive the per-row Expire button next.
 *
 * ⚠️  CONCURRENCY WARNING
 *   The `seed-for-confirm` action mutates *process-global* module state via
 *   `__setStuckPaymentVerifyOverride` and `__setStuckPaymentGenerateReportOverride`
 *   in `stuckPaymentResolver`. Two seeded rows alive in the same dev/e2e process
 *   at the same time would step on each other's overrides. The Playwright spec
 *   runs `--workers=1` and seeds → confirms → cleans up serially, so this is
 *   safe today.
 *
 * Why overrides live in stuckPaymentResolver?
 *   Both this seed endpoint and the /api/operator/property-reports/stuck route
 *   import `stuckPaymentResolver`. In Next.js's per-route compilation, each
 *   route gets its own module scope, but modules that are already imported by
 *   a shared dependency (stuckPaymentResolver) share the same Node.js module-
 *   cache entry. Storing overrides here ensures that setting them from this
 *   seed endpoint is visible when the stuck route calls resolveSingleByTxHash.
 *   Overrides stored in onchainPayment.ts or pipeline.ts directly would be
 *   resolved to separate instances per-bundle in dev mode.
 *
 * Actions (POST body):
 *   { action: 'seed', ageMinutes? }
 *     - Installs a fake MinimalProvider on the resolver module so sweep
 *       runs deterministically without external RPC.
 *     - Inserts one new pending property_reports row. createdAt is
 *       back-dated by `ageMinutes` (default 30) so the row is OLDER than
 *       the resolver's MIN_PENDING_AGE (15min) but NEWER than the
 *       MAX_PENDING_AGE (72h) — meaning a sweep with the empty fake
 *       provider will scan the row and leave it pending, ready for the
 *       per-row Expire button to flip it to expired.
 *     - Returns { id, addressRaw, buyerWallet, buyerEmail, ageMinutes }.
 *
 *   { action: 'seed-for-confirm', ageMinutes? }
 *     - Like 'seed', but also installs:
 *         * `__setStuckPaymentVerifyOverride` — returns a deterministic
 *           VerifiedPayment for the seeded txHash so `resolveSingleByTxHash`
 *           can confirm the row without hitting a real RPC.
 *         * `__setStuckPaymentGenerateReportOverride` — stubs out the
 *           data-pipeline so `promoteToPaid` succeeds without real API
 *           keys, flipping the row to `ready`.
 *     - Returns { id, addressRaw, buyerWallet, buyerEmail, txHash, ageMinutes }.
 *
 *   { action: 'cleanup', id }
 *     - Deletes the row by id and clears all module overrides (provider,
 *       verifyOnchainPayment, generateReport).
 *     - Returns { id, deleted: true }.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/propertySchema';
import {
  __setStuckPaymentProvider,
  __setStuckPaymentVerifyOverride,
  __setStuckPaymentGenerateReportOverride,
  type MinimalProvider,
  PROPERTY_PAYMENT_CHAIN_ID,
  PROPERTY_PAYMENT_TOKEN,
} from '../../../../lib/property/stuckPaymentResolver';
import type { PaymentVerificationResult } from '../../../../lib/property/onchainPayment';

interface SeedBody {
  action?: 'seed' | 'seed-for-confirm' | 'cleanup' | 'check';
  id?: string;
  ageMinutes?: number;
}

const FAKE_PROVIDER: MinimalProvider = {
  // Any positive integer works; the resolver only uses this to bound the
  // log-scan range.
  async getBlockNumber() {
    return 10_000_000;
  },
  // Empty log set → resolver finds no matching transfer for any seeded
  // row, so the sweep returns scanned=N, resolved=0 and only rows older
  // than maxPendingAgeHours (72h default) are auto-expired. Our seeded
  // row is intentionally only ~30 minutes old, so it stays pending after
  // sweep and can be exercised via the per-row Expire button.
  async getLogs() {
    return [];
  },
};

function buildVerifyOverride(
  expectedTxHash: string,
  buyerWallet: string,
): (txHash: string, requiredAmountCents: number) => Promise<PaymentVerificationResult> {
  const expectedLower = expectedTxHash.toLowerCase();
  return async (txHash, requiredAmountCents) => {
    if (txHash.toLowerCase() !== expectedLower) {
      return {
        ok: false,
        reason: `[test-seed-stuck] verify override only matches ${expectedTxHash}; got ${txHash}.`,
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
      amountTokenUnits: ethers.parseUnits(usd, 6),
      amountUsd: usd,
      decimals: 6,
    };
  };
}

function buildGenerateReportOverride(
  expectedReportId: string,
) {
  return async (reportId: string) => {
    if (reportId !== expectedReportId) {
      throw new Error(
        `[test-seed-stuck] generateReport override only handles ${expectedReportId}; got ${reportId}.`,
      );
    }
    await db
      .update(propertyReports)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(eq(propertyReports.id, reportId));
    // Return value is not consumed by the resolver.
    return {} as never;
  };
}

/** Clear every module-level override this endpoint can install. */
function clearAllOverrides() {
  __setStuckPaymentProvider(null);
  __setStuckPaymentVerifyOverride(null);
  __setStuckPaymentGenerateReportOverride(null);
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
      __setStuckPaymentProvider(FAKE_PROVIDER);

      const ageMinutes =
        typeof body.ageMinutes === 'number' && body.ageMinutes > 0
          ? body.ageMinutes
          : 30;
      const createdAt = new Date(Date.now() - ageMinutes * 60_000);

      // Unique-ish address so this row is easy to spot in the rendered
      // table even if the developer has other pending rows in their dev DB.
      const tag = Math.random().toString(36).slice(2, 8);
      const addressRaw = `e2e-stuck-${tag} 123 E2E Test Ln, Testville, TT 00000`;
      const buyerWallet = `0x${'e2e000'.padEnd(40, '0').slice(0, 40)}`;
      const buyerEmail = `e2e-stuck-${tag}@axiom.local`;

      let inserted: { id: string };
      try {
        [inserted] = await db
          .insert(propertyReports)
          .values({
            tier: 'base',
            status: 'pending',
            addressRaw,
            buyerWallet,
            buyerEmail,
            amountPaidCents: 499,
            createdAt,
            updatedAt: createdAt,
          })
          .returning({ id: propertyReports.id });
      } catch (insertErr) {
        // If the row insert fails (schema drift, DB outage, etc) clear the
        // provider override so we don't leave the resolver module pinned
        // to a fake provider for the rest of the dev process.
        __setStuckPaymentProvider(null);
        throw insertErr;
      }

      return res.status(200).json({
        id: inserted.id,
        addressRaw,
        buyerWallet,
        buyerEmail,
        ageMinutes,
      });
    }

    if (action === 'seed-for-confirm') {
      // Generate a hex-only tag so the txHash passes the /^0x[0-9a-fA-F]{64}$/
      // validation in verifyOnchainPayment (base36 tags can include g-z).
      const tag = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join('');

      const ageMinutes =
        typeof body.ageMinutes === 'number' && body.ageMinutes > 0
          ? body.ageMinutes
          : 30;
      const createdAt = new Date(Date.now() - ageMinutes * 60_000);

      const addressRaw = `e2e-confirm-${tag} 789 Confirm Ave, Testville, TT 00001`;
      // buyerWallet is derived from tag so the verify override's `from`
      // field matches the row's recorded wallet — the promoteToPaid sender
      // check requires them to be equal.
      const buyerWallet = `0x${tag.padEnd(40, '0').slice(0, 40)}`;
      const buyerEmail = `e2e-confirm-${tag}@axiom.local`;
      // Deterministic 32-byte hex tx hash — structurally valid and stable
      // across seed → confirm → cleanup.
      const txHash = `0x${tag.padEnd(64, '0').slice(0, 64)}`;

      let inserted: { id: string };
      try {
        [inserted] = await db
          .insert(propertyReports)
          .values({
            tier: 'base',
            status: 'pending',
            addressRaw,
            buyerWallet,
            buyerEmail,
            amountPaidCents: 499,
            createdAt,
            updatedAt: createdAt,
          })
          .returning({ id: propertyReports.id });
      } catch (insertErr) {
        // Don't leave module state pinned on insert failure.
        clearAllOverrides();
        throw insertErr;
      }

      // Install all overrides AFTER the insert succeeded.
      __setStuckPaymentProvider(FAKE_PROVIDER);
      __setStuckPaymentVerifyOverride(buildVerifyOverride(txHash, buyerWallet));
      __setStuckPaymentGenerateReportOverride(buildGenerateReportOverride(inserted.id));

      return res.status(200).json({
        id: inserted.id,
        addressRaw,
        buyerWallet,
        buyerEmail,
        txHash,
        ageMinutes,
      });
    }

    if (action === 'check') {
      // Returns the current status of a seeded row so the e2e test can assert
      // the final state (e.g. 'ready') rather than only "not pending".
      if (!body.id || typeof body.id !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      const [row] = await db
        .select({ id: propertyReports.id, status: propertyReports.status })
        .from(propertyReports)
        .where(eq(propertyReports.id, body.id))
        .limit(1);
      if (!row) {
        return res.status(404).json({ error: 'NOT_FOUND', detail: `No row with id ${body.id}` });
      }
      return res.status(200).json({ id: row.id, status: row.status });
    }

    if (action === 'cleanup') {
      if (!body.id || typeof body.id !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      await db.delete(propertyReports).where(eq(propertyReports.id, body.id));
      clearAllOverrides();
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
