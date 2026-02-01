#!/usr/bin/env npx ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data', 'property-packets');

interface PropertyPacket {
  packetId: string;
  trackType: 'PERFORMING' | 'LIGHT_NPL';
  createdAt: string;
  createdBy: string;
  propertyAddress: string;
  propertyType: string;
  unpaidPrincipalBalance: number;
  interestRate: number;
  originalLoanAmount: number;
  originationDate: string;
  maturityDate: string;
  monthlyPayment: number;
  lienPosition: number;
  servicerName: string;
  status: string;
  paymentHistoryMonths?: number;
  lastPaymentDate?: string;
  delinquencyStatus?: DelinquencyStatus;
  borrowerContactStatus?: string;
  workoutOptionsAvailable?: WorkoutOption[];
  propertyOccupancy?: string;
  propertyValue?: number;
  ltv?: number;
  underwriting?: Record<string, unknown>;
  artifactIndex: Record<string, ArtifactReference>;
  riskFlags: RiskFlag[];
  attestations: Attestation[];
  servicingEvents?: ServicingEvent[];
}

interface DelinquencyStatus {
  missedPaymentCount: number;
  firstMissedDate: string;
  lastMissedDate: string;
  totalAmountPastDue: number;
  lateFeesAccrued: number;
  escrowShortage: number;
  currentLegalStatus: string;
  foreclosureFiledDate: string | null;
  redemptionPeriodEnd: string | null;
}

interface WorkoutOption {
  type: string;
  probability: string;
  requiredAmount?: number;
  proposedTerms?: string;
  proposedAmount?: number;
  discount?: string;
  timeline: string;
  notes: string;
}

interface ArtifactReference {
  cid: string;
  sha256: string;
  filename: string;
  uploadedAt: string;
}

interface RiskFlag {
  code: string;
  severity: string;
  description: string;
}

interface Attestation {
  role: string;
  signer: string;
  timestamp: string;
  packetHash: string;
}

interface ServicingEvent {
  date: string;
  type: string;
  outcome: string;
  nextAction: string;
  nextActionDue: string;
}

function generatePacketId(track: 'A' | 'B'): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `PKT-${track}-${year}-${seq}`;
}

function createTrackAPacket(): PropertyPacket {
  const now = new Date().toISOString();
  return {
    packetId: generatePacketId('A'),
    trackType: 'PERFORMING',
    createdAt: now,
    createdBy: '0x0000000000000000000000000000000000000000',
    propertyAddress: '123 Main Street, Atlanta, GA 30301',
    propertyType: 'SFR',
    unpaidPrincipalBalance: 185000.00,
    interestRate: 7.25,
    originalLoanAmount: 200000.00,
    originationDate: '2022-06-15',
    maturityDate: '2052-06-15',
    monthlyPayment: 1364.89,
    lienPosition: 1,
    servicerName: 'ABC Servicing LLC',
    status: 'DRAFT',
    paymentHistoryMonths: 18,
    lastPaymentDate: '2026-01-15',
    propertyValue: 216000.00,
    ltv: 85.6,
    artifactIndex: {
      paymentHistoryProof: {
        cid: 'PLACEHOLDER_CID_payment_history',
        sha256: 'PLACEHOLDER_HASH_payment_history',
        filename: 'payment-history-18mo.pdf',
        uploadedAt: now
      },
      servicerStatement: {
        cid: 'PLACEHOLDER_CID_servicer_statement',
        sha256: 'PLACEHOLDER_HASH_servicer_statement',
        filename: 'servicer-statement-jan2026.pdf',
        uploadedAt: now
      },
      lienPositionVerification: {
        cid: 'PLACEHOLDER_CID_lien_verification',
        sha256: 'PLACEHOLDER_HASH_lien_verification',
        filename: 'title-search-report.pdf',
        uploadedAt: now
      },
      participationAgreement: {
        cid: 'PLACEHOLDER_CID_participation_agreement',
        sha256: 'PLACEHOLDER_HASH_participation_agreement',
        filename: 'participation-agreement-draft.pdf',
        uploadedAt: now
      },
      cashflowSchedule: {
        cid: 'PLACEHOLDER_CID_cashflow_schedule',
        sha256: 'PLACEHOLDER_HASH_cashflow_schedule',
        filename: 'cashflow-schedule.json',
        uploadedAt: now
      }
    },
    riskFlags: [],
    attestations: []
  };
}

function createTrackBPacket(): PropertyPacket {
  const now = new Date().toISOString();
  return {
    packetId: generatePacketId('B'),
    trackType: 'LIGHT_NPL',
    createdAt: now,
    createdBy: '0x0000000000000000000000000000000000000000',
    propertyAddress: '456 Oak Avenue, Memphis, TN 38103',
    propertyType: 'SFR',
    unpaidPrincipalBalance: 142000.00,
    interestRate: 6.75,
    originalLoanAmount: 165000.00,
    originationDate: '2020-03-20',
    maturityDate: '2050-03-20',
    monthlyPayment: 1071.23,
    lienPosition: 1,
    servicerName: 'XYZ Special Servicing',
    status: 'DRAFT',
    propertyOccupancy: 'OWNER_OCCUPIED',
    propertyValue: 175000.00,
    ltv: 81.1,
    borrowerContactStatus: 'RESPONSIVE',
    delinquencyStatus: {
      missedPaymentCount: 3,
      firstMissedDate: '2025-11-01',
      lastMissedDate: '2026-01-01',
      totalAmountPastDue: 3213.69,
      lateFeesAccrued: 150.00,
      escrowShortage: 0.00,
      currentLegalStatus: 'PRE_FORECLOSURE',
      foreclosureFiledDate: null,
      redemptionPeriodEnd: null
    },
    workoutOptionsAvailable: [
      {
        type: 'REINSTATEMENT',
        probability: 'MEDIUM',
        requiredAmount: 3363.69,
        timeline: '30 days',
        notes: 'Borrower indicated job loss was temporary'
      },
      {
        type: 'MODIFICATION',
        probability: 'HIGH',
        proposedTerms: 'Rate reduction to 5.5%, term extension 5 years',
        timeline: '60-90 days',
        notes: 'Borrower qualifies under HAMP guidelines'
      },
      {
        type: 'DISCOUNTED_PAYOFF',
        probability: 'LOW',
        proposedAmount: 128000.00,
        discount: '10%',
        timeline: '90-120 days',
        notes: 'Requires third-party buyer'
      }
    ],
    artifactIndex: {
      delinquencyStatusSummary: {
        cid: 'PLACEHOLDER_CID_delinquency_summary',
        sha256: 'PLACEHOLDER_HASH_delinquency_summary',
        filename: 'delinquency-summary.pdf',
        uploadedAt: now
      },
      borrowerContactLog: {
        cid: 'PLACEHOLDER_CID_borrower_log',
        sha256: 'PLACEHOLDER_HASH_borrower_log',
        filename: 'borrower-contact-log.csv',
        uploadedAt: now
      },
      workoutOptionsMatrix: {
        cid: 'PLACEHOLDER_CID_workout_matrix',
        sha256: 'PLACEHOLDER_HASH_workout_matrix',
        filename: 'workout-matrix.json',
        uploadedAt: now
      },
      timelineAssumptions: {
        cid: 'PLACEHOLDER_CID_timeline',
        sha256: 'PLACEHOLDER_HASH_timeline',
        filename: 'timeline-assumptions.pdf',
        uploadedAt: now
      },
      downsideDisclosure: {
        cid: 'PLACEHOLDER_CID_downside',
        sha256: 'PLACEHOLDER_HASH_downside',
        filename: 'downside-disclosure.pdf',
        uploadedAt: now
      },
      servicingEventLogTemplate: {
        cid: 'PLACEHOLDER_CID_servicing_template',
        sha256: 'PLACEHOLDER_HASH_servicing_template',
        filename: 'servicing-event-template.json',
        uploadedAt: now
      },
      participationAgreement: {
        cid: 'PLACEHOLDER_CID_participation_agreement',
        sha256: 'PLACEHOLDER_HASH_participation_agreement',
        filename: 'participation-agreement-draft.pdf',
        uploadedAt: now
      }
    },
    riskFlags: [
      {
        code: 'DELINQUENT',
        severity: 'HIGH',
        description: '3 missed payments - requires active workout'
      }
    ],
    attestations: [],
    servicingEvents: []
  };
}

function validatePacketSchema(packet: PropertyPacket): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!packet.packetId.match(/^PKT-[AB]-[0-9]{4}-[0-9]{3}$/)) {
    errors.push('Invalid packetId format');
  }
  
  if (!['PERFORMING', 'LIGHT_NPL'].includes(packet.trackType)) {
    errors.push('Invalid trackType');
  }
  
  if (!packet.createdBy.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push('Invalid createdBy address format');
  }
  
  if (packet.unpaidPrincipalBalance < 0) {
    errors.push('unpaidPrincipalBalance must be positive');
  }
  
  if (packet.interestRate < 0 || packet.interestRate > 30) {
    errors.push('interestRate must be between 0 and 30');
  }
  
  if (packet.lienPosition < 1 || packet.lienPosition > 3) {
    errors.push('lienPosition must be 1, 2, or 3');
  }
  
  return { valid: errors.length === 0, errors };
}

async function main() {
  console.log('='.repeat(60));
  console.log('PROPERTY PACKET CREATION');
  console.log('='.repeat(60));
  console.log();
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }
  
  console.log('--- Creating Track A (Performing) Packet ---');
  const trackAPacket = createTrackAPacket();
  const trackAValidation = validatePacketSchema(trackAPacket);
  
  if (!trackAValidation.valid) {
    console.error('Track A validation errors:', trackAValidation.errors);
    process.exit(1);
  }
  
  const trackAPath = path.join(DATA_DIR, 'track-a-performing.packet.json');
  fs.writeFileSync(trackAPath, JSON.stringify(trackAPacket, null, 2));
  console.log(`Created: ${trackAPath}`);
  console.log(`  Packet ID: ${trackAPacket.packetId}`);
  console.log(`  Property: ${trackAPacket.propertyAddress}`);
  console.log(`  UPB: $${trackAPacket.unpaidPrincipalBalance.toLocaleString()}`);
  console.log(`  Status: ${trackAPacket.status}`);
  console.log();
  
  console.log('--- Creating Track B (Light NPL) Packet ---');
  const trackBPacket = createTrackBPacket();
  const trackBValidation = validatePacketSchema(trackBPacket);
  
  if (!trackBValidation.valid) {
    console.error('Track B validation errors:', trackBValidation.errors);
    process.exit(1);
  }
  
  const trackBPath = path.join(DATA_DIR, 'track-b-light-npl.packet.json');
  fs.writeFileSync(trackBPath, JSON.stringify(trackBPacket, null, 2));
  console.log(`Created: ${trackBPath}`);
  console.log(`  Packet ID: ${trackBPacket.packetId}`);
  console.log(`  Property: ${trackBPacket.propertyAddress}`);
  console.log(`  UPB: $${trackBPacket.unpaidPrincipalBalance.toLocaleString()}`);
  console.log(`  Missed Payments: ${trackBPacket.delinquencyStatus?.missedPaymentCount}`);
  console.log(`  Status: ${trackBPacket.status}`);
  console.log();
  
  console.log('='.repeat(60));
  console.log('PACKET CREATION COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('Next Steps:');
  console.log('  1. Replace PLACEHOLDER_CID and PLACEHOLDER_HASH values with real artifact references');
  console.log('  2. Run: npx ts-node scripts/property-packet/finalize-underwriting.ts');
  console.log('  3. Run: npx ts-node scripts/property-packet/draft-participation-clauses.ts');
  console.log('  4. Run: npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts');
  console.log();
  console.log('Or run the full flow:');
  console.log('  npx ts-node scripts/property-packet/run-full-packet-flow.ts');
}

main().catch(console.error);
