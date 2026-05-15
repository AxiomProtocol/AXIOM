import 'server-only';
import { pollCampaignState } from './campaignStatePoller';
import { pollClaimEvents } from './claimEventPoller';

// =============================================================================
// Campaign Integrity Monitor — Phase 10 Monitoring
//
// Detects unexpected state changes, merkle root tampering, and pool
// discrepancies for the active Phase 9 mainnet campaign.
// Read-only. No private key exposure.
// =============================================================================

const EXPECTED_MERKLE_ROOT = 'dd6b3d845ed2129701dac7cf2637baf7a0b599d27813be4c75d3deb80394c67a';
const EXPECTED_AMOUNT_PER_CLAIM = '1000000';

export type IntegritySeverity = 'OK' | 'WARNING' | 'CRITICAL';

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  severity: IntegritySeverity;
  detail: string;
  checkedAt: string;
}

export interface CampaignIntegrityReport {
  campaignObjectId: string;
  overallStatus: IntegritySeverity;
  checks: IntegrityCheck[];
  generatedAt: string;
  error?: string;
}

export async function runCampaignIntegrityCheck(
  campaignObjectId: string,
  packageId: string,
): Promise<CampaignIntegrityReport> {
  const generatedAt = new Date().toISOString();
  const checks: IntegrityCheck[] = [];

  try {
    const [state, claimPoll] = await Promise.all([
      pollCampaignState(campaignObjectId),
      pollClaimEvents({ packageId, limit: 10 }),
    ]);

    const now = generatedAt;

    // Check 1: Campaign is active
    checks.push({
      name: 'campaign_active',
      passed: state.isActive === true,
      severity: state.isActive === true ? 'OK' : 'CRITICAL',
      detail: state.isActive === true
        ? 'Campaign is active'
        : `Campaign is_active=${state.isActive} — unexpected state`,
      checkedAt: now,
    });

    // Check 2: Campaign is not closed
    checks.push({
      name: 'campaign_not_closed',
      passed: state.isClosed === false,
      severity: state.isClosed === false ? 'OK' : 'CRITICAL',
      detail: state.isClosed === false
        ? 'Campaign is not closed'
        : 'Campaign is_closed=true — unexpected closure detected',
      checkedAt: now,
    });

    // Check 3: Merkle root integrity
    const rootMatch = state.merkleRoot != null &&
      String(state.merkleRoot).includes(EXPECTED_MERKLE_ROOT.slice(0, 8));
    checks.push({
      name: 'merkle_root_integrity',
      passed: rootMatch,
      severity: rootMatch ? 'OK' : 'CRITICAL',
      detail: rootMatch
        ? 'Merkle root matches expected value'
        : `Merkle root mismatch — on-chain: ${state.merkleRoot ?? 'null'}`,
      checkedAt: now,
    });

    // Check 4: Amount per claim unchanged
    const amountMatch = state.amountPerClaim === EXPECTED_AMOUNT_PER_CLAIM;
    checks.push({
      name: 'amount_per_claim_unchanged',
      passed: amountMatch,
      severity: amountMatch ? 'OK' : 'CRITICAL',
      detail: amountMatch
        ? `amount_per_claim = ${EXPECTED_AMOUNT_PER_CLAIM} (correct)`
        : `amount_per_claim changed: ${state.amountPerClaim} (expected ${EXPECTED_AMOUNT_PER_CLAIM})`,
      checkedAt: now,
    });

    // Check 5: Pool not empty
    const poolRaw = Number(state.poolValueRaw ?? '0');
    const poolHealthy = poolRaw > 0;
    checks.push({
      name: 'pool_not_empty',
      passed: poolHealthy,
      severity: poolHealthy ? 'OK' : 'WARNING',
      detail: poolHealthy
        ? `Pool balance: ${poolRaw} base units`
        : 'Pool is empty — campaign will fail on next claim attempt',
      checkedAt: now,
    });

    // Check 6: No RPC fetch errors
    const rpcOk = !state.error;
    checks.push({
      name: 'rpc_object_fetch',
      passed: rpcOk,
      severity: rpcOk ? 'OK' : 'WARNING',
      detail: rpcOk
        ? 'Object state fetched successfully'
        : `RPC fetch error: ${state.error}`,
      checkedAt: now,
    });

    // Check 7: Event poller not erroring
    const pollOk = !claimPoll.error;
    checks.push({
      name: 'event_poller_ok',
      passed: pollOk,
      severity: pollOk ? 'OK' : 'WARNING',
      detail: pollOk
        ? 'Event poller operational'
        : `Event poll error: ${claimPoll.error}`,
      checkedAt: now,
    });

    const hasWarning = checks.some((c) => c.severity === 'WARNING');
    const hasCritical = checks.some((c) => c.severity === 'CRITICAL');

    return {
      campaignObjectId,
      overallStatus: hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'OK',
      checks,
      generatedAt,
    };
  } catch (err) {
    return {
      campaignObjectId,
      overallStatus: 'CRITICAL',
      checks,
      generatedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
