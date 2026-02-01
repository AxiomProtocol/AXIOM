#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { createIncident } from '../../src/nodes/incidents';
import { NodeIncident, IncidentSeverity, IncidentCategory } from '../../src/nodes/types';

const DATA_DIR = path.join(process.cwd(), 'data/nodes');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
const OPERATORS_FILE = path.join(DATA_DIR, 'operators.json');

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
  console.log('FILE INCIDENT REPORT');
  console.log('============================================================\n');

  const incidents = loadJson<NodeIncident[]>(INCIDENTS_FILE, []);
  const operators = loadJson<any[]>(OPERATORS_FILE, []);

  // Demo: Create a sample LOW severity incident
  const sampleOperator = operators.find(o => o.status === 'ACTIVE');
  
  if (!sampleOperator) {
    console.log('No active operators found to file incident against.');
    console.log('This demo requires at least one active operator.\n');
    return;
  }

  const incident = createIncident({
    operatorId: sampleOperator.operatorId,
    severity: 'LOW' as IncidentSeverity,
    category: 'DOCUMENTATION_ERROR' as IncidentCategory,
    title: 'Minor documentation discrepancy',
    description: 'Validation report contained minor formatting errors that did not affect accuracy.',
    reportedBy: 'SYSTEM',
    relatedPacketIds: ['PKT-A-2026-689'],
  });

  incidents.push(incident);
  saveJson(INCIDENTS_FILE, incidents);

  console.log('--- Incident Filed ---');
  console.log(`  Incident ID: ${incident.incidentId}`);
  console.log(`  Operator: ${sampleOperator.displayName || sampleOperator.operatorId}`);
  console.log(`  Severity: ${incident.severity}`);
  console.log(`  Category: ${incident.category}`);
  console.log(`  Status: ${incident.status}`);
  console.log(`  Reported At: ${incident.reportedAt}`);
  console.log('');

  console.log('============================================================');
  console.log('INCIDENT FILED SUCCESSFULLY');
  console.log('============================================================\n');
  console.log('Next step: npm run nodes:adjudicate (to resolve the incident)');
}

main();
