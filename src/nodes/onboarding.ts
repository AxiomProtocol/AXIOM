import { createHash, randomBytes } from 'crypto';
import {
  NodeOperator,
  NodeOnboarding,
  OperatorRole,
  OperatorStatus,
  VerificationTier,
  DryRunExercise,
  CertificationChecklist,
  VERIFICATION_TIER_FOR_ROLE,
  STATUS_ORDER,
} from './types';
import { 
  createOperator, 
  transitionStatus, 
  computeHash,
  canTransitionStatus 
} from './registry';

export function generateOnboardingId(): string {
  return `ONB-${randomBytes(4).toString('hex')}`;
}

export function generateExerciseId(): string {
  return `EX-${randomBytes(4).toString('hex')}`;
}

export function createOnboarding(params: {
  walletAddress: string;
  email?: string;
  displayName?: string;
  requestedRole: OperatorRole;
  conflictDisclosure?: string;
}): { operator: NodeOperator; onboarding: NodeOnboarding } {
  const operator = createOperator({
    walletAddress: params.walletAddress,
    email: params.email,
    displayName: params.displayName,
    role: params.requestedRole,
    conflictDisclosure: params.conflictDisclosure,
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const onboarding: NodeOnboarding = {
    onboardingId: generateOnboardingId(),
    operatorId: operator.operatorId,
    requestedRole: params.requestedRole,
    currentPhase: 'APPLIED',
    requiredVerificationTier: VERIFICATION_TIER_FOR_ROLE[params.requestedRole],
    phases: {
      applied: {
        completedAt: now.toISOString(),
        hash: computeHash(JSON.stringify({ operator, timestamp: now.toISOString() })),
      },
    },
    dryRunExercises: [],
    certificationChecklist: {
      verificationComplete: false,
      dryRunPassed: false,
      charterAcknowledged: false,
      emergencyContactProvided: false,
      slaCommitmentSigned: false,
    },
    expiresAt: expiresAt.toISOString(),
    startedAt: now.toISOString(),
    lastUpdatedAt: now.toISOString(),
  };

  return { operator, onboarding };
}

export function completeVerification(
  operator: NodeOperator,
  onboarding: NodeOnboarding,
  verificationArtifacts: NodeOperator['verificationArtifacts']
): { operator: NodeOperator; onboarding: NodeOnboarding } {
  if (onboarding.currentPhase !== 'APPLIED') {
    throw new Error(`Cannot verify: current phase is ${onboarding.currentPhase}, expected APPLIED`);
  }

  const now = new Date().toISOString();
  const updatedOperator = transitionStatus(
    { ...operator, verificationArtifacts },
    'VERIFIED'
  );

  const updatedOnboarding: NodeOnboarding = {
    ...onboarding,
    currentPhase: 'VERIFIED',
    phases: {
      ...onboarding.phases,
      verified: {
        completedAt: now,
        hash: computeHash(JSON.stringify(verificationArtifacts)),
      },
    },
    certificationChecklist: {
      ...onboarding.certificationChecklist,
      verificationComplete: true,
    },
    lastUpdatedAt: now,
  };

  return { operator: updatedOperator, onboarding: updatedOnboarding };
}

export function completeProvisioning(
  operator: NodeOperator,
  onboarding: NodeOnboarding
): { operator: NodeOperator; onboarding: NodeOnboarding } {
  if (onboarding.currentPhase !== 'VERIFIED') {
    throw new Error(`Cannot provision: current phase is ${onboarding.currentPhase}, expected VERIFIED`);
  }

  const now = new Date().toISOString();
  const updatedOperator = transitionStatus(operator, 'PROVISIONED');

  const provisionData = {
    operatorId: operator.operatorId,
    role: operator.role,
    provisionedAt: now,
  };

  const updatedOnboarding: NodeOnboarding = {
    ...onboarding,
    currentPhase: 'PROVISIONED',
    phases: {
      ...onboarding.phases,
      provisioned: {
        completedAt: now,
        hash: computeHash(JSON.stringify(provisionData)),
      },
    },
    lastUpdatedAt: now,
  };

  return { operator: updatedOperator, onboarding: updatedOnboarding };
}

function getRequiredExercises(role: OperatorRole): { type: DryRunExercise['type']; count: number }[] {
  switch (role) {
    case 'OBSERVER':
      return [
        { type: 'REPORT', count: 2 },
      ];
    case 'VALIDATOR':
      return [
        { type: 'REPORT', count: 2 },
        { type: 'VALIDATION', count: 2 },
      ];
    case 'ATTESTOR':
      return [
        { type: 'REPORT', count: 2 },
        { type: 'VALIDATION', count: 2 },
        { type: 'ATTESTATION', count: 2 },
        { type: 'DUAL_ATTESTATION_SIM', count: 1 },
      ];
  }
}

export function createDryRunExercises(role: OperatorRole): DryRunExercise[] {
  const requirements = getRequiredExercises(role);
  const exercises: DryRunExercise[] = [];

  for (const req of requirements) {
    for (let i = 0; i < req.count; i++) {
      exercises.push({
        exerciseId: generateExerciseId(),
        type: req.type,
        status: 'PENDING',
      });
    }
  }

  return exercises;
}

export function recordExerciseResult(
  onboarding: NodeOnboarding,
  exerciseId: string,
  result: { status: 'PASSED' | 'FAILED'; score?: number; feedback?: string; packetId?: string }
): NodeOnboarding {
  const exercises = onboarding.dryRunExercises.map(ex => {
    if (ex.exerciseId === exerciseId) {
      return {
        ...ex,
        status: result.status,
        score: result.score,
        feedback: result.feedback,
        packetId: result.packetId,
        completedAt: new Date().toISOString(),
      };
    }
    return ex;
  });

  return {
    ...onboarding,
    dryRunExercises: exercises,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function checkDryRunComplete(onboarding: NodeOnboarding): boolean {
  const allCompleted = onboarding.dryRunExercises.every(
    ex => ex.status === 'PASSED' || ex.status === 'FAILED'
  );
  const allPassed = onboarding.dryRunExercises.every(ex => ex.status === 'PASSED');
  return allCompleted && allPassed;
}

export function calculateDryRunScore(onboarding: NodeOnboarding): number {
  const scoredExercises = onboarding.dryRunExercises.filter(ex => ex.score !== undefined);
  if (scoredExercises.length === 0) return 0;
  const total = scoredExercises.reduce((sum, ex) => sum + (ex.score || 0), 0);
  return total / scoredExercises.length;
}

export function completeDryRun(
  operator: NodeOperator,
  onboarding: NodeOnboarding
): { operator: NodeOperator; onboarding: NodeOnboarding } {
  if (onboarding.currentPhase !== 'PROVISIONED') {
    throw new Error(`Cannot complete dry-run: current phase is ${onboarding.currentPhase}, expected PROVISIONED`);
  }

  if (!checkDryRunComplete(onboarding)) {
    throw new Error('Not all dry-run exercises have passed');
  }

  const now = new Date().toISOString();
  const score = calculateDryRunScore(onboarding);
  const updatedOperator = transitionStatus(operator, 'DRY_RUN_PASSED');

  const updatedOnboarding: NodeOnboarding = {
    ...onboarding,
    currentPhase: 'DRY_RUN_PASSED',
    phases: {
      ...onboarding.phases,
      dryRunPassed: {
        completedAt: now,
        hash: computeHash(JSON.stringify(onboarding.dryRunExercises)),
        exercisesCompleted: onboarding.dryRunExercises.length,
        score,
      },
    },
    certificationChecklist: {
      ...onboarding.certificationChecklist,
      dryRunPassed: true,
    },
    lastUpdatedAt: now,
  };

  return { operator: updatedOperator, onboarding: updatedOnboarding };
}

export function completeCertification(
  operator: NodeOperator,
  onboarding: NodeOnboarding,
  acknowledgments: {
    charterAcknowledged: boolean;
    emergencyContactProvided: boolean;
    slaCommitmentSigned: boolean;
  }
): { operator: NodeOperator; onboarding: NodeOnboarding } {
  if (onboarding.currentPhase !== 'DRY_RUN_PASSED') {
    throw new Error(`Cannot certify: current phase is ${onboarding.currentPhase}, expected DRY_RUN_PASSED`);
  }

  const checklist: CertificationChecklist = {
    ...onboarding.certificationChecklist,
    ...acknowledgments,
  };

  const allComplete = Object.values(checklist).every(v => v === true);
  if (!allComplete) {
    const missing = Object.entries(checklist)
      .filter(([_, v]) => !v)
      .map(([k]) => k);
    throw new Error(`Certification incomplete. Missing: ${missing.join(', ')}`);
  }

  const now = new Date().toISOString();
  const certificationData = {
    operatorId: operator.operatorId,
    checklist,
    certifiedAt: now,
  };
  const certHash = computeHash(JSON.stringify(certificationData));

  const updatedOperator = transitionStatus(operator, 'CERTIFIED', certHash);

  const updatedOnboarding: NodeOnboarding = {
    ...onboarding,
    currentPhase: 'CERTIFIED',
    phases: {
      ...onboarding.phases,
      certified: {
        completedAt: now,
        hash: certHash,
      },
    },
    certificationChecklist: checklist,
    lastUpdatedAt: now,
  };

  return { operator: updatedOperator, onboarding: updatedOnboarding };
}

export function activateOperator(
  operator: NodeOperator,
  onboarding: NodeOnboarding
): { operator: NodeOperator; onboarding: NodeOnboarding } {
  if (onboarding.currentPhase !== 'CERTIFIED') {
    throw new Error(`Cannot activate: current phase is ${onboarding.currentPhase}, expected CERTIFIED`);
  }

  const now = new Date().toISOString();
  const updatedOperator = transitionStatus(operator, 'ACTIVE');

  const updatedOnboarding: NodeOnboarding = {
    ...onboarding,
    currentPhase: 'ACTIVE',
    phases: {
      ...onboarding.phases,
      activated: {
        completedAt: now,
        hash: computeHash(JSON.stringify({ operatorId: operator.operatorId, activatedAt: now })),
      },
    },
    completedAt: now,
    lastUpdatedAt: now,
  };

  return { operator: updatedOperator, onboarding: updatedOnboarding };
}

export function isOnboardingExpired(onboarding: NodeOnboarding): boolean {
  if (onboarding.currentPhase === 'ACTIVE' || onboarding.currentPhase === 'EXPIRED') {
    return false;
  }
  return new Date() > new Date(onboarding.expiresAt);
}

export function expireOnboarding(onboarding: NodeOnboarding): NodeOnboarding {
  return {
    ...onboarding,
    currentPhase: 'EXPIRED',
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function rejectOnboarding(onboarding: NodeOnboarding, reason: string): NodeOnboarding {
  return {
    ...onboarding,
    currentPhase: 'REJECTED',
    rejectionReason: reason,
    lastUpdatedAt: new Date().toISOString(),
  };
}
