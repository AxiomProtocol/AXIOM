export type OperatorRole = 'OBSERVER' | 'VALIDATOR' | 'ATTESTOR';

export type OperatorStatus = 
  | 'APPLIED' 
  | 'VERIFIED' 
  | 'PROVISIONED' 
  | 'DRY_RUN_PASSED' 
  | 'CERTIFIED' 
  | 'ACTIVE';

export type VerificationTier = 'LIGHT' | 'STANDARD' | 'STRONG';

export type TrackType = 'TRACK_A' | 'TRACK_B';

export type AttestationType = 'VALIDATION' | 'FINAL_ATTESTATION';

export type AttestationStatus = 'PENDING' | 'RECORDED' | 'REJECTED' | 'SUPERSEDED';

export type Milestone = 
  | 'PACKET_ACCEPTED'
  | 'UNDERWRITING_FINALIZED'
  | 'ARTIFACTS_PREVALIDATED'
  | 'DUAL_ATTESTATION_RECORDED'
  | 'POST_SETTLEMENT_AUDIT';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentCategory = 
  | 'SLA_VIOLATION'
  | 'ATTESTATION_MISCONDUCT'
  | 'CONFLICT_OF_INTEREST'
  | 'PROCESS_VIOLATION'
  | 'INFORMATION_MISUSE'
  | 'SYSTEM_ABUSE'
  | 'DOCUMENTATION_ERROR'
  | 'OTHER';

export type IncidentStatus = 
  | 'REPORTED'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'PENDING_RESPONSE'
  | 'UNDER_REVIEW'
  | 'RESOLVED_NO_ACTION'
  | 'RESOLVED_WARNING'
  | 'RESOLVED_SUSPENSION'
  | 'RESOLVED_REVOCATION'
  | 'APPEALED'
  | 'APPEAL_DENIED'
  | 'APPEAL_GRANTED';

export type IncidentOutcomeDecision = 'NO_ACTION' | 'WARNING' | 'SUSPENSION' | 'REVOCATION';

export interface VerificationArtifacts {
  emailProofHash?: string;
  walletSignatureHash?: string;
  kycDocumentHash?: string;
  referenceCheckHash?: string;
  competencyTestHash?: string;
  bondingProofHash?: string;
}

export interface NodeOperator {
  operatorId: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  role: OperatorRole;
  status: OperatorStatus;
  suspended: boolean;
  suspensionReason?: string;
  verificationTier: VerificationTier;
  verificationArtifacts?: VerificationArtifacts;
  conflictDisclosure?: string;
  charterAcknowledgmentHash?: string;
  certificationHash?: string;
  settlementsCompleted: number;
  attestationsProvided: number;
  incidentCount: number;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  lastActivityAt?: string;
}

export interface OnboardingPhase {
  completedAt?: string;
  hash?: string;
  exercisesCompleted?: number;
  score?: number;
}

export interface DryRunExercise {
  exerciseId: string;
  type: 'REPORT' | 'VALIDATION' | 'ATTESTATION' | 'DUAL_ATTESTATION_SIM';
  packetId?: string;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  score?: number;
  feedback?: string;
  completedAt?: string;
}

export interface CertificationChecklist {
  verificationComplete: boolean;
  dryRunPassed: boolean;
  charterAcknowledged: boolean;
  emergencyContactProvided: boolean;
  slaCommitmentSigned: boolean;
}

export interface NodeOnboarding {
  onboardingId: string;
  operatorId: string;
  requestedRole: OperatorRole;
  currentPhase: OperatorStatus | 'EXPIRED' | 'REJECTED';
  requiredVerificationTier: VerificationTier;
  phases: {
    applied?: OnboardingPhase;
    verified?: OnboardingPhase;
    provisioned?: OnboardingPhase;
    dryRunPassed?: OnboardingPhase;
    certified?: OnboardingPhase;
    activated?: OnboardingPhase;
  };
  dryRunExercises: DryRunExercise[];
  certificationChecklist: CertificationChecklist;
  rejectionReason?: string;
  expiresAt: string;
  startedAt: string;
  completedAt?: string;
  lastUpdatedAt: string;
}

export interface ValidationFindings {
  artifactsComplete: boolean;
  formatsValid: boolean;
  underwritingVerified: boolean;
  noPlaceholders: boolean;
  notes?: string;
}

export interface NodeAttestation {
  attestationId: string;
  packetId: string;
  trackType: TrackType;
  operatorId: string;
  role: 'VALIDATOR' | 'ATTESTOR';
  attestationType: AttestationType;
  artifactBundleHashOrCid: string;
  underwritingHashOrCid: string;
  conflictCheckPassed: boolean;
  conflictDisclosure?: string;
  signatureStub?: string;
  validationFindings?: ValidationFindings;
  attestationNotes?: string;
  dualAttestationPair?: string;
  status: AttestationStatus;
  rejectionReason?: string;
  timestamp: string;
  recordedOnChain: boolean;
  onChainTxHash?: string;
}

export interface RewardEntry {
  entryId: string;
  packetId: string;
  milestone: Milestone;
  role: OperatorRole;
  usdAmount: number;
  sharePercent: number;
  baseMilestoneValue: number;
  timestamp: string;
  settled: boolean;
  deferredToConversion: boolean;
  slashed: boolean;
  slashReason?: string;
}

export interface PayoutRecord {
  payoutId: string;
  usdAmount: number;
  axiomAmount: number;
  rateUsed: number;
  timestamp: string;
  txHash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface NodeRewardsLedger {
  operatorId: string;
  usdAccrued: number;
  usdPaid: number;
  usdPending: number;
  conversionBucket: number;
  slashedAmount: number;
  clawedBackAmount: number;
  lastAccrualAt?: string;
  lastPayoutAt?: string;
  entries: RewardEntry[];
  payouts: PayoutRecord[];
}

export interface EvidenceItem {
  type: string;
  hash: string;
  description?: string;
}

export interface Investigation {
  investigatorId: string;
  startedAt: string;
  completedAt?: string;
  findings?: string;
  findingsHash?: string;
  recommendation?: IncidentOutcomeDecision;
}

export interface IncidentOutcome {
  decision: IncidentOutcomeDecision;
  decisionRationale?: string;
  slashPercent: number;
  slashAmount: number;
  suspensionDays: number;
  effectiveDate: string;
  decisionHash?: string;
}

export interface IncidentAppeal {
  filedAt: string;
  grounds: string;
  reviewedAt?: string;
  decision?: 'GRANTED' | 'DENIED' | 'PARTIAL';
  decisionRationale?: string;
}

export interface NodeIncident {
  incidentId: string;
  operatorId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: IncidentStatus;
  title?: string;
  description?: string;
  evidenceHashes: EvidenceItem[];
  relatedPacketIds: string[];
  relatedAttestationIds: string[];
  reportedBy: string;
  reportedAt: string;
  acknowledgedAt?: string;
  operatorResponse?: string;
  investigation?: Investigation;
  outcome?: IncidentOutcome;
  appeal?: IncidentAppeal;
  resolvedAt?: string;
  publicSummary?: string;
  internalNotes?: string;
}

export interface NodeConfig {
  postedAxiomUsdRate: number;
  rateEffectiveDate: string;
  rateSource: string;
  observationWindowEndDate: string;
  payoutThresholdUsd: number;
  monthlyOperatorCap: number;
  monthlyProgramCap: number;
}

export const MILESTONE_VALUES: Record<Milestone, number> = {
  PACKET_ACCEPTED: 10,
  UNDERWRITING_FINALIZED: 20,
  ARTIFACTS_PREVALIDATED: 20,
  DUAL_ATTESTATION_RECORDED: 25,
  POST_SETTLEMENT_AUDIT: 25,
};

export const ROLE_SHARES: Record<OperatorRole, Record<Milestone, number>> = {
  OBSERVER: {
    PACKET_ACCEPTED: 0.20,
    UNDERWRITING_FINALIZED: 0,
    ARTIFACTS_PREVALIDATED: 0,
    DUAL_ATTESTATION_RECORDED: 0,
    POST_SETTLEMENT_AUDIT: 0.20,
  },
  VALIDATOR: {
    PACKET_ACCEPTED: 0.60,
    UNDERWRITING_FINALIZED: 0.60,
    ARTIFACTS_PREVALIDATED: 0.60,
    DUAL_ATTESTATION_RECORDED: 0,
    POST_SETTLEMENT_AUDIT: 0.60,
  },
  ATTESTOR: {
    PACKET_ACCEPTED: 1.0,
    UNDERWRITING_FINALIZED: 1.0,
    ARTIFACTS_PREVALIDATED: 1.0,
    DUAL_ATTESTATION_RECORDED: 1.0,
    POST_SETTLEMENT_AUDIT: 1.0,
  },
};

export const SLASHING_SCHEDULE: Record<IncidentSeverity, { slashPercent: number; suspensionDays: number }> = {
  LOW: { slashPercent: 0, suspensionDays: 0 },
  MEDIUM: { slashPercent: 25, suspensionDays: 30 },
  HIGH: { slashPercent: 50, suspensionDays: 90 },
  CRITICAL: { slashPercent: 100, suspensionDays: -1 }, // -1 = permanent revocation
};

export const VERIFICATION_TIER_FOR_ROLE: Record<OperatorRole, VerificationTier> = {
  OBSERVER: 'LIGHT',
  VALIDATOR: 'STANDARD',
  ATTESTOR: 'STRONG',
};

export const STATUS_ORDER: OperatorStatus[] = [
  'APPLIED',
  'VERIFIED',
  'PROVISIONED',
  'DRY_RUN_PASSED',
  'CERTIFIED',
  'ACTIVE',
];
