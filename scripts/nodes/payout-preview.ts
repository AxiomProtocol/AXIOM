#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { calculatePayoutPreview } from '../../src/nodes/rewards';
import { NodeOperator, NodeRewardsLedger, NodeConfig } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const LEDGERS_FILE = path.join(DATA_DIR, 'rewards-ledger.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

function main() {
  console.log('============================================================');
  console.log('NODE PAYOUT PREVIEW');
  console.log('============================================================\n');

  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const ledgers = loadJson<NodeRewardsLedger[]>(LEDGERS_FILE, []);
  const config = loadJson<NodeConfig>(CONFIG_FILE, {
    postedAxiomUsdRate: 0.10,
    rateEffectiveDate: '2026-02-01',
    rateSource: 'treasury_oracle',
    observationWindowEndDate: '2026-03-26',
    payoutThresholdUsd: 50,
    monthlyOperatorCap: 5000,
    monthlyProgramCap: 50000,
  });

  console.log(`Posted AXIOM Rate: $${config.postedAxiomUsdRate.toFixed(4)} USD`);
  console.log(`Rate Effective: ${config.rateEffectiveDate}`);
  console.log(`Payout Threshold: $${config.payoutThresholdUsd} USD`);
  console.log(`Observation Window Ends: ${config.observationWindowEndDate}\n`);

  if (ledgers.length === 0) {
    console.log('No reward ledgers found.');
    console.log('Run `npm run nodes:rewards` first to accrue rewards.\n');
    return;
  }

  console.log('─'.repeat(80));
  console.log('OPERATOR PAYOUT PREVIEWS');
  console.log('─'.repeat(80));
  console.log('');

  let totalUsd = 0;
  let totalAxiom = 0;
  let totalConversion = 0;
  let readyForPayout = 0;

  for (const ledger of ledgers) {
    const operator = operators.find(o => o.operatorId === ledger.operatorId);
    const displayName = operator?.displayName || ledger.operatorId;

    const preview = calculatePayoutPreview(ledger, config);
    const meetsThreshold = preview.usdAmount >= config.payoutThresholdUsd;

    console.log(`${displayName}`);
    console.log(`  Operator ID: ${ledger.operatorId}`);
    console.log(`  Role: ${operator?.role || 'Unknown'}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  USD Accrued (Total):    $${ledger.usdAccrued.toFixed(2)}`);
    console.log(`  USD Paid (Total):       $${ledger.usdPaid.toFixed(2)}`);
    console.log(`  USD Pending:            $${preview.usdAmount.toFixed(2)}`);
    console.log(`  Conversion Bucket:      $${preview.conversionBucketBalance.toFixed(2)}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  AXIOM Preview:          ${preview.axiomAmount.toFixed(4)} AXM`);
    console.log(`  Rate Used:              $${preview.rateUsed.toFixed(4)}`);
    console.log(`  Meets Threshold:        ${meetsThreshold ? '✓ YES' : '✗ NO'}`);
    console.log('');

    totalUsd += preview.usdAmount;
    totalAxiom += preview.axiomAmount;
    totalConversion += preview.conversionBucketBalance;
    if (meetsThreshold) readyForPayout++;
  }

  console.log('─'.repeat(80));
  console.log('AGGREGATE SUMMARY');
  console.log('─'.repeat(80));
  console.log(`  Operators with Ledgers:   ${ledgers.length}`);
  console.log(`  Ready for Payout:         ${readyForPayout}`);
  console.log(`  Total USD Pending:        $${totalUsd.toFixed(2)}`);
  console.log(`  Total AXIOM to Distribute: ${totalAxiom.toFixed(4)} AXM`);
  console.log(`  Total in Conversion Bucket: $${totalConversion.toFixed(2)}`);
  console.log('');

  if (readyForPayout === 0) {
    console.log('No operators meet the payout threshold yet.');
    console.log(`Threshold: $${config.payoutThresholdUsd} USD\n`);
  }

  console.log('Note: During observation window, all payouts are in AXIOM tokens.');
  console.log(`Observation window ends: ${config.observationWindowEndDate}\n`);
}

main();
