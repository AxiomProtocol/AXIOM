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
 *     - Returns { id, addressRaw, buyerWallet, ageMinutes }.
 *
 *   { action: 'cleanup', id }
 *     - Deletes the row by id and clears the fake provider override.
 *     - Returns { id, deleted: true }.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '../../../../server/db';
import { propertyReports } from '../../../../shared/propertySchema';
import {
  __setStuckPaymentProvider,
  type MinimalProvider,
} from '../../../../lib/property/stuckPaymentResolver';

interface SeedBody {
  action?: 'seed' | 'cleanup';
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

    if (action === 'cleanup') {
      if (!body.id || typeof body.id !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      await db.delete(propertyReports).where(eq(propertyReports.id, body.id));
      __setStuckPaymentProvider(null);
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
