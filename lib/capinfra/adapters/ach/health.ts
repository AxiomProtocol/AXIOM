/**
 * Capital Infrastructure — ACH adapter admin-detail health probe (3B.2).
 *
 * Returns the per-adapter health block for the operator console and
 * admin health endpoint. The PUBLIC /api/capinfra/health is unchanged
 * and must not reflect the reachable=false state that occurs in DRY_RUN
 * when a synthetic sandbox accountId is configured (approved plan Q3).
 */

import { db } from '../../../../server/db';
import { capWebhookEvents } from '../../../../shared/capInfraSchema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { loadAchConfig, ACH_ADAPTER_KIND } from './config';
import { validateAchCredentials } from './sdk';
import type { AdapterHealth } from '../types';

const PROBE_TIMEOUT_MS = 4_000;

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  return fn(ac.signal).finally(() => clearTimeout(timer));
}

export async function achHealth(): Promise<AdapterHealth> {
  const cfg = await loadAchConfig();

  const [lastWebhookRow] = await db
    .select()
    .from(capWebhookEvents)
    .where(eq(capWebhookEvents.adapterKey, ACH_ADAPTER_KIND))
    .orderBy(desc(capWebhookEvents.receivedAt))
    .limit(1);

  const [lastVerifiedRow] = await db
    .select()
    .from(capWebhookEvents)
    .where(
      and(
        eq(capWebhookEvents.adapterKey, ACH_ADAPTER_KIND),
        eq(capWebhookEvents.signatureVerified, true),
      ),
    )
    .orderBy(desc(capWebhookEvents.receivedAt))
    .limit(1);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [quarRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(capWebhookEvents)
    .where(
      and(
        eq(capWebhookEvents.adapterKey, ACH_ADAPTER_KIND),
        eq(capWebhookEvents.status, 'QUARANTINED'),
        gte(capWebhookEvents.receivedAt, since24h),
      ),
    );

  if (!cfg) {
    return {
      kind: ACH_ADAPTER_KIND,
      mode: 'DRY_RUN',
      configVersion: 0,
      reachable: false,
      details: { configured: false, message: 'no active cap_adapters row for ACH' },
      lastDispatchAt: null,
      lastWebhookAt: lastWebhookRow?.receivedAt ?? null,
      lastWebhookVerifiedAt: lastVerifiedRow?.receivedAt ?? null,
      quarantinedCount24h: Number(quarRow?.n ?? 0),
    };
  }

  const probe = await withTimeout((signal) =>
    validateAchCredentials({
      environment: cfg.environment,
      accountId: cfg.accountId,
      signal,
    }),
  );

  // Redact accountId to first 8 chars for operator display.
  const accountIdRedacted = cfg.accountId.slice(0, 8) + (cfg.accountId.length > 8 ? '...' : '');

  return {
    kind: ACH_ADAPTER_KIND,
    mode: cfg.mode,
    configVersion: cfg.configVersion,
    reachable: probe.reachable,
    details: {
      configured: true,
      configRowId: cfg.rowId,
      environment: cfg.environment,
      accountId: accountIdRedacted,
      credentialsReachable: probe.reachable,
      credentialProbeError: probe.error,
      credentialProbeLatencyMs: probe.latencyMs,
    },
    lastDispatchAt: null,
    lastWebhookAt: lastWebhookRow?.receivedAt ?? null,
    lastWebhookVerifiedAt: lastVerifiedRow?.receivedAt ?? null,
    quarantinedCount24h: Number(quarRow?.n ?? 0),
  };
}
