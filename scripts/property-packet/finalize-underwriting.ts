#!/usr/bin/env npx ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data', 'property-packets');

interface UnderwritingOutput {
  purchasePrice: number;
  participationAmount: number;
  impliedYieldRange: string;
  collateralValueEstimate: number;
  collateralConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  ltvProxy: number;
  dscrProxy: number | null;
  recoveryEstimate?: string;
  workoutProbability?: string;
  timelineMonths?: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReasonCodes: string[];
  underwritingHash: string;
  finalizedAt: string;
  finalizedBy: string;
  inputs: Record<string, unknown>;
  assumptions: Record<string, unknown>;
}

function computeUnderwritingHash(data: Record<string, unknown>): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data, Object.keys(data).sort()));
  return `sha256:${hash.digest('hex')}`;
}

function underwriteTrackA(packet: Record<string, unknown>): UnderwritingOutput {
  const upb = packet.unpaidPrincipalBalance as number;
  const propertyValue = (packet.propertyValue as number) || upb * 1.15;
  const interestRate = packet.interestRate as number;
  const monthlyPayment = packet.monthlyPayment as number;
  const paymentHistoryMonths = (packet.paymentHistoryMonths as number) || 0;
  
  const purchasePrice = Math.round(upb * 0.92 * 100) / 100;
  const participationAmount = Math.round(purchasePrice * 0.30 * 100) / 100;
  
  const annualCashflow = monthlyPayment * 12;
  const conservativeYieldLow = ((annualCashflow * 0.85) / purchasePrice) * 100;
  const conservativeYieldHigh = ((annualCashflow * 0.95) / purchasePrice) * 100;
  
  const ltvProxy = Math.round((upb / propertyValue) * 1000) / 10;
  
  const riskReasonCodes: string[] = [];
  let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  
  if (ltvProxy > 90) {
    riskReasonCodes.push('LTV_ELEVATED');
    riskTier = 'MEDIUM';
  }
  
  if (paymentHistoryMonths < 12) {
    riskReasonCodes.push('SHORT_PAYMENT_HISTORY');
    if (riskTier === 'LOW') riskTier = 'MEDIUM';
  }
  
  let collateralConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  if (!packet.propertyValue) {
    collateralConfidence = 'MEDIUM';
    riskReasonCodes.push('VALUATION_UNCERTAIN');
  }
  
  const inputs = {
    upb,
    interestRate,
    monthlyPayment,
    propertyValue,
    paymentHistoryMonths
  };
  
  const assumptions = {
    purchaseDiscount: 0.08,
    participationRatio: 0.30,
    cashflowHaircut: 0.05,
    vacancyRate: 0,
    managementFee: 0
  };
  
  const underwritingData = { inputs, assumptions, purchasePrice, participationAmount };
  
  return {
    purchasePrice,
    participationAmount,
    impliedYieldRange: `${conservativeYieldLow.toFixed(1)}% - ${conservativeYieldHigh.toFixed(1)}%`,
    collateralValueEstimate: propertyValue,
    collateralConfidence,
    ltvProxy,
    dscrProxy: null,
    riskTier,
    riskReasonCodes,
    underwritingHash: computeUnderwritingHash(underwritingData),
    finalizedAt: new Date().toISOString(),
    finalizedBy: '0x0000000000000000000000000000000000000000',
    inputs,
    assumptions
  };
}

function underwriteTrackB(packet: Record<string, unknown>): UnderwritingOutput {
  const upb = packet.unpaidPrincipalBalance as number;
  const propertyValue = (packet.propertyValue as number) || upb * 1.10;
  const interestRate = packet.interestRate as number;
  const monthlyPayment = packet.monthlyPayment as number;
  const delinquencyStatus = packet.delinquencyStatus as Record<string, unknown>;
  const missedPayments = (delinquencyStatus?.missedPaymentCount as number) || 0;
  const totalPastDue = (delinquencyStatus?.totalAmountPastDue as number) || 0;
  const borrowerContactStatus = packet.borrowerContactStatus as string;
  
  const nplDiscount = 0.25 + (missedPayments * 0.03);
  const purchasePrice = Math.round(upb * (1 - nplDiscount) * 100) / 100;
  const participationAmount = Math.round(purchasePrice * 0.25 * 100) / 100;
  
  const recoveryLow = Math.round(purchasePrice * 0.80);
  const recoveryHigh = Math.round(purchasePrice * 1.35);
  
  const yieldLow = 12.5;
  const yieldHigh = 18.0;
  
  const ltvProxy = Math.round((upb / propertyValue) * 1000) / 10;
  
  const riskReasonCodes: string[] = ['DELINQUENT', 'WORKOUT_REQUIRED'];
  let riskTier: 'HIGH' | 'MEDIUM' = 'MEDIUM';
  
  if (missedPayments >= 6) {
    riskTier = 'HIGH';
  }
  
  if (borrowerContactStatus === 'UNRESPONSIVE') {
    riskReasonCodes.push('BORROWER_UNRESPONSIVE');
    riskTier = 'HIGH';
  }
  
  if (ltvProxy > 100) {
    riskReasonCodes.push('LTV_UNDERWATER');
    riskTier = 'HIGH';
  }
  
  const propertyOccupancy = packet.propertyOccupancy as string;
  if (propertyOccupancy === 'VACANT') {
    riskReasonCodes.push('PROPERTY_VACANT');
  }
  
  let collateralConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (!packet.propertyValue) {
    collateralConfidence = 'LOW';
    riskReasonCodes.push('VALUATION_UNCERTAIN');
  }
  
  let workoutProbability = '65%';
  if (borrowerContactStatus === 'RESPONSIVE') {
    workoutProbability = '75%';
  } else if (borrowerContactStatus === 'UNRESPONSIVE') {
    workoutProbability = '35%';
  }
  
  let timelineMonths = '6-12 months';
  if (missedPayments >= 6) {
    timelineMonths = '12-18 months';
  }
  
  const inputs = {
    upb,
    interestRate,
    monthlyPayment,
    propertyValue,
    missedPayments,
    totalPastDue,
    borrowerContactStatus
  };
  
  const assumptions = {
    baseNplDiscount: 0.25,
    perMissedPaymentDiscount: 0.03,
    participationRatio: 0.25,
    workoutCosts: 5000,
    legalCosts: 3000,
    timelineBuffer: 3
  };
  
  const underwritingData = { inputs, assumptions, purchasePrice, participationAmount };
  
  return {
    purchasePrice,
    participationAmount,
    impliedYieldRange: `${yieldLow.toFixed(1)}% - ${yieldHigh.toFixed(1)}%`,
    collateralValueEstimate: propertyValue,
    collateralConfidence,
    ltvProxy,
    dscrProxy: null,
    recoveryEstimate: `$${recoveryLow.toLocaleString()} - $${recoveryHigh.toLocaleString()}`,
    workoutProbability,
    timelineMonths,
    riskTier,
    riskReasonCodes,
    underwritingHash: computeUnderwritingHash(underwritingData),
    finalizedAt: new Date().toISOString(),
    finalizedBy: '0x0000000000000000000000000000000000000000',
    inputs,
    assumptions
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('UNDERWRITING FINALIZATION');
  console.log('='.repeat(60));
  console.log();
  
  const trackAPath = path.join(DATA_DIR, 'track-a-performing.packet.json');
  const trackBPath = path.join(DATA_DIR, 'track-b-light-npl.packet.json');
  
  if (!fs.existsSync(trackAPath)) {
    console.error(`Track A packet not found: ${trackAPath}`);
    console.error('Run create-packets.ts first');
    process.exit(1);
  }
  
  if (!fs.existsSync(trackBPath)) {
    console.error(`Track B packet not found: ${trackBPath}`);
    console.error('Run create-packets.ts first');
    process.exit(1);
  }
  
  console.log('--- Underwriting Track A (Performing) ---');
  const trackAPacket = JSON.parse(fs.readFileSync(trackAPath, 'utf-8'));
  const trackAUnderwriting = underwriteTrackA(trackAPacket);
  
  trackAPacket.underwriting = trackAUnderwriting;
  trackAPacket.status = 'UNDERWRITING';
  
  fs.writeFileSync(trackAPath, JSON.stringify(trackAPacket, null, 2));
  console.log(`Updated: ${trackAPath}`);
  console.log(`  Purchase Price: $${trackAUnderwriting.purchasePrice.toLocaleString()}`);
  console.log(`  Participation: $${trackAUnderwriting.participationAmount.toLocaleString()}`);
  console.log(`  Yield Range: ${trackAUnderwriting.impliedYieldRange}`);
  console.log(`  LTV: ${trackAUnderwriting.ltvProxy}%`);
  console.log(`  Risk Tier: ${trackAUnderwriting.riskTier}`);
  console.log(`  Risk Codes: ${trackAUnderwriting.riskReasonCodes.join(', ') || 'None'}`);
  console.log(`  Hash: ${trackAUnderwriting.underwritingHash.substring(0, 30)}...`);
  console.log();
  
  console.log('--- Underwriting Track B (Light NPL) ---');
  const trackBPacket = JSON.parse(fs.readFileSync(trackBPath, 'utf-8'));
  const trackBUnderwriting = underwriteTrackB(trackBPacket);
  
  trackBPacket.underwriting = trackBUnderwriting;
  trackBPacket.status = 'UNDERWRITING';
  
  fs.writeFileSync(trackBPath, JSON.stringify(trackBPacket, null, 2));
  console.log(`Updated: ${trackBPath}`);
  console.log(`  Purchase Price: $${trackBUnderwriting.purchasePrice.toLocaleString()}`);
  console.log(`  Participation: $${trackBUnderwriting.participationAmount.toLocaleString()}`);
  console.log(`  Yield Range: ${trackBUnderwriting.impliedYieldRange}`);
  console.log(`  Recovery Estimate: ${trackBUnderwriting.recoveryEstimate}`);
  console.log(`  Workout Probability: ${trackBUnderwriting.workoutProbability}`);
  console.log(`  Timeline: ${trackBUnderwriting.timelineMonths}`);
  console.log(`  LTV: ${trackBUnderwriting.ltvProxy}%`);
  console.log(`  Risk Tier: ${trackBUnderwriting.riskTier}`);
  console.log(`  Risk Codes: ${trackBUnderwriting.riskReasonCodes.join(', ')}`);
  console.log(`  Hash: ${trackBUnderwriting.underwritingHash.substring(0, 30)}...`);
  console.log();
  
  console.log('='.repeat(60));
  console.log('UNDERWRITING COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('Next Steps:');
  console.log('  Run: npx ts-node scripts/property-packet/draft-participation-clauses.ts');
}

main().catch(console.error);
