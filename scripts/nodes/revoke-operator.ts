#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { revokeOperator } from '../../src/nodes/registry';
import { slashRewards } from '../../src/nodes/rewards';
import { NodeOperator, NodeRewardsLedger } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const LEDGERS_FILE = path.join(DATA_DIR, 'rewards-ledger.json');

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
  console.log('OPERATOR REVOCATION');
  console.log('============================================================\n');

  // In production, this would take operator ID and reason as arguments
  // For demo, we just show the revocation process

  const args = process.argv.slice(2);
  const operatorId = args[0];
  const reason = args.slice(1).join(' ') || 'Administrative revocation';

  let operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  let ledgers = loadJson<NodeRewardsLedger[]>(LEDGERS_FILE, []);

  if (!operatorId) {
    console.log('Usage: npx ts-node scripts/nodes/revoke-operator.ts <operatorId> [reason]');
    console.log('');
    console.log('Active operators:');
    const active = operators.filter(o => o.status === 'ACTIVE' && !o.suspended);
    if (active.length === 0) {
      console.log('  (none)');
    } else {
      for (const op of active) {
        console.log(`  ${op.operatorId} - ${op.displayName || 'No name'} (${op.role})`);
      }
    }
    console.log('');
    return;
  }

  const operatorIndex = operators.findIndex(o => o.operatorId === operatorId);
  if (operatorIndex === -1) {
    console.log(`Operator ${operatorId} not found.`);
    return;
  }

  const operator = operators[operatorIndex];

  console.log('--- Revoking Operator ---');
  console.log(`  Operator ID: ${operator.operatorId}`);
  console.log(`  Display Name: ${operator.displayName || 'N/A'}`);
  console.log(`  Role: ${operator.role}`);
  console.log(`  Current Status: ${operator.status}`);
  console.log(`  Reason: ${reason}`);
  console.log('');

  // Revoke operator
  const revokedOperator = revokeOperator(operator, reason);
  operators[operatorIndex] = revokedOperator;

  // Slash 100% of pending rewards
  const ledgerIndex = ledgers.findIndex(l => l.operatorId === operatorId);
  if (ledgerIndex !== -1) {
    const result = slashRewards(
      ledgers[ledgerIndex],
      100,
      `Revocation: ${reason}`
    );
    ledgers[ledgerIndex] = result.ledger;
    console.log(`  Slashed: $${result.slashedAmount.toFixed(2)}`);
  }

  saveJson(OPERATORS_FILE, operators);
  saveJson(LEDGERS_FILE, ledgers);

  console.log('');
  console.log('============================================================');
  console.log('REVOCATION COMPLETE');
  console.log('============================================================');
  console.log('');
  console.log(`Operator ${operatorId} has been revoked.`);
  console.log('- All capabilities suspended');
  console.log('- Pending rewards slashed 100%');
  console.log('- 12-month cooling-off period before reapplication');
}

main();
