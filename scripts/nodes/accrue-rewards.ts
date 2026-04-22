#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { createRewardsLedger, accrueReward, getMilestoneEligibility } from '../../src/nodes/rewards';
import { NodeOperator, NodeRewardsLedger, Milestone } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const PACKETS_DIR = path.join(process.cwd(), 'data/property-packets');
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

function getPacketIds(): string[] {
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
    ids.push('PKT-A-2026-689', 'PKT-B-2026-921');
  }
  return ids;
}

function main() {
  console.log('============================================================');
  console.log('NODE REWARD ACCRUAL');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  let ledgers = loadJson<NodeRewardsLedger[]>(LEDGERS_FILE, []);
  const packetIds = getPacketIds();

  const activeOperators = operators.filter(o => o.status === 'ACTIVE' && !o.suspended);

  if (activeOperators.length === 0) {
    console.log('No active operators found.');
    console.log('Run the onboarding flow first.\n');
    return;
  }

  console.log(`Found ${activeOperators.length} active operator(s)`);
  console.log(`Found ${packetIds.length} packet(s)\n`);

  // Milestones to accrue (simulating first 3 milestones)
  const milestonesToAccrue: Milestone[] = [
    'PACKET_ACCEPTED',
    'UNDERWRITING_FINALIZED',
    'ARTIFACTS_PREVALIDATED',
  ];

  let totalAccrued = 0;
  let entriesCreated = 0;

  for (const operator of activeOperators) {
    console.log(`--- Accruing for ${operator.displayName || operator.operatorId} ---`);
    console.log(`  Role: ${operator.role}`);

    // Get or create ledger
    let ledgerIndex = ledgers.findIndex(l => l.operatorId === operator.operatorId);
    if (ledgerIndex === -1) {
      ledgers.push(createRewardsLedger(operator.operatorId));
      ledgerIndex = ledgers.length - 1;
    }
    let ledger = ledgers[ledgerIndex];

    const eligibleMilestones = getMilestoneEligibility(operator.role);

    for (const packetId of packetIds) {
      for (const milestone of milestonesToAccrue) {
        // Skip if not eligible for this milestone
        if (!eligibleMilestones.includes(milestone)) {
          continue;
        }

        // Skip if already accrued for this packet+milestone
        const alreadyAccrued = ledger.entries.some(
          e => e.packetId === packetId && e.milestone === milestone
        );
        if (alreadyAccrued) {
          continue;
        }

        try {
          const result = accrueReward(ledger, {
            packetId,
            milestone,
            role: operator.role,
          });
          ledger = result.ledger;
          totalAccrued += result.entry.usdAmount;
          entriesCreated++;

          console.log(`  ${packetId} / ${milestone}: +$${result.entry.usdAmount.toFixed(2)}`);
        } catch (e: any) {
          // Skip silently for ineligible milestones
        }
      }
    }

    ledgers[ledgerIndex] = ledger;
    console.log(`  Total Pending: $${ledger.usdPending.toFixed(2)}\n`);
  }

  saveJson(LEDGERS_FILE, ledgers);

  console.log('============================================================');
  console.log('ACCRUAL SUMMARY');
  console.log('============================================================');
  console.log(`  Entries Created: ${entriesCreated}`);
  console.log(`  Total Accrued: $${totalAccrued.toFixed(2)}`);
  console.log('');
  console.log('Next step: npm run nodes:payout');
}

main();
