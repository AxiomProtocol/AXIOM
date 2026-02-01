import { createHash, randomUUID } from 'crypto';
import { 
  NodeOperator, 
  OperatorRole, 
  OperatorStatus, 
  VerificationTier,
  VERIFICATION_TIER_FOR_ROLE,
  STATUS_ORDER
} from './types';

export function generateOperatorId(): string {
  return `OP-${randomUUID()}`;
}

export function computeHash(data: string): string {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

export function createOperator(params: {
  walletAddress: string;
  email?: string;
  displayName?: string;
  role: OperatorRole;
  conflictDisclosure?: string;
}): NodeOperator {
  const now = new Date().toISOString();
  const verificationTier = VERIFICATION_TIER_FOR_ROLE[params.role];
  
  return {
    operatorId: generateOperatorId(),
    walletAddress: params.walletAddress,
    displayName: params.displayName,
    email: params.email,
    role: params.role,
    status: 'APPLIED',
    suspended: false,
    verificationTier,
    conflictDisclosure: params.conflictDisclosure,
    settlementsCompleted: 0,
    attestationsProvided: 0,
    incidentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function canTransitionStatus(current: OperatorStatus, target: OperatorStatus): boolean {
  const currentIndex = STATUS_ORDER.indexOf(current);
  const targetIndex = STATUS_ORDER.indexOf(target);
  return targetIndex === currentIndex + 1;
}

export function transitionStatus(
  operator: NodeOperator, 
  targetStatus: OperatorStatus,
  hash?: string
): NodeOperator {
  if (!canTransitionStatus(operator.status, targetStatus)) {
    throw new Error(
      `Invalid status transition: ${operator.status} → ${targetStatus}. ` +
      `Must transition through: ${STATUS_ORDER.join(' → ')}`
    );
  }
  
  const now = new Date().toISOString();
  const updated: NodeOperator = {
    ...operator,
    status: targetStatus,
    updatedAt: now,
  };
  
  if (targetStatus === 'ACTIVE') {
    updated.activatedAt = now;
  }
  
  if (targetStatus === 'CERTIFIED' && hash) {
    updated.certificationHash = hash;
  }
  
  return updated;
}

export function suspendOperator(operator: NodeOperator, reason: string): NodeOperator {
  return {
    ...operator,
    suspended: true,
    suspensionReason: reason,
    updatedAt: new Date().toISOString(),
  };
}

export function unsuspendOperator(operator: NodeOperator): NodeOperator {
  return {
    ...operator,
    suspended: false,
    suspensionReason: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function revokeOperator(operator: NodeOperator, reason: string): NodeOperator {
  return {
    ...operator,
    suspended: true,
    suspensionReason: `REVOKED: ${reason}`,
    updatedAt: new Date().toISOString(),
  };
}

export function updateVerificationArtifacts(
  operator: NodeOperator,
  artifacts: NodeOperator['verificationArtifacts']
): NodeOperator {
  return {
    ...operator,
    verificationArtifacts: {
      ...operator.verificationArtifacts,
      ...artifacts,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function recordCharterAcknowledgment(
  operator: NodeOperator,
  acknowledgmentData: string
): NodeOperator {
  const hash = computeHash(acknowledgmentData);
  return {
    ...operator,
    charterAcknowledgmentHash: hash,
    updatedAt: new Date().toISOString(),
  };
}

export function incrementSettlements(operator: NodeOperator): NodeOperator {
  return {
    ...operator,
    settlementsCompleted: operator.settlementsCompleted + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function incrementAttestations(operator: NodeOperator): NodeOperator {
  return {
    ...operator,
    attestationsProvided: operator.attestationsProvided + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function incrementIncidents(operator: NodeOperator): NodeOperator {
  return {
    ...operator,
    incidentCount: operator.incidentCount + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function isOperatorActive(operator: NodeOperator): boolean {
  return operator.status === 'ACTIVE' && !operator.suspended;
}

export function canOperatorAttest(operator: NodeOperator): boolean {
  if (!isOperatorActive(operator)) return false;
  return operator.role === 'ATTESTOR';
}

export function canOperatorValidate(operator: NodeOperator): boolean {
  if (!isOperatorActive(operator)) return false;
  return operator.role === 'VALIDATOR' || operator.role === 'ATTESTOR';
}

export function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function getOperatorsByStatus(
  operators: NodeOperator[], 
  status: OperatorStatus
): NodeOperator[] {
  return operators.filter(op => op.status === status);
}

export function getOperatorsByRole(
  operators: NodeOperator[], 
  role: OperatorRole
): NodeOperator[] {
  return operators.filter(op => op.role === role);
}

export function getActiveOperators(operators: NodeOperator[]): NodeOperator[] {
  return operators.filter(isOperatorActive);
}

export function getSuspendedOperators(operators: NodeOperator[]): NodeOperator[] {
  return operators.filter(op => op.suspended);
}

export function findOperatorById(
  operators: NodeOperator[], 
  operatorId: string
): NodeOperator | undefined {
  return operators.find(op => op.operatorId === operatorId);
}

export function findOperatorByWallet(
  operators: NodeOperator[], 
  walletAddress: string
): NodeOperator | undefined {
  return operators.find(
    op => op.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}
