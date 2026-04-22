import * as crypto from 'crypto';

export interface DecisionChecksumInput {
  setupId: string;
  snapshotId: string | null;
  currentPrice: number;
  signalZ: number;
  volatilityEstimate: number;
  liquidityTier: string;
  regimeTier: string;
  grade: string;
  riskFractionBps: number;
  positionSizeQty: number;
  stopPrice: number;
  takeProfitP50: number;
  takeProfitP95: number;
  policyMode: string;
  direction: string;
}

export function computeDecisionChecksum(fields: DecisionChecksumInput): string {
  const payload = [
    fields.setupId,
    fields.snapshotId ?? '',
    String(fields.currentPrice),
    String(fields.signalZ),
    String(fields.volatilityEstimate),
    fields.liquidityTier,
    fields.regimeTier,
    fields.grade,
    String(fields.riskFractionBps),
    String(fields.positionSizeQty),
    String(fields.stopPrice),
    String(fields.takeProfitP50),
    String(fields.takeProfitP95),
    fields.policyMode,
    fields.direction,
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function computeRunChecksum(runId: string, decisionChecksums: string[]): string {
  const payload = runId + decisionChecksums.join('');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function computeEventChecksum(
  eventType: string,
  setupId: string,
  eventData: object,
  timestamp: string
): string {
  const payload = [
    eventType,
    setupId,
    JSON.stringify(eventData),
    timestamp,
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}
