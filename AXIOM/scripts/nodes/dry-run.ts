#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { createDryRunExercises, recordExerciseResult, completeDryRun } from '../../src/nodes/onboarding';
import { NodeOperator, NodeOnboarding } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ONBOARDING_FILE = path.join(DATA_DIR, 'onboarding.json');
const PACKETS_DIR = path.join(process.cwd(), 'data/property-packets');

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

function getTestPacketIds(): string[] {
  const ids: string[] = [];
  try {
    const files = fs.readdirSync(PACKETS_DIR);
    for (const file of files) {
      if (file.endsWith('.packet.json')) {
        const packet = JSON.parse(fs.readFileSync(path.join(PACKETS_DIR, file), 'utf-8'));
        if (packet.packetId) {
          ids.push(packet.packetId);
        }
      }
    }
  } catch (e) {
    // Use default packet IDs if directory doesn't exist
    ids.push('PKT-A-2026-689', 'PKT-B-2026-921');
  }
  return ids;
}

function main() {
  console.log('============================================================');
  console.log('NODE OPERATOR DRY-RUN EXERCISES');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const onboardings = loadJson<NodeOnboarding[]>(ONBOARDING_FILE, []);
  const testPacketIds = getTestPacketIds();

  let completedCount = 0;

  for (let i = 0; i < onboardings.length; i++) {
    let onboarding = onboardings[i];
    
    if (onboarding.currentPhase !== 'PROVISIONED') {
      continue;
    }

    const operatorIndex = operators.findIndex(o => o.operatorId === onboarding.operatorId);
    if (operatorIndex === -1) {
      console.log(`Operator ${onboarding.operatorId} not found, skipping`);
      continue;
    }

    const operator = operators[operatorIndex];

    console.log(`--- Running Dry-Run for ${operator.displayName || operator.operatorId} ---`);
    console.log(`  Role: ${operator.role}`);

    // Create exercises if not already created
    if (onboarding.dryRunExercises.length === 0) {
      const exercises = createDryRunExercises(operator.role);
      onboarding = {
        ...onboarding,
        dryRunExercises: exercises,
      };
      console.log(`  Created ${exercises.length} exercises`);
    }

    // Simulate completing all exercises with passing scores
    let packetIndex = 0;
    for (const exercise of onboarding.dryRunExercises) {
      if (exercise.status === 'PENDING') {
        const score = 90 + Math.floor(Math.random() * 10); // 90-99
        const packetId = exercise.type === 'VALIDATION' || exercise.type === 'ATTESTATION'
          ? testPacketIds[packetIndex++ % testPacketIds.length]
          : undefined;

        onboarding = recordExerciseResult(onboarding, exercise.exerciseId, {
          status: 'PASSED',
          score,
          feedback: `Dry-run exercise completed successfully`,
          packetId,
        });

        console.log(`  Exercise ${exercise.exerciseId} (${exercise.type}): PASSED (${score}%)`);
      }
    }

    try {
      const result = completeDryRun(operator, onboarding);
      operators[operatorIndex] = result.operator;
      onboardings[i] = result.onboarding;
      completedCount++;

      console.log(`  New Status: ${result.operator.status}`);
      console.log(`  Overall Score: ${result.onboarding.phases.dryRunPassed?.score?.toFixed(1)}%`);
      console.log('');
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
      onboardings[i] = onboarding; // Save partial progress
    }
  }

  if (completedCount === 0) {
    console.log('No operators in PROVISIONED status for dry-run.');
    console.log('Run `npm run nodes:provision` first.\n');
  } else {
    saveJson(OPERATORS_FILE, operators);
    saveJson(ONBOARDING_FILE, onboardings);

    console.log('============================================================');
    console.log(`DRY-RUN COMPLETE: ${completedCount} operator(s) passed`);
    console.log('============================================================\n');
    console.log('Next step: npm run nodes:certify');
  }
}

main();
