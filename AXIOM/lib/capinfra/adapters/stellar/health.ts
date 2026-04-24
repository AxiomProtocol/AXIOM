/**
 * Capital Infrastructure — Stellar adapter admin-detail health probe.
 *
 * Returns the per-adapter detail block surfaced by the operator console
 * and by the admin-only health endpoint. The PUBLIC `/api/capinfra/health`
 * surface is intentionally unchanged — it stays coarse.
 */

import { db } from '../../../../server/db';
import { capWebhookEvents } from '../../../../shared/capInfraSchema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { loadStellarConfig, STELLAR_ADAPTER_KIND } from './config';
import { resolveAnchorAccount, verifyHorizonReachable } from './sdk';
import type { AdapterHealth } from '../types';

const PROBE_TIMEOUT_MS = 3_000;

function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  return p(ac.signal).finally(() => clearTimeout(timer));
}

export async function stellarHealth(): Promise<AdapterHealth> {
  const cfg = await loadStellarConfig();

  const [lastWebhookRow] = await db
    .select()
    .from(capWebhookEvents)
    .where(eq(capWebhookEvents.adapterKey, STELLAR_ADAPTER_KIND))
    .orderBy(desc(capWebhookEvents.receivedAt))
    .limit(1);

  const [lastVerifiedWebhookRow] = await db
    .select()
    .from(capWebhookEvents)
    .where(
      and(
        eq(capWebhookEvents.adapterKey, STELLAR_ADAPTER_KIND),
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
        eq(capWebhookEvents.adapterKey, STELLAR_ADAPTER_KIND),
        eq(capWebhookEvents.status, 'QUARANTINED'),
        gte(capWebhookEvents.receivedAt, since24h),
      ),
    );

  if (!cfg) {
    return {
      kind: STELLAR_ADAPTER_KIND,
      mode: 'DRY_RUN',
      configVersion: 0,
      reachable: false,
      details: { configured: false, message: 'no active cap_adapters row for STELLAR' },
      lastDispatchAt: null,
      lastWebhookAt: lastWebhookRow?.receivedAt ?? null,
      lastWebhookVerifiedAt: lastVerifiedWebhookRow?.receivedAt ?? null,
      quarantinedCount24h: Number(quarRow?.n ?? 0),
    };
  }

  const horizonProbe = await withTimeout((s) => verifyHorizonReachable(cfg.network, s));
  const anchorProbe = horizonProbe.reachable
    ? await withTimeout((s) => resolveAnchorAccount(cfg.network, cfg.anchorAccount, s))
    : { account: cfg.anchorAccount, exists: false, error: 'horizon unreachable, skipped' };

  return {
    kind: STELLAR_ADAPTER_KIND,
    mode: cfg.mode,
    configVersion: cfg.configVersion,
    reachable: horizonProbe.reachable && anchorProbe.exists,
    details: {
      configured: true,
      configRowId: cfg.rowId,
      network: cfg.network,
      horizonUrl: horizonProbe.horizonUrl,
      horizonReachable: horizonProbe.reachable,
      horizonLatencyMs: horizonProbe.latencyMs,
      horizonError: horizonProbe.error,
      anchorAccount: cfg.anchorAccount,
      anchorAccountResolved: anchorProbe.exists,
      anchorProbeError: anchorProbe.error,
      assetCode: cfg.assetCode,
    },
    // lastDispatchAt: would require an audit-event scan; omitted in
    // 3B.1a since the dispatch path runs through settlement.ts which
    // emits its own audit events. Surfaced as null with TODO for 3B.1b.
    lastDispatchAt: null,
    lastWebhookAt: lastWebhookRow?.receivedAt ?? null,
    lastWebhookVerifiedAt: lastVerifiedWebhookRow?.receivedAt ?? null,
    quarantinedCount24h: Number(quarRow?.n ?? 0),
  };
}
