#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { completeVerification } from '../../src/nodes/onboarding';
import { computeHash } from '../../src/nodes/registry';
import { NodeOperator, NodeOnboarding, VerificationArtifacts } from '../../src/nodes/types';

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

function generateMockArtifacts(tier: string): VerificationArtifacts {
  const base: VerificationArtifacts = {
    emailProofHash: computeHash(`email-proof-${Date.now()}`),
    walletSignatureHash: computeHash(`wallet-sig-${Date.now()}`),
  };

  if (tier === 'STANDARD' || tier === 'STRONG') {
    base.kycDocumentHash = computeHash(`kyc-doc-${Date.now()}`);
    base.referenceCheckHash = computeHash(`ref-check-${Date.now()}`);
  }

  if (tier === 'STRONG') {
    base.competencyTestHash = computeHash(`competency-${Date.now()}`);
    base.bondingProofHash = computeHash(`bonding-${Date.now()}`);
  }

  return base;
}

function main() {
  console.log('============================================================');
  console.log('NODE OPERATOR VERIFICATION');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

  let verifiedCount = 0;

  for (let i = 0; i < onboardings.length; i++) {
    const onboarding = onboardings[i];
    
    if (onboarding.currentPhase !== 'APPLIED') {
      continue;
    }

    const operatorIndex = operators.findIndex(o => o.operatorId === onboarding.operatorId);
    if (operatorIndex === -1) {
      console.log(`Operator ${onboarding.operatorId} not found, skipping`);
      continue;
    }

    const operator = operators[operatorIndex];
    const artifacts = generateMockArtifacts(operator.verificationTier);

    try {
      const result = completeVerification(operator, onboarding, artifacts);
      operators[operatorIndex] = result.operator;
      onboardings[i] = result.onboarding;
      verifiedCount++;

      console.log(`--- Verification Complete ---`);
      console.log(`  Operator: ${operator.displayName || operator.operatorId}`);
      console.log(`  Tier: ${operator.verificationTier}`);
      console.log(`  New Status: ${result.operator.status}`);
      console.log(`  Artifacts recorded: ${Object.keys(artifacts).length}`);
      console.log('');
    } catch (e: any) {
      console.log(`Error verifying ${operator.operatorId}: ${e.message}`);
    }
  }

  if (verifiedCount === 0) {
    console.log('No operators in APPLIED status to verify.');
    console.log('Run `npm run nodes:apply` first to create applications.\n');
  } else {
    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    console.log('============================================================');
    console.log(`VERIFICATION COMPLETE: ${verifiedCount} operator(s) verified`);
    console.log('============================================================\n');
    console.log('Next step: npm run nodes:provision');
  }
}

main();
