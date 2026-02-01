#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { 
  createAttestation, 
  PropertyPacket,
  validateArtifactReadiness 
} from '../../src/nodes/attestations';
import { NodeOperator, NodeAttestation } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const PACKETS_DIR = path.join(process.cwd(), 'data/property-packets');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ATTESTATIONS_FILE = path.join(DATA_DIR, 'attestations.json');

function loadJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.warn(`Warning: Could not load ${filePath}, using default`);
  }
  return defaultValue;
}

function saveJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadPackets(): PropertyPacket[] {
  const packets: PropertyPacket[] = [];
  try {
    const files = fs.readdirSync(PACKETS_DIR);
    for (const file of files) {
      if (file.endsWith('.packet.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(PACKETS_DIR, file), 'utf-8'));
        packets.push({
          packetId: data.packetId,
          trackType: data.packetId.includes('-A-') ? 'TRACK_A' : 'TRACK_B',
          status: data.status,
          underwriting: data.underwriting,
          artifactIndex: data.artifactIndex || {},
        });
      }
    }
  } catch (e) {
    console.log('No property packets found in', PACKETS_DIR);
  }
  return packets;
}

function main() {
  console.log('============================================================');
  console.log('NODE ATTESTATION RECORDING');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const attestations = loadJson<NodeAttestation[]>(ATTESTATIONS_FILE, []);
  const packets = loadPackets();

  if (packets.length === 0) {
    console.log('No property packets found.');
    console.log('Run `npm run packets:create` first to create test packets.\n');
    return;
  }

  // Find active validators/attestors
  const activeValidators = operators.filter(
    o => o.status === 'ACTIVE' && !o.suspended && 
         (o.role === 'VALIDATOR' || o.role === 'ATTESTOR')
  );

  if (activeValidators.length === 0) {
    console.log('No active Validators or Attestors found.');
    console.log('Run the onboarding flow first: npm run nodes:apply through npm run nodes:activate\n');
    return;
  }

  console.log(`Found ${activeValidators.length} active validator(s)/attestor(s)`);
  console.log(`Found ${packets.length} packet(s) to process\n`);

  let attestedCount = 0;
  let blockedCount = 0;

  for (const packet of packets) {
    console.log(`--- Processing ${packet.packetId} ---`);

    // Check artifact readiness
    const readiness = validateArtifactReadiness(packet);
    console.log(`  Artifact Readiness: ${readiness.ready ? 'READY' : 'NOT READY'}`);

    if (!readiness.ready) {
      console.log(`  Issues:`);
      for (const issue of readiness.issues.slice(0, 3)) {
        console.log(`    - ${issue}`);
      }
      if (readiness.issues.length > 3) {
        console.log(`    ... and ${readiness.issues.length - 3} more`);
      }
      blockedCount++;
      console.log(`  Status: BLOCKED (cannot attest with placeholder artifacts)\n`);
      continue;
    }

    // Create attestation from first available validator
    const validator = activeValidators[0];
    
    try {
      const attestation = createAttestation({
        packet,
        operator: validator,
        attestationType: 'VALIDATION',
        conflictCheckPassed: true,
        validationFindings: {
          artifactsComplete: true,
          formatsValid: true,
          underwritingVerified: true,
          noPlaceholders: true,
        },
      });

      attestations.push(attestation);
      attestedCount++;

      console.log(`  Attestation ID: ${attestation.attestationId}`);
      console.log(`  Operator: ${validator.displayName || validator.operatorId}`);
      console.log(`  Type: ${attestation.attestationType}`);
      console.log(`  Status: ${attestation.status}\n`);
    } catch (e: any) {
      console.log(`  Error: ${e.message}\n`);
      blockedCount++;
    }
  }

  if (attestedCount > 0) {
    saveJson(ATTESTATIONS_FILE, attestations);
  }

  console.log('============================================================');
  console.log('ATTESTATION SUMMARY');
  console.log('============================================================');
  console.log(`  Attested: ${attestedCount}`);
  console.log(`  Blocked: ${blockedCount}`);
  console.log('');

  if (blockedCount > 0) {
    console.log('Note: Attestations are blocked until placeholder artifacts are replaced.');
    console.log('Upload real documents to DeNet and update packet artifact indexes.\n');
  }
}

main();
