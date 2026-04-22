import { pool } from '../../server/db';
import { AuditLogger } from '../../server/services/sentinel/AuditLogger';
import type { SentinelOperationalState, StateTransition, SentinelHealthStatus, PilotActionType } from './types';
import { RISK_ACTION_CLASSIFICATION } from './types';

let currentState: SentinelOperationalState = 'NORMAL';
let stateEnteredAt: Date = new Date();
let consecutiveFailures: number = 0;
let consecutiveSuccesses: number = 0;
let lastHealthCheckAt: Date = new Date();
let lastAuthorizationAt: Date | null = null;
let lastLatencyMs: number = 0;
let recoveryConfirmedBy: string | null = null;

const auditLogger = new AuditLogger();

async function transitionState(newState: SentinelOperationalState, triggerCondition: string): Promise<void> {
  const priorState = currentState;
  const durationInPriorState = Date.now() - stateEnteredAt.getTime();

  currentState = newState;
  stateEnteredAt = new Date();
  consecutiveFailures = 0;
  consecutiveSuccesses = 0;

  await auditLogger.initialize();
  await auditLogger.log(
    'sentinel-circuit-breaker',
    'STATE_TRANSITION',
    'circuit_breaker',
    null,
    { priorState, newState, triggerCondition, durationInPriorState }
  );
}

export async function initializeCircuitBreaker(): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT payload_json FROM sentinel_audit_log
       WHERE actor = 'sentinel-circuit-breaker' AND action = 'STATE_TRANSITION'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      const payload = result.rows[0].payload_json;
      currentState = payload.newState as SentinelOperationalState;
      stateEnteredAt = new Date();
      recoveryConfirmedBy = null;
    }
  } catch {
    currentState = 'NORMAL';
    stateEnteredAt = new Date();
  }
}

export async function recordHealthCheck(success: boolean, latencyMs: number): Promise<SentinelOperationalState> {
  lastHealthCheckAt = new Date();
  lastLatencyMs = latencyMs;

  if (success) {
    lastAuthorizationAt = new Date();
    consecutiveSuccesses++;
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    consecutiveSuccesses = 0;
  }

  switch (currentState) {
    case 'NORMAL':
      if (consecutiveFailures >= 3 || latencyMs > 5000) {
        await transitionState('SAFE_MODE', consecutiveFailures >= 3
          ? `consecutive_failures_${consecutiveFailures}`
          : `high_latency_${latencyMs}ms`);
      }
      break;

    case 'SAFE_MODE':
      if (consecutiveFailures >= 10 || (!success && latencyMs === 0)) {
        await transitionState('DEFENSIVE_MODE', consecutiveFailures >= 10
          ? `consecutive_failures_${consecutiveFailures}`
          : 'sentinel_unreachable');
      } else if (consecutiveSuccesses >= 3) {
        await transitionState('RECOVERY_PENDING', `consecutive_successes_${consecutiveSuccesses}`);
      }
      break;

    case 'DEFENSIVE_MODE':
      if (consecutiveSuccesses >= 5) {
        await transitionState('RECOVERY_PENDING', `consecutive_successes_${consecutiveSuccesses}`);
      }
      break;

    case 'RECOVERY_PENDING':
      if (consecutiveFailures >= 3) {
        await transitionState('SAFE_MODE', `recovery_interrupted_failures_${consecutiveFailures}`);
      }
      break;
  }

  return currentState;
}

export async function confirmRecovery(confirmedBy: string): Promise<SentinelOperationalState> {
  if (currentState !== 'RECOVERY_PENDING') {
    return currentState;
  }

  recoveryConfirmedBy = confirmedBy;
  await transitionState('NORMAL', `recovery_confirmed_by_${confirmedBy}`);
  return currentState;
}

export function getHealthStatus(): SentinelHealthStatus {
  return {
    operationalState: currentState,
    lastAuthorizationAt: lastAuthorizationAt ? lastAuthorizationAt.toISOString() : null,
    lastHealthCheckAt: lastHealthCheckAt.toISOString(),
    latencyMs: lastLatencyMs,
    consecutiveFailures,
    stateEnteredAt: stateEnteredAt.toISOString(),
    stateDurationMs: Date.now() - stateEnteredAt.getTime(),
    recoveryConfirmedBy,
  };
}

export function isActionAllowed(actionType: PilotActionType): { allowed: boolean; reason: string } {
  const riskLevel = RISK_ACTION_CLASSIFICATION[actionType];

  if (currentState === 'NORMAL') {
    return { allowed: true, reason: 'System operating normally' };
  }

  if (currentState === 'SAFE_MODE') {
    if (riskLevel === 'HIGH') {
      return { allowed: false, reason: `HIGH risk action '${actionType}' blocked in SAFE_MODE` };
    }
    return { allowed: true, reason: `${riskLevel} risk action allowed in SAFE_MODE` };
  }

  if (currentState === 'DEFENSIVE_MODE') {
    if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
      return { allowed: false, reason: `${riskLevel} risk action '${actionType}' blocked in DEFENSIVE_MODE` };
    }
    return { allowed: true, reason: 'LOW risk action allowed in DEFENSIVE_MODE' };
  }

  if (currentState === 'RECOVERY_PENDING') {
    if (riskLevel === 'HIGH') {
      return { allowed: false, reason: `HIGH risk action '${actionType}' blocked during RECOVERY_PENDING` };
    }
    return { allowed: true, reason: `${riskLevel} risk action allowed during RECOVERY_PENDING` };
  }

  return { allowed: false, reason: 'Unknown operational state' };
}

export function getCurrentState(): SentinelOperationalState {
  return currentState;
}
