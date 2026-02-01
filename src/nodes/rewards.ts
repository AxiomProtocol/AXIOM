import { randomBytes } from 'crypto';
import {
  NodeRewardsLedger,
  RewardEntry,
  PayoutRecord,
  Milestone,
  OperatorRole,
  NodeConfig,
  MILESTONE_VALUES,
  ROLE_SHARES,
} from './types';

export function generateEntryId(): string {
  return `RWD-${randomBytes(4).toString('hex')}`;
}

export function generatePayoutId(): string {
  return `PAY-${randomBytes(4).toString('hex')}`;
}

export function createRewardsLedger(operatorId: string): NodeRewardsLedger {
  return {
    operatorId,
    usdAccrued: 0,
    usdPaid: 0,
    usdPending: 0,
    conversionBucket: 0,
    slashedAmount: 0,
    clawedBackAmount: 0,
    entries: [],
    payouts: [],
  };
}

export function calculateMilestoneReward(
  milestone: Milestone,
  role: OperatorRole
): { usdAmount: number; sharePercent: number; baseMilestoneValue: number } {
  const baseMilestoneValue = MILESTONE_VALUES[milestone];
  const sharePercent = ROLE_SHARES[role][milestone] * 100;
  const usdAmount = baseMilestoneValue * ROLE_SHARES[role][milestone];
  
  return { usdAmount, sharePercent, baseMilestoneValue };
}

export function accrueReward(
  ledger: NodeRewardsLedger,
  params: {
    packetId: string;
    milestone: Milestone;
    role: OperatorRole;
    deferToConversion?: boolean;
  }
): { ledger: NodeRewardsLedger; entry: RewardEntry } {
  const { packetId, milestone, role, deferToConversion = false } = params;
  const { usdAmount, sharePercent, baseMilestoneValue } = calculateMilestoneReward(milestone, role);

  if (usdAmount === 0) {
    throw new Error(`Role ${role} is not eligible for milestone ${milestone}`);
  }

  const entry: RewardEntry = {
    entryId: generateEntryId(),
    packetId,
    milestone,
    role,
    usdAmount,
    sharePercent,
    baseMilestoneValue,
    timestamp: new Date().toISOString(),
    settled: false,
    deferredToConversion: deferToConversion,
    slashed: false,
  };

  const updatedLedger: NodeRewardsLedger = {
    ...ledger,
    usdAccrued: ledger.usdAccrued + usdAmount,
    usdPending: deferToConversion ? ledger.usdPending : ledger.usdPending + usdAmount,
    conversionBucket: deferToConversion ? ledger.conversionBucket + usdAmount : ledger.conversionBucket,
    lastAccrualAt: entry.timestamp,
    entries: [...ledger.entries, entry],
  };

  return { ledger: updatedLedger, entry };
}

export function calculatePayoutPreview(
  ledger: NodeRewardsLedger,
  config: NodeConfig
): {
  usdAmount: number;
  axiomAmount: number;
  rateUsed: number;
  conversionBucketBalance: number;
} {
  const usdAmount = ledger.usdPending;
  const axiomAmount = usdAmount / config.postedAxiomUsdRate;
  
  return {
    usdAmount,
    axiomAmount,
    rateUsed: config.postedAxiomUsdRate,
    conversionBucketBalance: ledger.conversionBucket,
  };
}

export function recordPayout(
  ledger: NodeRewardsLedger,
  config: NodeConfig,
  partialAmount?: number
): { ledger: NodeRewardsLedger; payout: PayoutRecord } {
  const usdAmount = partialAmount !== undefined 
    ? Math.min(partialAmount, ledger.usdPending)
    : ledger.usdPending;

  if (usdAmount < config.payoutThresholdUsd && !partialAmount) {
    throw new Error(
      `Pending amount $${usdAmount.toFixed(2)} is below threshold $${config.payoutThresholdUsd}`
    );
  }

  const axiomAmount = usdAmount / config.postedAxiomUsdRate;

  const payout: PayoutRecord = {
    payoutId: generatePayoutId(),
    usdAmount,
    axiomAmount,
    rateUsed: config.postedAxiomUsdRate,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
  };

  const settledEntryIds = new Set<string>();
  let remainingToSettle = usdAmount;

  const updatedEntries = ledger.entries.map(entry => {
    if (!entry.settled && !entry.deferredToConversion && remainingToSettle > 0) {
      if (entry.usdAmount <= remainingToSettle) {
        remainingToSettle -= entry.usdAmount;
        settledEntryIds.add(entry.entryId);
        return { ...entry, settled: true };
      }
    }
    return entry;
  });

  const updatedLedger: NodeRewardsLedger = {
    ...ledger,
    usdPaid: ledger.usdPaid + usdAmount,
    usdPending: ledger.usdPending - usdAmount,
    lastPayoutAt: payout.timestamp,
    entries: updatedEntries,
    payouts: [...ledger.payouts, payout],
  };

  return { ledger: updatedLedger, payout };
}

export function slashRewards(
  ledger: NodeRewardsLedger,
  slashPercent: number,
  reason: string
): { ledger: NodeRewardsLedger; slashedAmount: number } {
  const slashAmount = ledger.usdPending * (slashPercent / 100);
  
  const updatedEntries = ledger.entries.map(entry => {
    if (!entry.settled && !entry.slashed) {
      return {
        ...entry,
        slashed: true,
        slashReason: reason,
      };
    }
    return entry;
  });

  const updatedLedger: NodeRewardsLedger = {
    ...ledger,
    usdPending: ledger.usdPending - slashAmount,
    slashedAmount: ledger.slashedAmount + slashAmount,
    entries: updatedEntries,
  };

  return { ledger: updatedLedger, slashedAmount: slashAmount };
}

export function clawbackRewards(
  ledger: NodeRewardsLedger,
  amount: number,
  reason: string
): NodeRewardsLedger {
  const clawbackAmount = Math.min(amount, ledger.usdPending);
  
  return {
    ...ledger,
    usdPending: ledger.usdPending - clawbackAmount,
    clawedBackAmount: ledger.clawedBackAmount + clawbackAmount,
  };
}

export function getMilestoneEligibility(role: OperatorRole): Milestone[] {
  return Object.entries(ROLE_SHARES[role])
    .filter(([_, share]) => share > 0)
    .map(([milestone]) => milestone as Milestone);
}

export function getEarningsBreakdown(ledger: NodeRewardsLedger): {
  byMilestone: Record<Milestone, number>;
  byPacket: Record<string, number>;
  total: number;
} {
  const byMilestone: Record<string, number> = {};
  const byPacket: Record<string, number> = {};

  for (const entry of ledger.entries) {
    if (!entry.slashed) {
      byMilestone[entry.milestone] = (byMilestone[entry.milestone] || 0) + entry.usdAmount;
      byPacket[entry.packetId] = (byPacket[entry.packetId] || 0) + entry.usdAmount;
    }
  }

  return {
    byMilestone: byMilestone as Record<Milestone, number>,
    byPacket,
    total: ledger.usdAccrued - ledger.slashedAmount - ledger.clawedBackAmount,
  };
}

export function aggregateLedgers(ledgers: NodeRewardsLedger[]): {
  totalAccrued: number;
  totalPaid: number;
  totalPending: number;
  totalSlashed: number;
  operatorCount: number;
} {
  return {
    totalAccrued: ledgers.reduce((sum, l) => sum + l.usdAccrued, 0),
    totalPaid: ledgers.reduce((sum, l) => sum + l.usdPaid, 0),
    totalPending: ledgers.reduce((sum, l) => sum + l.usdPending, 0),
    totalSlashed: ledgers.reduce((sum, l) => sum + l.slashedAmount, 0),
    operatorCount: ledgers.length,
  };
}
