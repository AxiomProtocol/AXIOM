/**
 * Capital Infrastructure — Stellar adapter config loader.
 *
 * Reads the active `cap_adapters` row for kind=STELLAR. The configJson
 * shape is validated with zod so any operator-typed config error
 * surfaces immediately (and never as a runtime SDK explosion).
 *
 * The signing secret used to verify inbound webhooks is stored on this
 * row's configJson. Rotation tooling lands in 3B.1b — for this slice,
 * the secret is treated as immutable for the lifetime of a config row.
 */

import { z } from 'zod';
import { db } from '../../../../server/db';
import { capAdapters, type CapAdapter } from '../../../../shared/capInfraSchema';
import { and, desc, eq } from 'drizzle-orm';
import { ValidationError } from '../../errors';
import type { AdapterMode } from '../types';
import { isValidStellarAccount, type StellarNetwork } from './sdk';

export const STELLAR_ADAPTER_KIND = 'STELLAR';

const ZConfig = z.object({
  mode: z.enum(['DRY_RUN', 'LIVE']),
  network: z.enum(['public', 'testnet']),
  horizonUrl: z.string().url().optional(),
  anchorAccount: z.string().refine(isValidStellarAccount, 'invalid stellar account format'),
  assetCode: z.string().min(1).max(12),
  assetIssuer: z.string().refine(isValidStellarAccount, 'invalid asset issuer').optional(),
  /** HMAC-SHA256 secret for webhook verification. */
  webhookSigningSecret: z.string().min(16),
  /** Logical version stamp incremented by the operator on rotation. */
  configVersion: z.number().int().nonnegative().default(1),
});

export type StellarAdapterConfig = z.infer<typeof ZConfig> & {
  rowId: string;
  rowName: string;
  isActive: boolean;
};

/**
 * Returns the active Stellar adapter config or null if none is
 * registered. Callers that REQUIRE a config (dispatch, health,
 * webhook ingress) should use `requireStellarConfig()`.
 */
export async function loadStellarConfig(): Promise<StellarAdapterConfig | null> {
  const [row]: CapAdapter[] = await db
    .select()
    .from(capAdapters)
    .where(and(eq(capAdapters.kind, STELLAR_ADAPTER_KIND), eq(capAdapters.isActive, true)))
    .orderBy(desc(capAdapters.updatedAt))
    .limit(1);
  if (!row) return null;
  const parsed = ZConfig.safeParse(row.configJson);
  if (!parsed.success) {
    throw new ValidationError(
      `stellar adapter row ${row.id} has invalid configJson: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  return { ...parsed.data, rowId: row.id, rowName: row.name, isActive: row.isActive };
}

export async function requireStellarConfig(): Promise<StellarAdapterConfig> {
  const cfg = await loadStellarConfig();
  if (!cfg) {
    throw new ValidationError('no active STELLAR adapter row in cap_adapters');
  }
  return cfg;
}

export function modeOf(cfg: StellarAdapterConfig): AdapterMode {
  return cfg.mode;
}

export function networkOf(cfg: StellarAdapterConfig): StellarNetwork {
  return cfg.network;
}
