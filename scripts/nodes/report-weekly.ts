#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { generateWeeklyMetrics, formatMetricsMarkdown, formatMetricsJson } from '../../src/nodes/metrics';
import { NodeOperator, NodeOnboarding, NodeAttestation, NodeRewardsLedger, NodeIncident } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const REPORTS_DIR = path.join(process.cwd(), 'docs/ops/reports');
const OBSERVER_DIR = path.join(process.cwd(), 'docs/observer');

const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');
const ATTESTATIONS_FILE = path.join(DATA_DIR, 'attestations.json');
const LEDGERS_FILE = path.join(DATA_DIR, 'rewards-ledger.json');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');

function loadJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    // Silent fallback
  }
  return defaultValue;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  console.log('============================================================');
  console.log('NODE OPERATOR WEEKLY REPORT');
  console.log('============================================================\n');

  // Load all data
  const operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  const attestations = loadJson<NodeAttestation[]>(ATTESTATIONS_FILE, []);
  const ledgers = loadJson<NodeRewardsLedger[]>(LEDGERS_FILE, []);
  const incidents = loadJson<NodeIncident[]>(INCIDENTS_FILE, []);

  // Also try sample files if main files are empty
  const operatorsData = operators.length > 0 
    ? operators 
    : loadJson<NodeOperator[]>(path.join(DATA_DIR, 'operators.sample.json'), []);
  const attestationsData = attestations.length > 0 
    ? attestations 
    : loadJson<NodeAttestation[]>(path.join(DATA_DIR, 'attestations.sample.json'), []);
  const ledgersData = ledgers.length > 0 
    ? ledgers 
    : loadJson<NodeRewardsLedger[]>(path.join(DATA_DIR, 'rewards-ledger.sample.json'), []);
  const incidentsData = incidents.length > 0 
    ? incidents 
    : loadJson<NodeIncident[]>(path.join(DATA_DIR, 'incidents.sample.json'), []);

  console.log('Data Sources:');
  console.log(`  Operators: ${operatorsData.length}`);
  console.log(`  Attestations: ${attestationsData.length}`);
  console.log(`  Reward Ledgers: ${ledgersData.length}`);
  console.log(`  Incidents: ${incidentsData.length}`);
  console.log('');

  // Generate metrics
  const metrics = generateWeeklyMetrics({
    operators: operatorsData,
    attestations: attestationsData,
    ledgers: ledgersData,
    incidents: incidentsData,
  });

  // Generate markdown report
  const markdownReport = formatMetricsMarkdown(metrics);
  const jsonReport = formatMetricsJson(metrics);

  // Ensure output directories exist
  ensureDir(REPORTS_DIR);
  ensureDir(OBSERVER_DIR);

  // Write reports
  const weeklyReportPath = path.join(REPORTS_DIR, 'node-weekly-report.md');
  const metricsPath = path.join(OBSERVER_DIR, 'node-program-metrics.md');
  const jsonPath = path.join(OBSERVER_DIR, 'node-program-metrics.json');

  fs.writeFileSync(weeklyReportPath, markdownReport);
  fs.writeFileSync(metricsPath, markdownReport);
  fs.writeFileSync(jsonPath, jsonReport);

  console.log('Reports Generated:');
  console.log(`  - ${weeklyReportPath}`);
  console.log(`  - ${metricsPath}`);
  console.log(`  - ${jsonPath}`);
  console.log('');

  // Print summary to console
  console.log('─'.repeat(60));
  console.log('QUICK SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Week: ${metrics.weekStartDate} to ${metrics.weekEndDate}`);
  console.log('');
  console.log('Operators:');
  console.log(`  Total: ${metrics.operators.total}`);
  console.log(`  Active: ${metrics.operators.active}`);
  console.log(`  Suspended: ${metrics.operators.suspended}`);
  console.log('');
  console.log('Attestations:');
  console.log(`  Total: ${metrics.attestations.total}`);
  console.log(`  Pass Rate: ${metrics.attestations.passRate.toFixed(1)}%`);
  console.log('');
  console.log('Rewards:');
  console.log(`  Total Accrued: $${metrics.rewards.totalAccruedUsd.toFixed(2)}`);
  console.log(`  Total Pending: $${metrics.rewards.totalPendingUsd.toFixed(2)}`);
  console.log('');
  console.log('Incidents:');
  console.log(`  Total: ${metrics.incidents.total}`);
  console.log(`  Open: ${metrics.incidents.open}`);
  console.log(`  Critical: ${metrics.incidents.criticalCount}`);
  console.log(`  Governance Incidents: ${metrics.incidents.governanceIncidents} (Target: 0)`);
  console.log('');
}

main();
