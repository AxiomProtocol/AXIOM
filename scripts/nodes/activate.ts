#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { activateOperator } from '../../src/nodes/onboarding';
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
  console.log('NODE OPERATOR ACTIVATION');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

  let activatedCount = 0;

  for (let i = 0; i < onboardings.length; i++) {
    const onboarding = onboardings[i];
    
    if (onboarding.currentPhase !== 'CERTIFIED') {
      continue;
    }

    const operatorIndex = operators.findIndex(o => o.operatorId === onboarding.operatorId);
    if (operatorIndex === -1) {
      console.log(`Operator ${onboarding.operatorId} not found, skipping`);
      continue;
    }

    const operator = operators[operatorIndex];

    console.log(`--- Activating ${operator.displayName || operator.operatorId} ---`);

    try {
      const result = activateOperator(operator, onboarding);
      operators[operatorIndex] = result.operator;
      onboardings[i] = result.onboarding;
      activatedCount++;

      console.log(`  Role: ${operator.role}`);
      console.log(`  New Status: ${result.operator.status}`);
      console.log(`  Activated At: ${result.operator.activatedAt}`);
      console.log(`  Onboarding Complete: ${result.onboarding.completedAt}`);
      console.log('');
    } catch (e: any) {
      console.log(`  Error: ${e.message}\n`);
    }
  }

  if (activatedCount === 0) {
    console.log('No operators in CERTIFIED status to activate.');
    console.log('Run `npm run nodes:certify` first.\n');
  } else {
    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    console.log('============================================================');
    console.log(`ACTIVATION COMPLETE: ${activatedCount} operator(s) now ACTIVE`);
    console.log('============================================================\n');
    console.log('Operators are now ready to participate in settlements.');
    console.log('\nNext steps:');
    console.log('  - npm run nodes:attest    # Record attestations');
    console.log('  - npm run nodes:rewards   # Accrue rewards');
    console.log('  - npm run nodes:report    # Generate weekly report');
  }
}

main();
