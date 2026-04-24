#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { completeCertification } from '../../src/nodes/onboarding';
import { NodeOperator, NodeOnboarding } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ONBOARDING_FILE = path.join(DATA_DIR, 'onboarding.json');

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

function main() {
  console.log('============================================================');
  console.log('NODE OPERATOR CERTIFICATION');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

  let certifiedCount = 0;

  for (let i = 0; i < onboardings.length; i++) {
    const onboarding = onboardings[i];
    
    if (onboarding.currentPhase !== 'DRY_RUN_PASSED') {
      continue;
    }

    const operatorIndex = operators.findIndex(o => o.operatorId === onboarding.operatorId);
    if (operatorIndex === -1) {
      console.log(`Operator ${onboarding.operatorId} not found, skipping`);
      continue;
    }

    const operator = operators[operatorIndex];

    console.log(`--- Certifying ${operator.displayName || operator.operatorId} ---`);

    try {
      const result = completeCertification(operator, onboarding, {
        charterAcknowledged: true,
        emergencyContactProvided: true,
        slaCommitmentSigned: true,
      });

      operators[operatorIndex] = result.operator;
      onboardings[i] = result.onboarding;
      certifiedCount++;

      console.log(`  Role: ${operator.role}`);
      console.log(`  New Status: ${result.operator.status}`);
      console.log(`  Certification Hash: ${result.operator.certificationHash?.substring(0, 30)}...`);
      console.log(`  Checklist:`);
      const checklist = result.onboarding.certificationChecklist;
      console.log(`    - Verification Complete: ${checklist.verificationComplete ? '✓' : '✗'}`);
      console.log(`    - Dry-Run Passed: ${checklist.dryRunPassed ? '✓' : '✗'}`);
      console.log(`    - Charter Acknowledged: ${checklist.charterAcknowledged ? '✓' : '✗'}`);
      console.log(`    - Emergency Contact: ${checklist.emergencyContactProvided ? '✓' : '✗'}`);
      console.log(`    - SLA Commitment: ${checklist.slaCommitmentSigned ? '✓' : '✗'}`);
      console.log('');
    } catch (e: any) {
      console.log(`  Error: ${e.message}\n`);
    }
  }

  if (certifiedCount === 0) {
    console.log('No operators in DRY_RUN_PASSED status to certify.');
    console.log('Run `npm run nodes:dryrun` first.\n');
  } else {
    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    console.log('============================================================');
    console.log(`CERTIFICATION COMPLETE: ${certifiedCount} operator(s) certified`);
    console.log('============================================================\n');
    console.log('Next step: npm run nodes:activate');
  }
}

main();
