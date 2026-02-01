import { randomBytes } from 'crypto';
import {
  NodeIncident,
  NodeOperator,
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
  IncidentOutcomeDecision,
  Investigation,
  IncidentOutcome,
  EvidenceItem,
  SLASHING_SCHEDULE,
} from './types';
import { suspendOperator, revokeOperator, incrementIncidents, computeHash } from './registry';

export function generateIncidentId(): string {
  return `INC-${randomBytes(4).toString('hex')}`;
}

export function createIncident(params: {
  operatorId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  title: string;
  description: string;
  reportedBy: string;
  evidenceHashes?: EvidenceItem[];
  relatedPacketIds?: string[];
  relatedAttestationIds?: string[];
}): NodeIncident {
  const now = new Date().toISOString();
  
  const incident: NodeIncident = {
    incidentId: generateIncidentId(),
    operatorId: params.operatorId,
    severity: params.severity,
    category: params.category,
    status: 'REPORTED',
    title: params.title,
    description: params.description,
    evidenceHashes: params.evidenceHashes || [],
    relatedPacketIds: params.relatedPacketIds || [],
    relatedAttestationIds: params.relatedAttestationIds || [],
    reportedBy: params.reportedBy,
    reportedAt: now,
  };

  return incident;
}

export function acknowledgeIncident(incident: NodeIncident): NodeIncident {
  return {
    ...incident,
    status: 'ACKNOWLEDGED',
    acknowledgedAt: new Date().toISOString(),
  };
}

export function startInvestigation(
  incident: NodeIncident,
  investigatorId: string
): NodeIncident {
  return {
    ...incident,
    status: 'INVESTIGATING',
    investigation: {
      investigatorId,
      startedAt: new Date().toISOString(),
    },
  };
}

export function recordOperatorResponse(
  incident: NodeIncident,
  response: string
): NodeIncident {
  return {
    ...incident,
    status: 'PENDING_RESPONSE',
    operatorResponse: response,
  };
}

export function completeInvestigation(
  incident: NodeIncident,
  findings: string,
  recommendation: IncidentOutcomeDecision
): NodeIncident {
  const findingsHash = computeHash(findings);
  
  return {
    ...incident,
    status: 'UNDER_REVIEW',
    investigation: {
      ...incident.investigation!,
      completedAt: new Date().toISOString(),
      findings,
      findingsHash,
      recommendation,
    },
  };
}

export function resolveIncident(
  incident: NodeIncident,
  decision: IncidentOutcomeDecision,
  rationale: string,
  unpaidRewardsAmount: number = 0
): { incident: NodeIncident; slashAmount: number; suspensionDays: number } {
  const schedule = SLASHING_SCHEDULE[incident.severity];
  const slashPercent = decision === 'NO_ACTION' ? 0 : schedule.slashPercent;
  const slashAmount = unpaidRewardsAmount * (slashPercent / 100);
  const suspensionDays = decision === 'NO_ACTION' ? 0 : schedule.suspensionDays;

  const now = new Date().toISOString();
  
  const outcome: IncidentOutcome = {
    decision,
    decisionRationale: rationale,
    slashPercent,
    slashAmount,
    suspensionDays,
    effectiveDate: now,
    decisionHash: computeHash(JSON.stringify({ decision, rationale, slashAmount, now })),
  };

  let resolvedStatus: IncidentStatus;
  switch (decision) {
    case 'NO_ACTION':
      resolvedStatus = 'RESOLVED_NO_ACTION';
      break;
    case 'WARNING':
      resolvedStatus = 'RESOLVED_WARNING';
      break;
    case 'SUSPENSION':
      resolvedStatus = 'RESOLVED_SUSPENSION';
      break;
    case 'REVOCATION':
      resolvedStatus = 'RESOLVED_REVOCATION';
      break;
  }

  const resolvedIncident: NodeIncident = {
    ...incident,
    status: resolvedStatus,
    outcome,
    resolvedAt: now,
    publicSummary: generatePublicSummary(incident, decision),
  };

  return { incident: resolvedIncident, slashAmount, suspensionDays };
}

function generatePublicSummary(incident: NodeIncident, decision: IncidentOutcomeDecision): string {
  if (incident.severity === 'LOW' || incident.severity === 'MEDIUM') {
    return `${incident.severity} severity incident resolved with ${decision.toLowerCase().replace('_', ' ')}`;
  }
  return `${incident.severity} severity ${incident.category.toLowerCase().replace(/_/g, ' ')} incident resolved. Outcome: ${decision.toLowerCase().replace('_', ' ')}`;
}

export function applyIncidentToOperator(
  operator: NodeOperator,
  incident: NodeIncident
): NodeOperator {
  if (!incident.outcome) {
    throw new Error('Incident has no outcome to apply');
  }

  let updatedOperator = incrementIncidents(operator);

  switch (incident.outcome.decision) {
    case 'SUSPENSION':
      updatedOperator = suspendOperator(
        updatedOperator,
        `Suspended due to incident ${incident.incidentId}: ${incident.title}`
      );
      break;
    case 'REVOCATION':
      updatedOperator = revokeOperator(
        updatedOperator,
        `Revoked due to incident ${incident.incidentId}: ${incident.title}`
      );
      break;
  }

  return updatedOperator;
}

export function fileAppeal(
  incident: NodeIncident,
  grounds: string
): NodeIncident {
  if (!incident.resolvedAt) {
    throw new Error('Cannot appeal: incident not yet resolved');
  }

  const resolvedDate = new Date(incident.resolvedAt);
  const appealDeadline = new Date(resolvedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  if (new Date() > appealDeadline) {
    throw new Error('Appeal deadline has passed (7 days from resolution)');
  }

  return {
    ...incident,
    status: 'APPEALED',
    appeal: {
      filedAt: new Date().toISOString(),
      grounds,
    },
  };
}

export function resolveAppeal(
  incident: NodeIncident,
  decision: 'GRANTED' | 'DENIED' | 'PARTIAL',
  rationale: string
): NodeIncident {
  if (!incident.appeal) {
    throw new Error('No appeal filed for this incident');
  }

  const status: IncidentStatus = decision === 'GRANTED' ? 'APPEAL_GRANTED' : 'APPEAL_DENIED';

  return {
    ...incident,
    status,
    appeal: {
      ...incident.appeal,
      reviewedAt: new Date().toISOString(),
      decision,
      decisionRationale: rationale,
    },
  };
}

export function getIncidentsBySeverity(
  incidents: NodeIncident[],
  severity: IncidentSeverity
): NodeIncident[] {
  return incidents.filter(i => i.severity === severity);
}

export function getIncidentsByOperator(
  incidents: NodeIncident[],
  operatorId: string
): NodeIncident[] {
  return incidents.filter(i => i.operatorId === operatorId);
}

export function getOpenIncidents(incidents: NodeIncident[]): NodeIncident[] {
  const closedStatuses: IncidentStatus[] = [
    'RESOLVED_NO_ACTION',
    'RESOLVED_WARNING',
    'RESOLVED_SUSPENSION',
    'RESOLVED_REVOCATION',
    'APPEAL_DENIED',
    'APPEAL_GRANTED',
  ];
  return incidents.filter(i => !closedStatuses.includes(i.status));
}

export function getCriticalIncidents(incidents: NodeIncident[]): NodeIncident[] {
  return incidents.filter(i => i.severity === 'CRITICAL');
}

export function countIncidentsBySeverity(
  incidents: NodeIncident[]
): Record<IncidentSeverity, number> {
  const counts: Record<IncidentSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const incident of incidents) {
    counts[incident.severity]++;
  }

  return counts;
}
