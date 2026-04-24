/**
 * getPruneStaleness
 *
 * Pure helper that determines whether the oracle-fallback pruning job is
 * overdue. Extracted from pages/admin/oracle-fallbacks.tsx so it can be
 * imported by both the dashboard and the unit-test suite without pulling in
 * React or Next.js dependencies.
 */

import { PRUNE_STALE_HOURS } from './config';

export interface LastPrune {
  pruned_at: string;
  deleted_count: number;
  retention_days: number;
  triggered_by: string;
}

export function getPruneStaleness(lastPrune: LastPrune | null): {
  isStale: boolean;
  hoursAgo: number | null;
} {
  if (!lastPrune) return { isStale: true, hoursAgo: null };
  const hoursAgo = (Date.now() - new Date(lastPrune.pruned_at).getTime()) / (1000 * 60 * 60);
  return { isStale: hoursAgo >= PRUNE_STALE_HOURS, hoursAgo };
}
