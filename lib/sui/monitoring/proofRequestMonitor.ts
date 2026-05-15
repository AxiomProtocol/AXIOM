import 'server-only';

// =============================================================================
// Proof Request Monitor — Phase 10 Monitoring
//
// Tracks proof request volume, success/rejection rates, and abuse patterns.
// Operates entirely server-side. No private keys. Read-only telemetry.
// =============================================================================

export interface ProofRequestRecord {
  address: string;
  campaignId: string;
  outcome: 'approved' | 'rejected_ineligible' | 'rejected_duplicate' | 'rejected_inactive' | 'error';
  requestedAt: string;
  latencyMs: number;
}

export interface ProofRequestStats {
  totalRequests: number;
  approved: number;
  rejectedIneligible: number;
  rejectedDuplicate: number;
  rejectedInactive: number;
  errors: number;
  successRate: number;
  uniqueAddresses: number;
  windowSecs: number;
  computedAt: string;
}

export interface ProofAbuseAlert {
  type: 'burst_requests' | 'repeated_ineligible' | 'duplicate_flood';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  address: string;
  count: number;
  windowSecs: number;
  detectedAt: string;
}

// In-process ring buffer — resets on server restart.
// Production deployments should persist to Redis or Postgres.
const MAX_RECORDS = 1000;
const _records: ProofRequestRecord[] = [];

export function recordProofRequest(record: ProofRequestRecord): void {
  _records.push(record);
  if (_records.length > MAX_RECORDS) _records.shift();
}

export function getProofRequestStats(windowSecs = 3600): ProofRequestStats {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const window = _records.filter(
    (r) => now - new Date(r.requestedAt).getTime() < windowMs,
  );

  const approved = window.filter((r) => r.outcome === 'approved').length;
  const rejectedIneligible = window.filter((r) => r.outcome === 'rejected_ineligible').length;
  const rejectedDuplicate = window.filter((r) => r.outcome === 'rejected_duplicate').length;
  const rejectedInactive = window.filter((r) => r.outcome === 'rejected_inactive').length;
  const errors = window.filter((r) => r.outcome === 'error').length;
  const uniqueAddresses = new Set(window.map((r) => r.address)).size;
  const total = window.length;

  return {
    totalRequests: total,
    approved,
    rejectedIneligible,
    rejectedDuplicate,
    rejectedInactive,
    errors,
    successRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    uniqueAddresses,
    windowSecs,
    computedAt: new Date().toISOString(),
  };
}

export function detectProofAbuse(windowSecs = 300): ProofAbuseAlert[] {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const window = _records.filter(
    (r) => now - new Date(r.requestedAt).getTime() < windowMs,
  );

  const alerts: ProofAbuseAlert[] = [];
  const byAddress = new Map<string, ProofRequestRecord[]>();

  for (const r of window) {
    const list = byAddress.get(r.address) ?? [];
    list.push(r);
    byAddress.set(r.address, list);
  }

  for (const [address, reqs] of byAddress) {
    // Burst: >20 requests from one address in the window
    if (reqs.length > 20) {
      alerts.push({
        type: 'burst_requests',
        severity: 'HIGH',
        address,
        count: reqs.length,
        windowSecs,
        detectedAt: new Date().toISOString(),
      });
    }

    // Repeated ineligible: >5 ineligible rejections
    const ineligible = reqs.filter((r) => r.outcome === 'rejected_ineligible').length;
    if (ineligible > 5) {
      alerts.push({
        type: 'repeated_ineligible',
        severity: 'MEDIUM',
        address,
        count: ineligible,
        windowSecs,
        detectedAt: new Date().toISOString(),
      });
    }

    // Duplicate flood: >3 duplicate rejections
    const duplicates = reqs.filter((r) => r.outcome === 'rejected_duplicate').length;
    if (duplicates > 3) {
      alerts.push({
        type: 'duplicate_flood',
        severity: 'MEDIUM',
        address,
        count: duplicates,
        windowSecs,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

export function clearProofRecords(): void {
  _records.length = 0;
}
