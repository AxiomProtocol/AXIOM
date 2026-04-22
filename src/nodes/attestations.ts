import { createHash, randomBytes } from 'crypto';
import {
  NodeAttestation,
  NodeOperator,
  TrackType,
  AttestationType,
  ValidationFindings,
} from './types';
import { isOperatorActive, canOperatorAttest, canOperatorValidate, computeHash } from './registry';

export function generateAttestationId(): string {
  return `ATT-${randomBytes(6).toString('hex')}`;
}

export interface PropertyPacket {
  packetId: string;
  trackType: string;
  status: string;
  underwriting?: {
    hash?: string;
  };
  artifactIndex: Record<string, { cid?: string; sha256?: string }>;
}

export function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.toUpperCase();
  return v.includes('PLACEHOLDER') || v === '' || v === 'TBD' || v === 'TODO';
}

export function validateArtifactReadiness(packet: PropertyPacket): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!packet.artifactIndex || Object.keys(packet.artifactIndex).length === 0) {
    issues.push('No artifacts in artifact index');
    return { ready: false, issues };
  }

  for (const [key, artifact] of Object.entries(packet.artifactIndex)) {
    if (!artifact.cid && !artifact.sha256) {
      issues.push(`Artifact ${key}: missing both CID and SHA256`);
    } else if (artifact.cid && isPlaceholderValue(artifact.cid)) {
      issues.push(`Artifact ${key}: CID is placeholder value`);
    } else if (artifact.sha256 && isPlaceholderValue(artifact.sha256)) {
      issues.push(`Artifact ${key}: SHA256 is placeholder value`);
    }
  }

  if (!packet.underwriting?.hash || isPlaceholderValue(packet.underwriting.hash)) {
    issues.push('Underwriting hash is missing or placeholder');
  }

  return { ready: issues.length === 0, issues };
}

export function computeArtifactBundleHash(packet: PropertyPacket): string {
  const sortedArtifacts = Object.entries(packet.artifactIndex)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({ key, ...val }));
  return computeHash(JSON.stringify(sortedArtifacts));
}

export interface CreateAttestationParams {
  packet: PropertyPacket;
  operator: NodeOperator;
  attestationType: AttestationType;
  conflictCheckPassed: boolean;
  conflictDisclosure?: string;
  validationFindings?: ValidationFindings;
  attestationNotes?: string;
}

export function createAttestation(params: CreateAttestationParams): NodeAttestation {
  const { packet, operator, attestationType, conflictCheckPassed, conflictDisclosure, validationFindings, attestationNotes } = params;

  if (!isOperatorActive(operator)) {
    throw new Error(`Operator ${operator.operatorId} is not ACTIVE or is suspended`);
  }

  if (attestationType === 'FINAL_ATTESTATION' && !canOperatorAttest(operator)) {
    throw new Error(`Operator ${operator.operatorId} does not have ATTESTOR role for final attestation`);
  }

  if (attestationType === 'VALIDATION' && !canOperatorValidate(operator)) {
    throw new Error(`Operator ${operator.operatorId} does not have VALIDATOR or ATTESTOR role`);
  }

  if (!conflictCheckPassed) {
    throw new Error('Cannot create attestation: conflict check failed');
  }

  const artifactReadiness = validateArtifactReadiness(packet);
  if (!artifactReadiness.ready) {
    throw new Error(
      `Cannot attest: artifacts not ready.\n${artifactReadiness.issues.join('\n')}`
    );
  }

  const now = new Date().toISOString();
  const artifactBundleHash = computeArtifactBundleHash(packet);
  
  const signatureData = {
    packetId: packet.packetId,
    operatorId: operator.operatorId,
    artifactBundleHash,
    underwritingHash: packet.underwriting?.hash,
    timestamp: now,
  };
  const signatureStub = `sig:${computeHash(JSON.stringify(signatureData))}`;

  const trackType: TrackType = packet.trackType === 'TRACK_A' || packet.packetId.includes('-A-') 
    ? 'TRACK_A' 
    : 'TRACK_B';

  const attestation: NodeAttestation = {
    attestationId: generateAttestationId(),
    packetId: packet.packetId,
    trackType,
    operatorId: operator.operatorId,
    role: attestationType === 'FINAL_ATTESTATION' ? 'ATTESTOR' : 'VALIDATOR',
    attestationType,
    artifactBundleHashOrCid: artifactBundleHash,
    underwritingHashOrCid: packet.underwriting?.hash || '',
    conflictCheckPassed,
    conflictDisclosure,
    signatureStub,
    validationFindings,
    attestationNotes,
    status: 'RECORDED',
    timestamp: now,
    recordedOnChain: false,
  };

  return attestation;
}

export function pairDualAttestation(
  attestation1: NodeAttestation,
  attestation2: NodeAttestation
): { attestation1: NodeAttestation; attestation2: NodeAttestation } {
  if (attestation1.operatorId === attestation2.operatorId) {
    throw new Error('Dual attestation requires two different operators');
  }

  if (attestation1.packetId !== attestation2.packetId) {
    throw new Error('Dual attestation must be for the same packet');
  }

  if (attestation1.attestationType !== 'FINAL_ATTESTATION' || 
      attestation2.attestationType !== 'FINAL_ATTESTATION') {
    throw new Error('Both attestations must be FINAL_ATTESTATION type');
  }

  return {
    attestation1: { ...attestation1, dualAttestationPair: attestation2.attestationId },
    attestation2: { ...attestation2, dualAttestationPair: attestation1.attestationId },
  };
}

export function validateDualAttestation(
  attestations: NodeAttestation[],
  packetId: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  const packetAttestations = attestations.filter(
    a => a.packetId === packetId && 
         a.attestationType === 'FINAL_ATTESTATION' &&
         a.status === 'RECORDED'
  );

  if (packetAttestations.length < 2) {
    issues.push(`Only ${packetAttestations.length} attestation(s) recorded, need 2`);
    return { valid: false, issues };
  }

  const operatorIds = new Set(packetAttestations.map(a => a.operatorId));
  if (operatorIds.size < 2) {
    issues.push('Attestations must be from different operators');
    return { valid: false, issues };
  }

  const hasPairing = packetAttestations.some(a => a.dualAttestationPair);
  if (!hasPairing) {
    issues.push('Attestations not linked as dual pair');
    return { valid: false, issues };
  }

  return { valid: issues.length === 0, issues };
}

export function rejectAttestation(
  attestation: NodeAttestation,
  reason: string
): NodeAttestation {
  return {
    ...attestation,
    status: 'REJECTED',
    rejectionReason: reason,
  };
}

export function markRecordedOnChain(
  attestation: NodeAttestation,
  txHash: string
): NodeAttestation {
  return {
    ...attestation,
    recordedOnChain: true,
    onChainTxHash: txHash,
  };
}

export function getAttestationsForPacket(
  attestations: NodeAttestation[],
  packetId: string
): NodeAttestation[] {
  return attestations.filter(a => a.packetId === packetId);
}

export function getAttestationsByOperator(
  attestations: NodeAttestation[],
  operatorId: string
): NodeAttestation[] {
  return attestations.filter(a => a.operatorId === operatorId);
}
