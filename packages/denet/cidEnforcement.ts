/**
 * CID Enforcement Service - Ensures DeNet CIDs are used for approvals
 * 
 * This service enforces that critical workflows (property research,
 * underwriting, capital bridge) use DeNet CIDs for document storage.
 * Fallback storage is allowed but approvals require DeNet verification.
 */

import { getDeNetVerifier, DeNetVerifier } from './denetVerifier';
import { getDeNetUploader, DeNetUploader } from './denetUploader';
import { isValidCid, DENET_CONSTANTS } from './denetTypes';

export interface CidRequirement {
  documentType: string;
  required: boolean;
  minReplication: number;
  verificationRequired: boolean;
}

export interface CidValidationResult {
  valid: boolean;
  cid: string;
  exists: boolean;
  verified: boolean;
  replicationHealthy: boolean;
  errors: string[];
  warnings: string[];
}

export interface PacketCidRequirements {
  propertyDataCid: CidRequirement;
  dueDiligenceCid: CidRequirement;
  attestationACid: CidRequirement;
  attestationBCid: CidRequirement;
}

export const DEFAULT_CID_REQUIREMENTS: PacketCidRequirements = {
  propertyDataCid: {
    documentType: 'property_research',
    required: true,
    minReplication: DENET_CONSTANTS.MIN_REPLICATION,
    verificationRequired: true,
  },
  dueDiligenceCid: {
    documentType: 'due_diligence',
    required: true,
    minReplication: DENET_CONSTANTS.MIN_REPLICATION,
    verificationRequired: true,
  },
  attestationACid: {
    documentType: 'attestation',
    required: true,
    minReplication: DENET_CONSTANTS.MIN_REPLICATION,
    verificationRequired: true,
  },
  attestationBCid: {
    documentType: 'attestation',
    required: true,
    minReplication: DENET_CONSTANTS.MIN_REPLICATION,
    verificationRequired: true,
  },
};

export class CidEnforcementService {
  private verifier: DeNetVerifier;
  private uploader: DeNetUploader;
  private enforcementEnabled: boolean;

  constructor() {
    this.verifier = getDeNetVerifier();
    this.uploader = getDeNetUploader();
    this.enforcementEnabled = process.env.DENET_ENFORCEMENT_ENABLED !== 'false';
  }

  public isEnforcementEnabled(): boolean {
    return this.enforcementEnabled && this.verifier.isAvailable();
  }

  public async validateCid(cid: string): Promise<CidValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!cid || cid.trim() === '') {
      return {
        valid: false,
        cid: '',
        exists: false,
        verified: false,
        replicationHealthy: false,
        errors: ['CID is required'],
        warnings: [],
      };
    }

    if (!isValidCid(cid)) {
      return {
        valid: false,
        cid,
        exists: false,
        verified: false,
        replicationHealthy: false,
        errors: ['Invalid CID format'],
        warnings: [],
      };
    }

    if (!this.isEnforcementEnabled()) {
      warnings.push('DeNet enforcement is disabled - CID not verified');
      return {
        valid: true,
        cid,
        exists: true,
        verified: false,
        replicationHealthy: true,
        errors: [],
        warnings,
      };
    }

    const verification = await this.verifier.verify(cid);

    if (!verification.exists) {
      errors.push('Document not found in DeNet storage');
    }

    if (!verification.verified) {
      errors.push('Document verification failed');
    }

    const replicationHealthy = verification.replicationCount >= DENET_CONSTANTS.MIN_REPLICATION;
    if (!replicationHealthy) {
      warnings.push(`Low replication: ${verification.replicationCount}/${DENET_CONSTANTS.MIN_REPLICATION}`);
    }

    return {
      valid: errors.length === 0,
      cid,
      exists: verification.exists,
      verified: verification.verified,
      replicationHealthy,
      errors,
      warnings,
    };
  }

  public async validateCapitalBridgePacket(packet: {
    propertyDataCid: string;
    dueDiligenceCid: string;
    attestationACid: string;
    attestationBCid: string;
  }): Promise<{
    valid: boolean;
    results: Record<string, CidValidationResult>;
    errors: string[];
    warnings: string[];
    canProceed: boolean;
  }> {
    const [propertyData, dueDiligence, attestationA, attestationB] = await Promise.all([
      this.validateCid(packet.propertyDataCid),
      this.validateCid(packet.dueDiligenceCid),
      this.validateCid(packet.attestationACid),
      this.validateCid(packet.attestationBCid),
    ]);

    const results = {
      propertyDataCid: propertyData,
      dueDiligenceCid: dueDiligence,
      attestationACid: attestationA,
      attestationBCid: attestationB,
    };

    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    Object.entries(results).forEach(([key, result]) => {
      result.errors.forEach(err => allErrors.push(`${key}: ${err}`));
      result.warnings.forEach(warn => allWarnings.push(`${key}: ${warn}`));
    });

    const allValid = Object.values(results).every(r => r.valid);

    return {
      valid: allValid,
      results,
      errors: allErrors,
      warnings: allWarnings,
      canProceed: allValid || !this.isEnforcementEnabled(),
    };
  }

  public async validatePropertyResearch(
    researchCid: string,
    expectedContentHash?: string
  ): Promise<CidValidationResult> {
    const result = await this.validateCid(researchCid);

    if (expectedContentHash && result.exists) {
      const hashMatch = await this.verifier.verifyContentHash(researchCid, expectedContentHash);
      if (!hashMatch) {
        result.valid = false;
        result.errors.push('Content hash mismatch');
      }
    }

    return result;
  }

  public async validateUnderwriting(
    underwritingCid: string,
    loanId: string
  ): Promise<CidValidationResult> {
    const result = await this.validateCid(underwritingCid);

    if (!result.valid) {
      result.errors.push(`Underwriting document for loan ${loanId} is not properly stored in DeNet`);
    }

    return result;
  }

  public generateEnforcementReport(
    validationResults: Record<string, CidValidationResult>
  ): {
    summary: string;
    passed: boolean;
    details: Array<{ document: string; status: string; issues: string[] }>;
  } {
    const details = Object.entries(validationResults).map(([doc, result]) => ({
      document: doc,
      status: result.valid ? 'PASS' : 'FAIL',
      issues: [...result.errors, ...result.warnings],
    }));

    const passed = details.every(d => d.status === 'PASS');
    const failCount = details.filter(d => d.status === 'FAIL').length;

    return {
      summary: passed
        ? 'All documents verified in DeNet storage'
        : `${failCount} document(s) failed DeNet verification`,
      passed,
      details,
    };
  }
}

let enforcementInstance: CidEnforcementService | null = null;

export function getCidEnforcementService(): CidEnforcementService {
  if (!enforcementInstance) {
    enforcementInstance = new CidEnforcementService();
  }
  return enforcementInstance;
}

export default CidEnforcementService;
