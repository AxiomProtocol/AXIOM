#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { 
  acknowledgeIncident, 
  startInvestigation, 
  completeInvestigation, 
  resolveIncident,
  applyIncidentToOperator 
} from '../../src/nodes/incidents';
import { slashRewards } from '../../src/nodes/rewards';
import { NodeIncident, NodeOperator, NodeRewardsLedger } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
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
  console.log('INCIDENT ADJUDICATION');
  console.log('============================================================\n');

  let incidents = loadJson<NodeIncident[]>(INCIDENTS_FILE, []);
  let operators = loadJson<NodeOperator[]>(OPERATORS_FILE, []);
  let ledgers = loadJson<NodeRewardsLedger[]>(LEDGERS_FILE, []);

  // Find open incidents
  const openIncidents = incidents.filter(i => i.status === 'REPORTED');

  if (openIncidents.length === 0) {
    console.log('No open incidents to adjudicate.');
    console.log('Run `npm run nodes:incident` first to file an incident.\n');
    return;
  }

  console.log(`Found ${openIncidents.length} open incident(s) to adjudicate\n`);

  for (let i = 0; i < incidents.length; i++) {
    let incident = incidents[i];

    if (incident.status !== 'REPORTED') {
      continue;
    }

    const operator = operators.find(o => o.operatorId === incident.operatorId);
    const operatorName = operator?.displayName || incident.operatorId;

    console.log(`--- Adjudicating ${incident.incidentId} ---`);
    console.log(`  Operator: ${operatorName}`);
    console.log(`  Severity: ${incident.severity}`);
    console.log(`  Category: ${incident.category}`);
    console.log(`  Title: ${incident.title}`);
    console.log('');

    // Step 1: Acknowledge
    incident = acknowledgeIncident(incident);
    console.log(`  [1] Acknowledged`);

    // Step 2: Start investigation
    incident = startInvestigation(incident, 'COORDINATOR');
    console.log(`  [2] Investigation started`);

    // Step 3: Complete investigation
    incident = completeInvestigation(
      incident,
      `Investigation complete. ${incident.severity} severity issue identified. Operator cooperation noted.`,
      incident.severity === 'LOW' ? 'WARNING' : 'SUSPENSION'
    );
    console.log(`  [3] Investigation complete - Recommendation: ${incident.investigation?.recommendation}`);

    // Step 4: Resolve incident
    const ledger = ledgers.find(l => l.operatorId === incident.operatorId);
    const unpaidRewards = ledger?.usdPending || 0;

    const result = resolveIncident(
      incident,
      incident.investigation?.recommendation || 'WARNING',
      `Incident adjudicated based on investigation findings.`,
      unpaidRewards
    );

    incident = result.incident;
    console.log(`  [4] Resolved with: ${result.incident.outcome?.decision}`);

    if (result.slashAmount > 0) {
      console.log(`      Slashed: $${result.slashAmount.toFixed(2)}`);
      
      // Apply slashing to ledger
      const ledgerIndex = ledgers.findIndex(l => l.operatorId === incident.operatorId);
      if (ledgerIndex !== -1) {
        const slashResult = slashRewards(
          ledgers[ledgerIndex],
          result.incident.outcome?.slashPercent || 0,
          `Incident ${incident.incidentId}`
        );
        ledgers[ledgerIndex] = slashResult.ledger;
      }
    }

    if (result.suspensionDays > 0) {
      console.log(`      Suspension: ${result.suspensionDays} days`);
    }

    // Step 5: Apply to operator if needed
    if (operator) {
      const operatorIndex = operators.findIndex(o => o.operatorId === incident.operatorId);
      if (operatorIndex !== -1) {
        operators[operatorIndex] = applyIncidentToOperator(operators[operatorIndex], incident);
      }
    }

    incidents[i] = incident;
    console.log(`  [5] Public Summary: ${incident.publicSummary}`);
    console.log('');
  }

  saveJson(INCIDENTS_FILE, incidents);
  saveJson(OPERATORS_FILE, operators);
  saveJson(LEDGERS_FILE, ledgers);

  console.log('============================================================');
  console.log('ADJUDICATION COMPLETE');
  console.log('============================================================\n');
  console.log('Files updated:');
  console.log(`  - ${INCIDENTS_FILE}`);
  console.log(`  - ${OPERATORS_FILE}`);
  console.log(`  - ${LEDGERS_FILE}`);
}

main();
