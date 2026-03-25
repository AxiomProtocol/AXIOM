import { isActionAllowed, recordHealthCheck } from './circuitBreaker';
import { emitSentinelAlert } from './notifications';
import type { PilotActionType, SentinelAlertEvent } from './types';
import { TREASURY_POLICY, RISK_ACTION_CLASSIFICATION } from './types';

export interface AuthorizationRequest {
  scope: string;
  actionType: PilotActionType | string;
  subject: string;
  requestedNotional: number;
  metadata?: Record<string, unknown>;
}

export interface AuthorizationResult {
  authorized: boolean;
  decision: 'APPROVED' | 'DENIED';
  reasonCode: string;
  plainLanguage: string;
  maxNotional: number;
  constraints: string[];
  timestamp: string;
}

const NOTIONAL_LIMITS: Record<string, number> = {
  AssetPurchased: 50000,
  CapitalCallIssued: 25000,
  DistributionApproved: 10000,
  CapitalCallFunded: 25000,
  DistributionCalculated: 10000,
  PropertyListedForSale: 50000,
  MaintenanceApproved: 5000,
  TenantOnboarded: 0,
  LeaseExecuted: 0,
  InspectionCompleted: 0,
  DocumentUploaded: 0,
  ReportGenerated: 0,
  EulerEarnRebalance: 500000,
  EULER_EARN_REBALANCE: 500000,
};

const DB_ACTION_TYPE_MAP: Record<string, PilotActionType> = {
  EULER_EARN_REBALANCE: 'EulerEarnRebalance',
};

function getActionRiskLevel(actionType: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const normalized = DB_ACTION_TYPE_MAP[actionType] ?? actionType;
  const classification = RISK_ACTION_CLASSIFICATION[normalized as PilotActionType];
  if (classification) return classification;
  const HIGH_ACTIONS = ['AssetPurchased', 'CapitalCallIssued', 'DistributionApproved'];
  const MEDIUM_ACTIONS = ['CapitalCallFunded', 'DistributionCalculated', 'PropertyListedForSale', 'MaintenanceApproved', 'TenantOnboarded', 'LeaseExecuted', 'InspectionCompleted'];
  if (HIGH_ACTIONS.includes(actionType)) return 'HIGH';
  if (MEDIUM_ACTIONS.includes(actionType)) return 'MEDIUM';
  return 'LOW';
}

export async function authorizeAction(request: AuthorizationRequest): Promise<AuthorizationResult> {
  const timestamp = new Date().toISOString();
  const riskLevel = getActionRiskLevel(request.actionType);
  const constraints: string[] = [];

  const circuitCheck = isActionAllowed(request.actionType as PilotActionType);
  if (!circuitCheck.allowed) {
    await emitSentinelAlert(
      'SentinelDegraded' as SentinelAlertEvent,
      'SAFE_MODE',
      `Action ${request.actionType} blocked by circuit breaker: ${circuitCheck.reason}`
    );
    return {
      authorized: false,
      decision: 'DENIED',
      reasonCode: 'CIRCUIT_BREAKER_ACTIVE',
      plainLanguage: `The system circuit breaker has blocked this ${riskLevel}-risk action. ${circuitCheck.reason}`,
      maxNotional: 0,
      constraints: ['Circuit breaker is active — action blocked'],
      timestamp,
    };
  }

  const notionalLimit = NOTIONAL_LIMITS[request.actionType];
  if (notionalLimit !== undefined && notionalLimit > 0 && request.requestedNotional > notionalLimit) {
    constraints.push(`Notional capped from $${request.requestedNotional.toLocaleString()} to $${notionalLimit.toLocaleString()}`);
  }

  const effectiveNotional = notionalLimit !== undefined && notionalLimit > 0
    ? Math.min(request.requestedNotional, notionalLimit)
    : request.requestedNotional;

  if (riskLevel === 'HIGH') {
    constraints.push('HIGH risk action — requires enhanced monitoring');
    constraints.push(`Treasury policy: ${TREASURY_POLICY.reserves * 100}% reserves must be maintained`);
  }

  if (riskLevel === 'MEDIUM') {
    constraints.push('MEDIUM risk action — standard monitoring applied');
  }

  await recordHealthCheck(true, 0);

  return {
    authorized: true,
    decision: 'APPROVED',
    reasonCode: 'CRITERIA_MET',
    plainLanguage: `${request.actionType} authorized for ${request.subject}. ${constraints.length > 0 ? 'Constraints applied.' : 'No additional constraints.'}`,
    maxNotional: effectiveNotional,
    constraints,
    timestamp,
  };
}

export function getTreasuryPolicy() {
  return { ...TREASURY_POLICY };
}

export function getNotionalLimit(actionType: string): number | undefined {
  return NOTIONAL_LIMITS[actionType];
}
