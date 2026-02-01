#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { completeProvisioning } from '../../src/nodes/onboarding';
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
  console.log('NODE OPERATOR PROVISIONING');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

  let provisionedCount = 0;

  for (let i = 0; i < onboardings.length; i++) {
    const onboarding = onboardings[i];
    
    if (onboarding.currentPhase !== 'VERIFIED') {
      continue;
    }

    const operatorIndex = operators.findIndex(o => o.operatorId === onboarding.operatorId);
    if (operatorIndex === -1) {
      console.log(`Operator ${onboarding.operatorId} not found, skipping`);
      continue;
    }

    const operator = operators[operatorIndex];

    try {
      const result = completeProvisioning(operator, onboarding);
      operators[operatorIndex] = result.operator;
      onboardings[i] = result.onboarding;
      provisionedCount++;

      console.log(`--- Provisioning Complete ---`);
      console.log(`  Operator: ${operator.displayName || operator.operatorId}`);
      console.log(`  Role: ${operator.role}`);
      console.log(`  New Status: ${result.operator.status}`);
      console.log(`  Wallet: ${operator.walletAddress}`);
      console.log('');
    } catch (e: any) {
      console.log(`Error provisioning ${operator.operatorId}: ${e.message}`);
    }
  }

  if (provisionedCount === 0) {
    console.log('No operators in VERIFIED status to provision.');
    console.log('Run `npm run nodes:verify` first.\n');
  } else {
    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    console.log('============================================================');
    console.log(`PROVISIONING COMPLETE: ${provisionedCount} operator(s) provisioned`);
    console.log('============================================================\n');
    console.log('Next step: npm run nodes:dryrun');
  }
}

main();
