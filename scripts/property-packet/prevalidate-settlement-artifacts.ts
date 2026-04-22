#!/usr/bin/env npx ts-node
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'property-packets');
const REPORTS_DIR = path.join(process.cwd(), 'docs', 'ops', 'reports');

const REQUIRED_ARTIFACTS_TRACK_A = [
  'paymentHistoryProof',
  'servicerStatement',
  'lienPositionVerification',
  'participationAgreement',
  'cashflowSchedule'
];

const REQUIRED_ARTIFACTS_TRACK_B = [
  'delinquencyStatusSummary',
  'borrowerContactLog',
  'workoutOptionsMatrix',
  'timelineAssumptions',
  'downsideDisclosure',
  'servicingEventLogTemplate',
  'participationAgreement'
];

interface ArtifactValidation {
  key: string;
  status: 'VALID' | 'PLACEHOLDER' | 'MISSING' | 'INVALID_FORMAT';
  hasCid: boolean;
  hasHash: boolean;
  cidFormat: boolean;
  hashFormat: boolean;
  filename: string | null;
  message: string;
}

interface PacketValidation {
  packetId: string;
  trackType: string;
  isComplete: boolean;
  totalRequired: number;
  validCount: number;
  placeholderCount: number;
  missingCount: number;
  artifacts: ArtifactValidation[];
}

function validateCidFormat(cid: string): boolean {
  if (!cid) return false;
  if (cid.startsWith('PLACEHOLDER')) return false;
  return cid.startsWith('bafy') && cid.length > 10;
}

function validateHashFormat(hash: string): boolean {
  if (!hash) return false;
  if (hash.startsWith('PLACEHOLDER')) return false;
  return /^[a-f0-9]{64}$/i.test(hash);
}

function validateArtifact(key: string, artifact: Record<string, unknown> | undefined): ArtifactValidation {
  if (!artifact) {
    return {
      key,
      status: 'MISSING',
      hasCid: false,
      hasHash: false,
      cidFormat: false,
      hashFormat: false,
      filename: null,
      message: 'Artifact not found in index'
    };
  }
  
  const cid = artifact.cid as string;
  const sha256 = artifact.sha256 as string;
  const filename = artifact.filename as string;
  
  const hasCid = !!cid;
  const hasHash = !!sha256;
  const cidFormat = validateCidFormat(cid);
  const hashFormat = validateHashFormat(sha256);
  
  const isPlaceholder = 
    (cid && cid.startsWith('PLACEHOLDER')) || 
    (sha256 && sha256.startsWith('PLACEHOLDER'));
  
  if (isPlaceholder) {
    return {
      key,
      status: 'PLACEHOLDER',
      hasCid,
      hasHash,
      cidFormat: false,
      hashFormat: false,
      filename,
      message: 'Artifact has placeholder values - replace with real CID/hash'
    };
  }
  
  if (!cidFormat && !hashFormat) {
    return {
      key,
      status: 'INVALID_FORMAT',
      hasCid,
      hasHash,
      cidFormat,
      hashFormat,
      filename,
      message: 'Neither CID nor hash has valid format'
    };
  }
  
  return {
    key,
    status: 'VALID',
    hasCid,
    hasHash,
    cidFormat,
    hashFormat,
    filename,
    message: 'Artifact validated successfully'
  };
}

function validatePacket(packetPath: string, requiredArtifacts: string[]): PacketValidation {
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf-8'));
  const artifactIndex = packet.artifactIndex || {};
  
  const artifacts: ArtifactValidation[] = requiredArtifacts.map(key => 
    validateArtifact(key, artifactIndex[key])
  );
  
  const validCount = artifacts.filter(a => a.status === 'VALID').length;
  const placeholderCount = artifacts.filter(a => a.status === 'PLACEHOLDER').length;
  const missingCount = artifacts.filter(a => a.status === 'MISSING' || a.status === 'INVALID_FORMAT').length;
  
  return {
    packetId: packet.packetId,
    trackType: packet.trackType,
    isComplete: validCount === requiredArtifacts.length,
    totalRequired: requiredArtifacts.length,
    validCount,
    placeholderCount,
    missingCount,
    artifacts
  };
}

function generateReadinessReport(validations: PacketValidation[]): string {
  const now = new Date().toISOString();
  const allComplete = validations.every(v => v.isComplete);
  
  let report = `# Settlement Artifact Readiness Report

**Generated:** ${now}
**Status:** ${allComplete ? 'READY FOR SETTLEMENT' : 'NOT READY - ARTIFACTS MISSING'}

---

## Summary

| Packet | Track | Status | Valid | Placeholder | Missing | Total |
|--------|-------|--------|-------|-------------|---------|-------|
`;

  for (const v of validations) {
    const status = v.isComplete ? 'READY' : 'NOT READY';
    report += `| ${v.packetId} | ${v.trackType} | ${status} | ${v.validCount} | ${v.placeholderCount} | ${v.missingCount} | ${v.totalRequired} |\n`;
  }

  report += `
---

## Detailed Validation Results

`;

  for (const v of validations) {
    report += `### ${v.packetId} (${v.trackType})

**Status:** ${v.isComplete ? 'READY' : 'NOT READY'}

| Artifact | Status | CID | Hash | Filename |
|----------|--------|-----|------|----------|
`;

    for (const a of v.artifacts) {
      const cidIcon = a.cidFormat ? '✓' : (a.hasCid ? '⚠' : '✗');
      const hashIcon = a.hashFormat ? '✓' : (a.hasHash ? '⚠' : '✗');
      const statusIcon = a.status === 'VALID' ? '✓' : (a.status === 'PLACEHOLDER' ? '⚠' : '✗');
      report += `| ${a.key} | ${statusIcon} ${a.status} | ${cidIcon} | ${hashIcon} | ${a.filename || 'N/A'} |\n`;
    }

    const issues = v.artifacts.filter(a => a.status !== 'VALID');
    if (issues.length > 0) {
      report += `
**Issues to Resolve:**
`;
      for (const issue of issues) {
        report += `- \`${issue.key}\`: ${issue.message}\n`;
      }
    }

    report += '\n';
  }

  report += `---

## Next Steps

`;

  if (allComplete) {
    report += `All artifacts validated successfully. Packets are ready for:

1. **Dual Attestation:** Obtain signatures from ATTESTOR_A and ATTESTOR_B
2. **24-Hour Timelock:** Initiate settlement authorization timelock
3. **On-Chain Submission:** Submit packet hash to CapitalBridgeHub

\`\`\`bash
# Example settlement initiation (requires configured roles)
npx ts-node scripts/capital-bridge/submit-settlement.ts --packet PKT-A-2026-XXX
\`\`\`
`;
  } else {
    report += `Artifacts are incomplete. Required actions:

1. **Replace Placeholders:** Update artifact index with real CID/hash values
2. **Upload Documents:** Upload required documents to DeNet storage
3. **Re-validate:** Run \`npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts\`

**Placeholder artifacts must be replaced with:**
- Valid CID format: \`bafybeig...\` (IPFS/DeNet content identifier)
- Valid SHA256 hash: 64 hexadecimal characters

\`\`\`bash
# Example DeNet upload
npx ts-node scripts/denet/upload-artifact.ts --file ./path/to/document.pdf --type servicerStatement
\`\`\`
`;
  }

  report += `
---

## CID Format Requirements

- **Valid CID:** Must start with \`bafy\` followed by alphanumeric characters
- **Valid SHA256:** Must be exactly 64 hexadecimal characters (a-f, 0-9)
- **Placeholder detection:** Values starting with \`PLACEHOLDER\` are flagged

## Artifact Storage

All artifacts should be stored via DeNet with CID enforcement enabled. See:
- [DeNet SOP](../denet-sop.md)
- [DeNet Enforcement Proof](../../storage/denet-enforcement-proof.md)

---

*Report generated by prevalidate-settlement-artifacts.ts*
`;

  return report;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SETTLEMENT ARTIFACT PRE-VALIDATION');
  console.log('='.repeat(60));
  console.log();
  
  const trackAPath = path.join(DATA_DIR, 'track-a-performing.packet.json');
  const trackBPath = path.join(DATA_DIR, 'track-b-light-npl.packet.json');
  
  if (!fs.existsSync(trackAPath) || !fs.existsSync(trackBPath)) {
    console.error('Packet files not found. Run the full packet creation flow first.');
    process.exit(1);
  }
  
  console.log('--- Validating Track A Artifacts ---');
  const trackAValidation = validatePacket(trackAPath, REQUIRED_ARTIFACTS_TRACK_A);
  console.log(`Packet: ${trackAValidation.packetId}`);
  console.log(`Status: ${trackAValidation.isComplete ? 'READY' : 'NOT READY'}`);
  console.log(`Valid: ${trackAValidation.validCount}/${trackAValidation.totalRequired}`);
  console.log(`Placeholders: ${trackAValidation.placeholderCount}`);
  console.log();
  
  console.log('--- Validating Track B Artifacts ---');
  const trackBValidation = validatePacket(trackBPath, REQUIRED_ARTIFACTS_TRACK_B);
  console.log(`Packet: ${trackBValidation.packetId}`);
  console.log(`Status: ${trackBValidation.isComplete ? 'READY' : 'NOT READY'}`);
  console.log(`Valid: ${trackBValidation.validCount}/${trackBValidation.totalRequired}`);
  console.log(`Placeholders: ${trackBValidation.placeholderCount}`);
  console.log();
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const report = generateReadinessReport([trackAValidation, trackBValidation]);
  const reportPath = path.join(REPORTS_DIR, 'settlement-artifact-readiness.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Report written: ${reportPath}`);
  console.log();
  
  const trackAPacket = JSON.parse(fs.readFileSync(trackAPath, 'utf-8'));
  trackAPacket.status = trackAValidation.isComplete ? 'READY' : 'ARTIFACTS_PENDING';
  fs.writeFileSync(trackAPath, JSON.stringify(trackAPacket, null, 2));
  
  const trackBPacket = JSON.parse(fs.readFileSync(trackBPath, 'utf-8'));
  trackBPacket.status = trackBValidation.isComplete ? 'READY' : 'ARTIFACTS_PENDING';
  fs.writeFileSync(trackBPath, JSON.stringify(trackBPacket, null, 2));
  
  console.log('='.repeat(60));
  const allReady = trackAValidation.isComplete && trackBValidation.isComplete;
  console.log(allReady ? 'ALL ARTIFACTS VALIDATED - READY FOR SETTLEMENT' : 'ARTIFACTS INCOMPLETE - SEE REPORT');
  console.log('='.repeat(60));
  
  if (!allReady) {
    console.log();
    console.log('To complete artifacts:');
    console.log('  1. Replace PLACEHOLDER values with real CID/hash references');
    console.log('  2. Upload documents to DeNet storage');
    console.log('  3. Re-run this validation script');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
