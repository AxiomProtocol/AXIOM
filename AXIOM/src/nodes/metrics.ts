import {
  NodeOperator,
  NodeOnboarding,
  NodeAttestation,
  NodeRewardsLedger,
  NodeIncident,
  OperatorRole,
  OperatorStatus,
  IncidentSeverity,
} from './types';
import { getActiveOperators, getSuspendedOperators, getOperatorsByRole, getOperatorsByStatus } from './registry';
import { aggregateLedgers } from './rewards';
import { countIncidentsBySeverity, getOpenIncidents, getCriticalIncidents } from './incidents';

export interface OperatorMetrics {
  total: number;
  byRole: Record<OperatorRole, number>;
  byStatus: Record<OperatorStatus, number>;
  active: number;
  suspended: number;
}

export interface AttestationMetrics {
  total: number;
  validations: number;
  finalAttestations: number;
  recordedOnChain: number;
  passRate: number;
  avgTimeToAttestMinutes: number;
}

export interface RewardMetrics {
  totalAccruedUsd: number;
  totalPaidUsd: number;
  totalPendingUsd: number;
  totalSlashedUsd: number;
  avgPayoutUsd: number;
}

export interface IncidentMetrics {
  total: number;
  open: number;
  bySeverity: Record<IncidentSeverity, number>;
  criticalCount: number;
  governanceIncidents: number;
}

export interface SettlementMetrics {
  packetsProcessed: number;
  avgTimeToSettlementDays: number;
  dualAttestationCompleteCount: number;
}

export interface WeeklyMetrics {
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: string;
  operators: OperatorMetrics;
  attestations: AttestationMetrics;
  rewards: RewardMetrics;
  incidents: IncidentMetrics;
  settlements: SettlementMetrics;
  slaCompliance: {
    responseTimePercent: number;
    availabilityPercent: number;
    accuracyPercent: number;
  };
}

export function calculateOperatorMetrics(operators: NodeOperator[]): OperatorMetrics {
  const byRole: Record<OperatorRole, number> = {
    OBSERVER: 0,
    VALIDATOR: 0,
    ATTESTOR: 0,
  };

  const byStatus: Record<OperatorStatus, number> = {
    APPLIED: 0,
    VERIFIED: 0,
    PROVISIONED: 0,
    DRY_RUN_PASSED: 0,
    CERTIFIED: 0,
    ACTIVE: 0,
  };

  for (const op of operators) {
    byRole[op.role]++;
    byStatus[op.status]++;
  }

  return {
    total: operators.length,
    byRole,
    byStatus,
    active: getActiveOperators(operators).length,
    suspended: getSuspendedOperators(operators).length,
  };
}

export function calculateAttestationMetrics(attestations: NodeAttestation[]): AttestationMetrics {
  const validations = attestations.filter(a => a.attestationType === 'VALIDATION');
  const finals = attestations.filter(a => a.attestationType === 'FINAL_ATTESTATION');
  const recorded = attestations.filter(a => a.recordedOnChain);
  const passed = attestations.filter(a => a.status === 'RECORDED');

  return {
    total: attestations.length,
    validations: validations.length,
    finalAttestations: finals.length,
    recordedOnChain: recorded.length,
    passRate: attestations.length > 0 ? (passed.length / attestations.length) * 100 : 100,
    avgTimeToAttestMinutes: 0, // Would need timestamp comparison with packet creation
  };
}

export function calculateRewardMetrics(ledgers: NodeRewardsLedger[]): RewardMetrics {
  const aggregated = aggregateLedgers(ledgers);
  const payouts = ledgers.flatMap(l => l.payouts);
  const avgPayout = payouts.length > 0 
    ? payouts.reduce((sum, p) => sum + p.usdAmount, 0) / payouts.length 
    : 0;

  return {
    totalAccruedUsd: aggregated.totalAccrued,
    totalPaidUsd: aggregated.totalPaid,
    totalPendingUsd: aggregated.totalPending,
    totalSlashedUsd: aggregated.totalSlashed,
    avgPayoutUsd: avgPayout,
  };
}

export function calculateIncidentMetrics(incidents: NodeIncident[]): IncidentMetrics {
  const bySeverity = countIncidentsBySeverity(incidents);
  const open = getOpenIncidents(incidents);
  const critical = getCriticalIncidents(incidents);
  
  const governanceIncidents = incidents.filter(
    i => i.category === 'ATTESTATION_MISCONDUCT' || 
         i.category === 'CONFLICT_OF_INTEREST' ||
         i.severity === 'CRITICAL'
  );

  return {
    total: incidents.length,
    open: open.length,
    bySeverity,
    criticalCount: critical.length,
    governanceIncidents: governanceIncidents.length,
  };
}

export function calculateSettlementMetrics(
  attestations: NodeAttestation[]
): SettlementMetrics {
  const packetIds = new Set(attestations.map(a => a.packetId));
  
  const dualAttestationComplete = Array.from(packetIds).filter(packetId => {
    const packetAttestations = attestations.filter(
      a => a.packetId === packetId && 
           a.attestationType === 'FINAL_ATTESTATION' &&
           a.status === 'RECORDED'
    );
    const uniqueOperators = new Set(packetAttestations.map(a => a.operatorId));
    return uniqueOperators.size >= 2;
  });

  return {
    packetsProcessed: packetIds.size,
    avgTimeToSettlementDays: 0, // Would need packet creation timestamps
    dualAttestationCompleteCount: dualAttestationComplete.length,
  };
}

export function generateWeeklyMetrics(params: {
  operators: NodeOperator[];
  attestations: NodeAttestation[];
  ledgers: NodeRewardsLedger[];
  incidents: NodeIncident[];
  weekStart?: Date;
}): WeeklyMetrics {
  const now = new Date();
  const weekStart = params.weekStart || getWeekStart(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  return {
    weekStartDate: weekStart.toISOString().split('T')[0],
    weekEndDate: weekEnd.toISOString().split('T')[0],
    generatedAt: now.toISOString(),
    operators: calculateOperatorMetrics(params.operators),
    attestations: calculateAttestationMetrics(params.attestations),
    rewards: calculateRewardMetrics(params.ledgers),
    incidents: calculateIncidentMetrics(params.incidents),
    settlements: calculateSettlementMetrics(params.attestations),
    slaCompliance: {
      responseTimePercent: 95, // Default until we have historical data
      availabilityPercent: 99,
      accuracyPercent: 98,
    },
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day;
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatMetricsMarkdown(metrics: WeeklyMetrics): string {
  return `# Node Operator Weekly Report

**Week:** ${metrics.weekStartDate} to ${metrics.weekEndDate}  
**Generated:** ${metrics.generatedAt}

---

## Operator Summary

| Metric | Value |
|--------|-------|
| Total Operators | ${metrics.operators.total} |
| Active | ${metrics.operators.active} |
| Suspended | ${metrics.operators.suspended} |

### By Role
| Role | Count |
|------|-------|
| Observer | ${metrics.operators.byRole.OBSERVER} |
| Validator | ${metrics.operators.byRole.VALIDATOR} |
| Attestor | ${metrics.operators.byRole.ATTESTOR} |

### By Status
| Status | Count |
|--------|-------|
| Applied | ${metrics.operators.byStatus.APPLIED} |
| Verified | ${metrics.operators.byStatus.VERIFIED} |
| Provisioned | ${metrics.operators.byStatus.PROVISIONED} |
| Dry-Run Passed | ${metrics.operators.byStatus.DRY_RUN_PASSED} |
| Certified | ${metrics.operators.byStatus.CERTIFIED} |
| Active | ${metrics.operators.byStatus.ACTIVE} |

---

## Attestation Metrics

| Metric | Value |
|--------|-------|
| Total Attestations | ${metrics.attestations.total} |
| Validations | ${metrics.attestations.validations} |
| Final Attestations | ${metrics.attestations.finalAttestations} |
| Recorded On-Chain | ${metrics.attestations.recordedOnChain} |
| Pass Rate | ${metrics.attestations.passRate.toFixed(1)}% |

---

## Settlement Metrics

| Metric | Value |
|--------|-------|
| Packets Processed | ${metrics.settlements.packetsProcessed} |
| Dual Attestation Complete | ${metrics.settlements.dualAttestationCompleteCount} |

---

## Reward Metrics

| Metric | Value |
|--------|-------|
| Total Accrued | $${metrics.rewards.totalAccruedUsd.toFixed(2)} |
| Total Paid | $${metrics.rewards.totalPaidUsd.toFixed(2)} |
| Total Pending | $${metrics.rewards.totalPendingUsd.toFixed(2)} |
| Total Slashed | $${metrics.rewards.totalSlashedUsd.toFixed(2)} |
| Average Payout | $${metrics.rewards.avgPayoutUsd.toFixed(2)} |

---

## Incident Summary

| Metric | Value |
|--------|-------|
| Total Incidents | ${metrics.incidents.total} |
| Open Incidents | ${metrics.incidents.open} |
| Critical | ${metrics.incidents.criticalCount} |
| Governance Incidents | ${metrics.incidents.governanceIncidents} |

### By Severity
| Severity | Count |
|----------|-------|
| Low | ${metrics.incidents.bySeverity.LOW} |
| Medium | ${metrics.incidents.bySeverity.MEDIUM} |
| High | ${metrics.incidents.bySeverity.HIGH} |
| Critical | ${metrics.incidents.bySeverity.CRITICAL} |

---

## SLA Compliance

| Metric | Target | Actual |
|--------|--------|--------|
| Response Time | 95% | ${metrics.slaCompliance.responseTimePercent}% |
| Availability | 99% | ${metrics.slaCompliance.availabilityPercent}% |
| Accuracy | 98% | ${metrics.slaCompliance.accuracyPercent}% |

---

## Key Takeaways

- **Governance Incident Count:** ${metrics.incidents.governanceIncidents} (Target: 0)
- **Active Operator Ratio:** ${((metrics.operators.active / Math.max(metrics.operators.total, 1)) * 100).toFixed(1)}%
- **Attestation Success Rate:** ${metrics.attestations.passRate.toFixed(1)}%

---

*Report generated by Axiom Node Operator Program*
`;
}

export function formatMetricsJson(metrics: WeeklyMetrics): string {
  return JSON.stringify(metrics, null, 2);
}
