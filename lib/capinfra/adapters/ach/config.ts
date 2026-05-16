/**
 * Capital Infrastructure — ACH adapter config loader.
 *
 * Reads the active cap_adapters row where kind='ACH'. configJson is
 * Zod-validated so any operator-typed config error surfaces immediately
 * rather than as a runtime explosion inside the ACH SDK call.
 *
 * Mode enum: DRY_RUN | MANUAL_APPROVAL | LIVE_CANARY | LIVE | DISABLED.
 * reconCutoffUtcHour: operator-configurable daily reconciliation deadline (UTC hour).
 *   Default 23 (11 PM UTC). Used by the ACH_RECONCILIATION_OVERDUE policy gate.
 *
 * The webhook signing secret is stored only in configJson (configJson-only,
 * no platform secret mirror).
 */

import { z } from 'zod';
import { db } from '../../../../server/db';
import { capAdapters, type CapAdapter } from '../../../../shared/capInfraSchema';
import { and, desc, eq } from 'drizzle-orm';
import { ValidationError } from '../../errors';
import type { AdapterMode } from '../types';
import type { AchEnvironment } from './sdk';

export const ACH_ADAPTER_KIND = 'ACH';

const ZConfig = z.object({
  mode: z.enum(['DRY_RUN', 'MANUAL_APPROVAL', 'LIVE_CANARY', 'LIVE', 'DISABLED']),
  environment: z.enum(['sandbox', 'production']),
  accountId: z.string().min(1),
  /**
   * HMAC-SHA256 secret for verifying ACH webhook signatures.
   * Stored here only — do NOT mirror in platform secrets.
   * Minimum 16 chars (existing rows); ≥32 required for MANUAL_APPROVAL+ gate.
   */
  webhookSigningSecret: z.string().min(16),
  configVersion: z.number().int().nonnegative().default(1),
  /**
   * UTC hour (0–23) at which daily reconciliation is required by.
   * Authorizations are blocked after this hour if no successful
   * reconciliation run exists for the current UTC day.
   * Only enforced in LIVE_CANARY and LIVE modes.
   * Default: 23 (11 PM UTC).
   */
  reconCutoffUtcHour: z.number().int().min(0).max(23).default(23),
});

export type AchAdapterConfig = z.infer<typeof ZConfig> & {
  rowId: string;
  rowName: string;
  isActive: boolean;
};

export async function loadAchConfig(): Promise<AchAdapterConfig | null> {
  const [row]: CapAdapter[] = await db
    .select()
    .from(capAdapters)
    .where(and(eq(capAdapters.kind, ACH_ADAPTER_KIND), eq(capAdapters.isActive, true)))
    .orderBy(desc(capAdapters.updatedAt))
    .limit(1);
  if (!row) return null;
  const parsed = ZConfig.safeParse(row.configJson);
  if (!parsed.success) {
    throw new ValidationError(
      `ACH adapter row ${row.id} has invalid configJson: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  return { ...parsed.data, rowId: row.id, rowName: row.name, isActive: row.isActive };
}

export async function requireAchConfig(): Promise<AchAdapterConfig> {
  const cfg = await loadAchConfig();
  if (!cfg) throw new ValidationError('no active ACH adapter row in cap_adapters');
  return cfg;
}

export function modeOf(cfg: AchAdapterConfig): AdapterMode {
  return cfg.mode as AdapterMode;
}

export function envOf(cfg: AchAdapterConfig): AchEnvironment {
  return cfg.environment;
}
