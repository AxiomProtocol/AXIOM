#!/usr/bin/env npx ts-node
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts', 'property-packet');
const DATA_DIR = path.join(process.cwd(), 'data', 'property-packets');

interface FlowStep {
  name: string;
  script: string;
  description: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    name: 'Create Packets',
    script: 'create-packets.ts',
    description: 'Generate Track A (Performing) and Track B (Light NPL) packet templates'
  },
  {
    name: 'Finalize Underwriting',
    script: 'finalize-underwriting.ts',
    description: 'Compute underwriting outputs and risk analysis'
  },
  {
    name: 'Draft Participation Clauses',
    script: 'draft-participation-clauses.ts',
    description: 'Generate participation agreement clause documents'
  },
  {
    name: 'Pre-validate Artifacts',
    script: 'prevalidate-settlement-artifacts.ts',
    description: 'Validate all required settlement artifacts are present'
  }
];

function runStep(step: FlowStep): boolean {
  console.log();
  console.log('─'.repeat(60));
  console.log(`STEP: ${step.name}`);
  console.log(`Description: ${step.description}`);
  console.log('─'.repeat(60));
  console.log();
  
  const scriptPath = path.join(SCRIPTS_DIR, step.script);
  
  try {
    execSync(`npx ts-node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    return true;
  } catch (error) {
    console.error(`Step failed: ${step.name}`);
    return false;
  }
}

function printFinalSummary() {
  console.log();
  console.log('═'.repeat(60));
  console.log('PROPERTY PACKET FLOW SUMMARY');
  console.log('═'.repeat(60));
  console.log();
  
  const trackAPath = path.join(DATA_DIR, 'track-a-performing.packet.json');
  const trackBPath = path.join(DATA_DIR, 'track-b-light-npl.packet.json');
  
  if (fs.existsSync(trackAPath) && fs.existsSync(trackBPath)) {
    const trackA = JSON.parse(fs.readFileSync(trackAPath, 'utf-8'));
    const trackB = JSON.parse(fs.readFileSync(trackBPath, 'utf-8'));
    
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log('│ PACKET STATUS                                          │');
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│ Track A: ${trackA.packetId.padEnd(20)} Status: ${trackA.status.padEnd(15)} │`);
    console.log(`│ Track B: ${trackB.packetId.padEnd(20)} Status: ${trackB.status.padEnd(15)} │`);
    console.log('└────────────────────────────────────────────────────────┘');
    console.log();
    
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log('│ UNDERWRITING SUMMARY                                   │');
    console.log('├────────────────────────────────────────────────────────┤');
    
    if (trackA.underwriting) {
      console.log(`│ Track A Purchase Price:  $${trackA.underwriting.purchasePrice?.toLocaleString().padEnd(15)} │`);
      console.log(`│ Track A Participation:   $${trackA.underwriting.participationAmount?.toLocaleString().padEnd(15)} │`);
      console.log(`│ Track A Yield Range:     ${trackA.underwriting.impliedYieldRange?.padEnd(20)} │`);
      console.log(`│ Track A Risk Tier:       ${trackA.underwriting.riskTier?.padEnd(20)} │`);
    }
    
    console.log('├────────────────────────────────────────────────────────┤');
    
    if (trackB.underwriting) {
      console.log(`│ Track B Purchase Price:  $${trackB.underwriting.purchasePrice?.toLocaleString().padEnd(15)} │`);
      console.log(`│ Track B Participation:   $${trackB.underwriting.participationAmount?.toLocaleString().padEnd(15)} │`);
      console.log(`│ Track B Yield Range:     ${trackB.underwriting.impliedYieldRange?.padEnd(20)} │`);
      console.log(`│ Track B Risk Tier:       ${trackB.underwriting.riskTier?.padEnd(20)} │`);
      console.log(`│ Track B Recovery Est:    ${trackB.underwriting.recoveryEstimate?.padEnd(20)} │`);
    }
    
    console.log('└────────────────────────────────────────────────────────┘');
    console.log();
    
    const trackAReady = trackA.status === 'READY';
    const trackBReady = trackB.status === 'READY';
    
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log('│ SETTLEMENT READINESS                                   │');
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│ Track A: ${trackAReady ? '✓ READY' : '✗ NOT READY - Artifacts pending'.padEnd(40)}       │`);
    console.log(`│ Track B: ${trackBReady ? '✓ READY' : '✗ NOT READY - Artifacts pending'.padEnd(40)}       │`);
    console.log('└────────────────────────────────────────────────────────┘');
    console.log();
    
    if (!trackAReady || !trackBReady) {
      console.log('NEXT STEPS TO COMPLETE:');
      console.log('  1. Replace PLACEHOLDER values in packet JSON with real CID/hash');
      console.log('  2. Upload artifacts to DeNet: npx ts-node scripts/denet/upload.ts');
      console.log('  3. Re-run validation: npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts');
      console.log();
    } else {
      console.log('PACKETS READY FOR SETTLEMENT:');
      console.log('  1. Obtain dual attestation (ATTESTOR_A + ATTESTOR_B)');
      console.log('  2. Initiate 24-hour timelock');
      console.log('  3. Submit to CapitalBridgeHub');
      console.log();
    }
  }
  
  console.log('FILES CREATED:');
  console.log('  data/property-packets/track-a-performing.packet.json');
  console.log('  data/property-packets/track-b-light-npl.packet.json');
  console.log('  data/property-packets/track-a-performing.participation-clauses.md');
  console.log('  data/property-packets/track-b-light-npl.participation-clauses.md');
  console.log('  docs/ops/reports/settlement-artifact-readiness.md');
  console.log();
  
  console.log('DOCUMENTATION:');
  console.log('  docs/ops/property-packets/packet-track-a-performing.md');
  console.log('  docs/ops/property-packets/packet-track-b-light-npl.md');
  console.log('  docs/ops/property-packet-operator-sop.md');
  console.log('  docs/ops/schemas/property-packet.schema.json');
  console.log();
}

async function main() {
  console.log('═'.repeat(60));
  console.log('PROPERTY PACKET FULL WORKFLOW');
  console.log('═'.repeat(60));
  console.log();
  console.log(`Started: ${new Date().toISOString()}`);
  console.log();
  console.log('This workflow will execute the following steps:');
  FLOW_STEPS.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step.name}`);
  });
  
  let allSucceeded = true;
  let lastFailedStep: string | null = null;
  
  for (const step of FLOW_STEPS) {
    const success = runStep(step);
    if (!success) {
      allSucceeded = false;
      lastFailedStep = step.name;
      break;
    }
  }
  
  if (allSucceeded) {
    printFinalSummary();
  } else {
    console.log();
    console.log('═'.repeat(60));
    console.log(`WORKFLOW STOPPED AT: ${lastFailedStep}`);
    console.log('═'.repeat(60));
    console.log();
    console.log('Review the error above and re-run the workflow.');
    process.exit(1);
  }
  
  console.log(`Completed: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
