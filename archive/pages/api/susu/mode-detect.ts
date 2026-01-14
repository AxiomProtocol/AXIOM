import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface ModeDetectionParams {
  contributionAmount: number;
  memberCount: number;
  cycleLengthDays: number;
  purposeCategoryId?: number;
}

interface RiskFactor {
  factor: string;
  value: number;
  threshold: number;
  breached: boolean;
  weight: number;
}

interface ModeDetectionResult {
  mode: 'community' | 'capital';
  riskScore: number;
  totalPotEstimate: number;
  riskFactors: RiskFactor[];
  capitalModeTriggered: boolean;
  triggerReasons: string[];
}

async function getThresholds(): Promise<Record<string, number>> {
  const { rows } = await pool.query(`
    SELECT threshold_key, threshold_value FROM susu_mode_thresholds
  `);
  return rows.reduce((acc, row) => {
    acc[row.threshold_key] = parseFloat(row.threshold_value);
    return acc;
  }, {} as Record<string, number>);
}

async function getPurposeMultiplier(categoryId: number): Promise<number> {
  const { rows } = await pool.query(`
    SELECT multiplier FROM susu_purpose_category_multipliers
    WHERE purpose_category_id = $1
  `, [categoryId]);
  return rows.length > 0 ? parseFloat(rows[0].multiplier) : 1.0;
}

async function detectMode(params: ModeDetectionParams): Promise<ModeDetectionResult> {
  const thresholds = await getThresholds();
  const purposeMultiplier = params.purposeCategoryId 
    ? await getPurposeMultiplier(params.purposeCategoryId) 
    : 1.0;

  const totalPotEstimate = params.contributionAmount * params.memberCount;
  
  const riskFactors: RiskFactor[] = [];
  const triggerReasons: string[] = [];

  const contributionThreshold = thresholds.contribution_amount_usd || 1000;
  const contributionBreached = params.contributionAmount > contributionThreshold;
  riskFactors.push({
    factor: 'contribution_amount',
    value: params.contributionAmount,
    threshold: contributionThreshold,
    breached: contributionBreached,
    weight: 30
  });
  if (contributionBreached) {
    triggerReasons.push(`Contribution amount ($${params.contributionAmount}) exceeds threshold ($${contributionThreshold})`);
  }

  const potThreshold = thresholds.total_pot_estimate_usd || 10000;
  const potBreached = totalPotEstimate > potThreshold;
  riskFactors.push({
    factor: 'total_pot_estimate',
    value: totalPotEstimate,
    threshold: potThreshold,
    breached: potBreached,
    weight: 35
  });
  if (potBreached) {
    triggerReasons.push(`Total pot estimate ($${totalPotEstimate}) exceeds threshold ($${potThreshold})`);
  }

  const groupSizeThreshold = thresholds.group_size || 20;
  const groupSizeBreached = params.memberCount > groupSizeThreshold;
  riskFactors.push({
    factor: 'group_size',
    value: params.memberCount,
    threshold: groupSizeThreshold,
    breached: groupSizeBreached,
    weight: 15
  });
  if (groupSizeBreached) {
    triggerReasons.push(`Group size (${params.memberCount}) exceeds threshold (${groupSizeThreshold})`);
  }

  const cycleLengthThreshold = thresholds.cycle_length_days || 90;
  const cycleLengthBreached = params.cycleLengthDays > cycleLengthThreshold;
  riskFactors.push({
    factor: 'cycle_length_days',
    value: params.cycleLengthDays,
    threshold: cycleLengthThreshold,
    breached: cycleLengthBreached,
    weight: 20
  });
  if (cycleLengthBreached) {
    triggerReasons.push(`Cycle length (${params.cycleLengthDays} days) exceeds threshold (${cycleLengthThreshold} days)`);
  }

  let riskScore = 0;
  for (const factor of riskFactors) {
    if (factor.breached) {
      const ratio = Math.min(factor.value / factor.threshold, 2);
      riskScore += factor.weight * ratio;
    } else {
      const ratio = factor.value / factor.threshold;
      riskScore += factor.weight * ratio * 0.5;
    }
  }

  riskScore = riskScore * purposeMultiplier;
  riskScore = Math.min(Math.round(riskScore), 100);

  const riskScoreThreshold = thresholds.risk_score_max || 75;
  const capitalModeTriggered = triggerReasons.length > 0 || riskScore > riskScoreThreshold;

  if (riskScore > riskScoreThreshold && !triggerReasons.some(r => r.includes('Risk score'))) {
    triggerReasons.push(`Overall risk score (${riskScore}) exceeds threshold (${riskScoreThreshold})`);
  }

  return {
    mode: capitalModeTriggered ? 'capital' : 'community',
    riskScore,
    totalPotEstimate,
    riskFactors,
    capitalModeTriggered,
    triggerReasons
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contributionAmount, memberCount, cycleLengthDays, purposeCategoryId } = req.body;

    if (!contributionAmount || !memberCount || !cycleLengthDays) {
      return res.status(400).json({ 
        error: 'Missing required fields: contributionAmount, memberCount, cycleLengthDays' 
      });
    }

    const numContribution = parseFloat(contributionAmount);
    const numMembers = parseInt(memberCount);
    const numCycleDays = parseInt(cycleLengthDays);

    if (isNaN(numContribution) || isNaN(numMembers) || isNaN(numCycleDays)) {
      return res.status(400).json({ error: 'Invalid numeric values' });
    }

    if (numContribution <= 0 || numMembers < 2 || numCycleDays <= 0) {
      return res.status(400).json({ error: 'Values must be positive (members >= 2)' });
    }

    const result = await detectMode({
      contributionAmount: numContribution,
      memberCount: numMembers,
      cycleLengthDays: numCycleDays,
      purposeCategoryId: purposeCategoryId ? parseInt(purposeCategoryId) : undefined
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error detecting SUSU mode:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to detect mode' });
  }
}

export { detectMode, getThresholds, getPurposeMultiplier };
