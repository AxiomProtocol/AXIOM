#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { createOnboarding } from '../../src/nodes/onboarding';
import { NodeOperator, NodeOnboarding, OperatorRole } from '../../src/nodes/types';

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
  console.log('NODE OPERATOR APPLICATION');
  console.log('============================================================\n');

  // Demo: Create two sample operators
  const applications = [
    {
      walletAddress: '0x' + 'a'.repeat(40),
      email: 'gamma.observer@example.com',
      displayName: 'Gamma Observer',
      requestedRole: 'OBSERVER' as OperatorRole,
    },
    {
      walletAddress: '0x' + 'b'.repeat(40),
      email: 'delta.validator@example.com',
      displayName: 'Delta Validator',
      requestedRole: 'VALIDATOR' as OperatorRole,
    },
  ];

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);

  for (const app of applications) {
    // Check if wallet already registered
    const existing = operators.find(
      o => o.walletAddress.toLowerCase() === app.walletAddress.toLowerCase()
    );
    
    if (existing) {
      console.log(`Skipping ${app.displayName}: wallet already registered`);
      continue;
    }

    const { operator, onboarding } = createOnboarding(app);
    
    operators.push(operator);
    onboardings.push(onboarding);

    console.log(`--- Application Submitted ---`);
    console.log(`  Operator ID: ${operator.operatorId}`);
    console.log(`  Onboarding ID: ${onboarding.onboardingId}`);
    console.log(`  Display Name: ${operator.displayName}`);
    console.log(`  Requested Role: ${operator.role}`);
    console.log(`  Verification Tier: ${operator.verificationTier}`);
    console.log(`  Status: ${operator.status}`);
    console.log(`  Expires: ${onboarding.expiresAt}`);
    console.log('');
  }

  saveJson(OPERATORS_FILE, operators);
  saveJson(ONBOARDING_FILE, onboardings);

  console.log('============================================================');
  console.log('APPLICATION COMPLETE');
  console.log('============================================================\n');
  console.log('Files updated:');
  console.log(`  - ${OPERATORS_FILE}`);
  console.log(`  - ${ONBOARDING_FILE}`);
  console.log('\nNext step: npm run nodes:verify');
}

main();
