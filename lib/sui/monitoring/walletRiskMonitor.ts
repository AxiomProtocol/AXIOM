import 'server-only';

// =============================================================================
// Wallet Risk Monitor — Phase 10 Monitoring
//
// Tracks per-wallet behavior patterns. Detects claim abuse, bot patterns,
// and unusual activity. Server-side only. No private key exposure.
// =============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';

export interface WalletActivity {
  address: string;
  proofRequests: number;
  claimsSubmitted: number;
  claimsSucceeded: number;
  claimsFailed: number;
  duplicateAttempts: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface WalletRiskProfile {
  address: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  activity: WalletActivity;
  evaluatedAt: string;
}

export interface WalletRiskSummary {
  totalTracked: number;
  byRiskLevel: Record<RiskLevel, number>;
  highRiskAddresses: string[];
  blockedAddresses: string[];
  generatedAt: string;
}

// In-process activity store — resets on server restart.
const _activity = new Map<string, WalletActivity>();

export function recordWalletActivity(
  address: string,
  event: {
    proofRequest?: boolean;
    claimSubmitted?: boolean;
    claimSucceeded?: boolean;
    claimFailed?: boolean;
    duplicateAttempt?: boolean;
  },
): void {
  const now = new Date().toISOString();
  const existing = _activity.get(address) ?? {
    address,
    proofRequests: 0,
    claimsSubmitted: 0,
    claimsSucceeded: 0,
    claimsFailed: 0,
    duplicateAttempts: 0,
    firstSeenAt: now,
    lastSeenAt: now,
  };

  if (event.proofRequest) existing.proofRequests += 1;
  if (event.claimSubmitted) existing.claimsSubmitted += 1;
  if (event.claimSucceeded) existing.claimsSucceeded += 1;
  if (event.claimFailed) existing.claimsFailed += 1;
  if (event.duplicateAttempt) existing.duplicateAttempts += 1;
  existing.lastSeenAt = now;

  _activity.set(address, existing);
}

export function evaluateWalletRisk(address: string): WalletRiskProfile {
  const evaluatedAt = new Date().toISOString();
  const activity = _activity.get(address) ?? {
    address,
    proofRequests: 0,
    claimsSubmitted: 0,
    claimsSucceeded: 0,
    claimsFailed: 0,
    duplicateAttempts: 0,
    firstSeenAt: evaluatedAt,
    lastSeenAt: evaluatedAt,
  };

  const reasons: string[] = [];
  let level: RiskLevel = 'LOW';

  if (activity.duplicateAttempts > 5) {
    reasons.push(`${activity.duplicateAttempts} duplicate claim attempts`);
    level = 'HIGH';
  } else if (activity.duplicateAttempts > 2) {
    reasons.push(`${activity.duplicateAttempts} duplicate claim attempts`);
    if (level === 'LOW') level = 'MEDIUM';
  }

  if (activity.proofRequests > 50) {
    reasons.push(`${activity.proofRequests} proof requests (possible bot)`);
    level = 'HIGH';
  } else if (activity.proofRequests > 15) {
    reasons.push(`${activity.proofRequests} proof requests`);
    if (level === 'LOW') level = 'MEDIUM';
  }

  if (activity.claimsFailed > 10) {
    reasons.push(`${activity.claimsFailed} failed claim transactions`);
    if (level !== 'HIGH') level = 'MEDIUM';
  }

  return { address, riskLevel: level, riskReasons: reasons, activity, evaluatedAt };
}

export function getWalletRiskSummary(): WalletRiskSummary {
  const generatedAt = new Date().toISOString();
  const byRiskLevel: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, BLOCKED: 0 };
  const highRiskAddresses: string[] = [];
  const blockedAddresses: string[] = [];

  for (const address of _activity.keys()) {
    const profile = evaluateWalletRisk(address);
    byRiskLevel[profile.riskLevel] += 1;
    if (profile.riskLevel === 'HIGH') highRiskAddresses.push(address);
    if (profile.riskLevel === 'BLOCKED') blockedAddresses.push(address);
  }

  return {
    totalTracked: _activity.size,
    byRiskLevel,
    highRiskAddresses,
    blockedAddresses,
    generatedAt,
  };
}

export function getAllWalletProfiles(): WalletRiskProfile[] {
  return Array.from(_activity.keys()).map(evaluateWalletRisk);
}
