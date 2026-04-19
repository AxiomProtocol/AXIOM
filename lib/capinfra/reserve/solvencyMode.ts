/**
 * Capital Infrastructure — Phase 3A.2 reserve solvency-mode resolver.
 *
 * Reads the latest non-superseded row from `cap_reserve_config`. If
 * none exists, returns the synthesized default (`OPERATIONAL`,
 * version `bootstrap`) so the rest of the system can degrade
 * gracefully — the headroom check still runs and operator UI shows
 * the synthesized value clearly tagged as `bootstrap`.
 *
 * Per the Phase 3 plan, the `MANUAL_INTERVENTION` mode is a halt
 * mode: the policy layer DENIES every action with a distinct reason
 * code, and the admin/health endpoint surfaces the halt prominently
 * (clarification #4).
 */

import { db } from '../../../server/db';
import { capReserveConfig } from '../../../shared/capInfraSchema';
import { desc, isNull } from 'drizzle-orm';

export type SolvencyMode = 'OPERATIONAL' | 'CONSERVATIVE' | 'MANUAL_INTERVENTION';

export interface ResolvedSolvencyMode {
  mode: SolvencyMode;
  version: string;
  effectiveAt: Date | null;
  configJson: Record<string, unknown> | null;
  isBootstrap: boolean;
}

export async function getActiveSolvencyMode(): Promise<ResolvedSolvencyMode> {
  const rows = await db
    .select()
    .from(capReserveConfig)
    .where(isNull(capReserveConfig.supersededAt))
    .orderBy(desc(capReserveConfig.effectiveAt))
    .limit(1);
  if (!rows[0]) {
    return {
      mode: 'OPERATIONAL',
      version: 'bootstrap',
      effectiveAt: null,
      configJson: null,
      isBootstrap: true,
    };
  }
  const r = rows[0];
  return {
    mode: r.mode as SolvencyMode,
    version: r.version,
    effectiveAt: r.effectiveAt,
    configJson: (r.configJson as Record<string, unknown> | null) ?? null,
    isBootstrap: false,
  };
}

export function isHalt(mode: SolvencyMode): boolean {
  return mode === 'MANUAL_INTERVENTION';
}
