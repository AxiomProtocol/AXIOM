/**
 * Axiom Protocol — Commodity Risk Scoring Engine
 *
 * Pure, deterministic scoring engine for commodity reserve instrument
 * candidates. Implements Section 10 of the Commodity Expansion Framework
 * (documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md, v1.0.0).
 *
 * Five dimensions (each scored 1-5):
 *   - oracleRisk
 *   - custodyRisk
 *   - liquidityRisk
 *   - reserveRisk
 *   - regulatoryRisk
 *
 * Composite range: 5-25 (unweighted sum). Default weighting is equal
 * (1.0x per dimension). Governance-approved per-dimension multipliers
 * may be supplied; the band determination uses the unweighted composite
 * per Section 10.1, with a separate weightedComposite computed for
 * reference.
 *
 * Score bands (Section 10.2):
 *   5-10  APPROVED     — may proceed to Stage 3 (Governance Vote)
 *   11-16 CONDITIONAL  — proceed with documented remediation plan
 *   17-21 DEFERRED     — workflow terminates at Stage 2
 *   22-25 REJECTED     — structurally incompatible
 *
 * NOTE: This is an advisory operator tool. A scoring result does NOT
 * approve or reject a candidate. Approval requires a completed
 * governance vote and a passing launch readiness gate (Section 11).
 */

export const FRAMEWORK_NAME = 'Commodity Expansion Framework';
export const FRAMEWORK_VERSION = '1.0.0';
export const FRAMEWORK_PATH = 'documents/commodities/COMMODITY_EXPANSION_FRAMEWORK.md';

export const ADVISORY_DISCLAIMER =
  'Scoring result is advisory and does not replace governance vote.';

export type DimensionScore = 1 | 2 | 3 | 4 | 5;

export type DimensionKey =
  | 'oracleRisk'
  | 'custodyRisk'
  | 'liquidityRisk'
  | 'reserveRisk'
  | 'regulatoryRisk';

export type ApprovalBand = 'APPROVED' | 'CONDITIONAL' | 'DEFERRED' | 'REJECTED';

export interface DimensionMultipliers {
  oracleRisk?: number;
  custodyRisk?: number;
  liquidityRisk?: number;
  reserveRisk?: number;
  regulatoryRisk?: number;
}

export interface ScoreInput {
  candidateName: string;
  oracleRisk: number;
  custodyRisk: number;
  liquidityRisk: number;
  reserveRisk: number;
  regulatoryRisk: number;
  multipliers?: DimensionMultipliers;
  notes?: string;
}

export interface DimensionResult {
  key: DimensionKey;
  label: string;
  score: DimensionScore;
  multiplier: number;
  weighted: number;
  criteria: string;
}

export interface ScoreResult {
  candidateName: string;
  evaluatedAt: string;
  dimensions: Record<DimensionKey, DimensionResult>;
  composite: number;
  weightedComposite: number;
  band: ApprovalBand;
  bandDescription: string;
  bandOutcome: string;
  remediationNotes: string[];
  launchGateWarnings: string[];
  notes: string | null;
  advisory: string;
  source: {
    framework: string;
    version: string;
    path: string;
  };
}

// ---------------------------------------------------------------------------
// Dimension criteria (verbatim from Section 10.3 - 10.7)
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  oracleRisk: 'Oracle Risk',
  custodyRisk: 'Custody Risk',
  liquidityRisk: 'Liquidity Risk',
  reserveRisk: 'Reserve Risk',
  regulatoryRisk: 'Regulatory Risk',
};

const DIMENSION_CRITERIA: Record<DimensionKey, Record<DimensionScore, string>> = {
  oracleRisk: {
    1: 'Production Chainlink feed on Arbitrum One with 2+ years of history, sub-24h heartbeat, sub-0.5% deviation threshold',
    2: 'Production Chainlink feed with 12-24 months of history, or heartbeat 24-48h',
    3: 'Production Chainlink feed with less than 12 months of history, or deviation threshold above 0.5%',
    4: 'No Chainlink feed; relies on Tier 2 oracle (API3, Pyth, UMA) with limited on-chain history',
    5: 'No production on-chain oracle exists; price must be derived from off-chain data with no cryptographic attestation',
  },
  custodyRisk: {
    1: 'Regulated qualified custodian issuing a directly redeemable on-chain receipt token (AXAU pattern: Paxos / PAXG)',
    2: 'Regulated custodian with segregated account and quarterly proof-of-reserves, but no directly redeemable on-chain receipt token',
    3: 'Exchange-grade multi-party authorization arrangement with independent audit, no regulated custodian',
    4: 'Self-custody multi-party authorization with no third-party audit or insurance',
    5: 'Single-key self-custody, commingled custody, or custodian under regulatory enforcement',
  },
  liquidityRisk: {
    1: 'Reserve asset has deep spot market (daily volume greater than $100M), instant on-chain redemption, and a functioning AMM pool on the target network',
    2: 'Reserve asset has liquid spot market (daily volume $10M - $100M) and on-chain redemption path, but limited AMM depth',
    3: 'Reserve asset has moderate spot market (daily volume $1M - $10M) or redemption requires T+1 settlement',
    4: 'Reserve asset has thin spot market (daily volume below $1M) or redemption latency exceeds 24 hours',
    5: 'Reserve asset has no liquid secondary market or redemption is not possible without a fiat intermediary',
  },
  reserveRisk: {
    1: 'Physical commodity with multi-century track record of value preservation; non-perishable; fungible; LBMA or equivalent accreditation',
    2: 'Physical commodity with strong value history (50+ years); non-perishable; warehouse-receipt backed with independent certification',
    3: 'Physical commodity with moderate volatility or perishability risk; warehouse-receipt backed but certification less established',
    4: 'Commodity with high volatility (greater than 40% annualized) or significant perishability / storage cost risk',
    5: 'Synthetic or derivative exposure to a commodity rather than direct physical backing; algorithmic reserve; uncollateralized exposure',
  },
  regulatoryRisk: {
    1: 'Commodity instrument with clear regulatory precedent; reserve asset is a regulated product (e.g., LBMA gold, CFTC-regulated commodity); legal opinion in hand',
    2: 'Commodity instrument with strong regulatory analogy; reserve asset is a recognized commodity; legal review in progress',
    3: 'Commodity instrument in a developing regulatory environment; legal opinion not yet complete; no enforcement precedent',
    4: 'Commodity instrument with significant legal uncertainty; reserve asset regulatory status is contested; no legal opinion',
    5: 'Instrument involves prohibited or highly regulated underlying (privacy coins, unregistered securities, synthetic derivatives with no physical backing)',
  },
};

// Maps each dimension to the launch readiness gate it most directly affects
// (Section 11.1 hard blockers / 11.2 soft gates).
const DIMENSION_TO_GATE: Record<DimensionKey, string> = {
  oracleRisk: 'HB-01 (oracle freshness, isStale must be false)',
  custodyRisk: 'HB-04 (custody attestation within 30 days of launch)',
  liquidityRisk: 'HB-05 (liquidity engine deployed and validated)',
  reserveRisk: 'HB-03 (coverage ratio >= 105%)',
  regulatoryRisk: 'HB-10 (deferred rails disclaimer published)',
};

const BAND_OUTCOME: Record<ApprovalBand, string> = {
  APPROVED: 'May proceed to Stage 3 (Governance Vote)',
  CONDITIONAL:
    'May proceed to Stage 3 with a documented remediation plan addressing each dimension scoring 3 or above',
  DEFERRED: 'Workflow terminates at Stage 2; candidate must be substantially revised',
  REJECTED:
    'Structurally incompatible with this framework; see Section 12 (Deferred and Prohibited Commodity Types)',
};

const BAND_DESCRIPTION: Record<ApprovalBand, string> = {
  APPROVED: 'Composite 5-10 — APPROVED band',
  CONDITIONAL: 'Composite 11-16 — CONDITIONAL band',
  DEFERRED: 'Composite 17-21 — DEFERRED band',
  REJECTED: 'Composite 22-25 — REJECTED band',
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class ScoreInputError extends Error {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'ScoreInputError';
    this.field = field;
  }
}

const DIMENSION_KEYS: DimensionKey[] = [
  'oracleRisk',
  'custodyRisk',
  'liquidityRisk',
  'reserveRisk',
  'regulatoryRisk',
];

function assertDimensionScore(field: string, value: unknown): DimensionScore {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ScoreInputError(field, `${field} must be a number between 1 and 5`);
  }
  if (!Number.isInteger(value)) {
    throw new ScoreInputError(field, `${field} must be an integer (got ${value})`);
  }
  if (value < 1 || value > 5) {
    throw new ScoreInputError(field, `${field} must be between 1 and 5 (got ${value})`);
  }
  return value as DimensionScore;
}

function assertMultiplier(field: string, value: unknown): number {
  if (value === undefined || value === null) return 1;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ScoreInputError(field, `${field} must be a finite number`);
  }
  if (value <= 0 || value > 5) {
    throw new ScoreInputError(
      field,
      `${field} must be greater than 0 and at most 5 (got ${value})`,
    );
  }
  return value;
}

export function bandFor(composite: number): ApprovalBand {
  if (!Number.isFinite(composite)) {
    throw new Error('composite must be a finite number');
  }
  if (composite < 5 || composite > 25) {
    throw new Error(`composite must be in [5, 25] (got ${composite})`);
  }
  if (composite <= 10) return 'APPROVED';
  if (composite <= 16) return 'CONDITIONAL';
  if (composite <= 21) return 'DEFERRED';
  return 'REJECTED';
}

// ---------------------------------------------------------------------------
// Remediation + launch gate notes
// ---------------------------------------------------------------------------

function buildRemediationNotes(
  dimensions: Record<DimensionKey, DimensionResult>,
  band: ApprovalBand,
): string[] {
  const notes: string[] = [];

  for (const key of DIMENSION_KEYS) {
    const dim = dimensions[key];
    if (dim.score >= 3) {
      const severity =
        dim.score === 5
          ? 'critical'
          : dim.score === 4
          ? 'significant'
          : 'remediation required';
      notes.push(
        `${dim.label} score ${dim.score} (${severity}): ${dim.criteria}`,
      );
    }
  }

  if (band === 'CONDITIONAL' && notes.length > 0) {
    notes.push(
      'CONDITIONAL band requires a documented remediation plan for each dimension scoring 3 or above before Stage 3 governance vote.',
    );
  }

  if (band === 'DEFERRED') {
    notes.push(
      'DEFERRED band: workflow terminates at Stage 2. Candidate must be substantially revised before re-submission.',
    );
  }

  if (band === 'REJECTED') {
    notes.push(
      'REJECTED band: candidate is structurally incompatible. Review Section 12 (Deferred and Prohibited Commodity Types) before considering re-submission.',
    );
  }

  return notes;
}

function buildLaunchGateWarnings(
  dimensions: Record<DimensionKey, DimensionResult>,
  band: ApprovalBand,
): string[] {
  const warnings: string[] = [];

  // Any dimension scoring 4 or 5 implies the corresponding hard blocker
  // is not currently passable without explicit remediation.
  for (const key of DIMENSION_KEYS) {
    const dim = dimensions[key];
    if (dim.score >= 4) {
      warnings.push(
        `${dim.label} score ${dim.score} implies ${DIMENSION_TO_GATE[key]} cannot pass without explicit remediation.`,
      );
    }
  }

  if (band === 'DEFERRED' || band === 'REJECTED') {
    warnings.push(
      'Launch readiness gate (Section 11) cannot be initiated for a candidate in the ' +
        band +
        ' band.',
    );
  }

  if (band === 'CONDITIONAL') {
    warnings.push(
      'Launch readiness gate must be re-run in full after each remediation item is closed (Section 11.3).',
    );
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function validateScoreInput(input: unknown): ScoreInput {
  if (!input || typeof input !== 'object') {
    throw new ScoreInputError('input', 'Request body must be a JSON object');
  }
  const obj = input as Record<string, unknown>;

  const candidateName = obj.candidateName;
  if (typeof candidateName !== 'string' || !candidateName.trim()) {
    throw new ScoreInputError('candidateName', 'candidateName is required');
  }
  if (candidateName.length > 200) {
    throw new ScoreInputError(
      'candidateName',
      'candidateName must be 200 characters or fewer',
    );
  }

  const dims: Record<DimensionKey, DimensionScore> = {
    oracleRisk: assertDimensionScore('oracleRisk', obj.oracleRisk),
    custodyRisk: assertDimensionScore('custodyRisk', obj.custodyRisk),
    liquidityRisk: assertDimensionScore('liquidityRisk', obj.liquidityRisk),
    reserveRisk: assertDimensionScore('reserveRisk', obj.reserveRisk),
    regulatoryRisk: assertDimensionScore('regulatoryRisk', obj.regulatoryRisk),
  };

  let multipliers: DimensionMultipliers | undefined;
  if (obj.multipliers !== undefined && obj.multipliers !== null) {
    if (typeof obj.multipliers !== 'object') {
      throw new ScoreInputError('multipliers', 'multipliers must be an object');
    }
    const m = obj.multipliers as Record<string, unknown>;
    multipliers = {
      oracleRisk: assertMultiplier('multipliers.oracleRisk', m.oracleRisk),
      custodyRisk: assertMultiplier('multipliers.custodyRisk', m.custodyRisk),
      liquidityRisk: assertMultiplier('multipliers.liquidityRisk', m.liquidityRisk),
      reserveRisk: assertMultiplier('multipliers.reserveRisk', m.reserveRisk),
      regulatoryRisk: assertMultiplier('multipliers.regulatoryRisk', m.regulatoryRisk),
    };
  }

  let notes: string | undefined;
  if (obj.notes !== undefined && obj.notes !== null) {
    if (typeof obj.notes !== 'string') {
      throw new ScoreInputError('notes', 'notes must be a string');
    }
    if (obj.notes.length > 2000) {
      throw new ScoreInputError('notes', 'notes must be 2000 characters or fewer');
    }
    notes = obj.notes;
  }

  return {
    candidateName: candidateName.trim(),
    ...dims,
    ...(multipliers ? { multipliers } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function scoreCandidate(rawInput: ScoreInput): ScoreResult {
  // Normalize through validator so callers that already have a ScoreInput
  // still get strict 1-5 enforcement.
  const input = validateScoreInput(rawInput);

  const dimensions = {} as Record<DimensionKey, DimensionResult>;
  let composite = 0;
  let weightedComposite = 0;

  for (const key of DIMENSION_KEYS) {
    const score = input[key] as DimensionScore;
    const multiplier = input.multipliers?.[key] ?? 1;
    const weighted = score * multiplier;
    dimensions[key] = {
      key,
      label: DIMENSION_LABELS[key],
      score,
      multiplier,
      weighted: Number(weighted.toFixed(4)),
      criteria: DIMENSION_CRITERIA[key][score],
    };
    composite += score;
    weightedComposite += weighted;
  }

  const band = bandFor(composite);
  const remediationNotes = buildRemediationNotes(dimensions, band);
  const launchGateWarnings = buildLaunchGateWarnings(dimensions, band);

  return {
    candidateName: input.candidateName,
    evaluatedAt: new Date().toISOString(),
    dimensions,
    composite,
    weightedComposite: Number(weightedComposite.toFixed(4)),
    band,
    bandDescription: BAND_DESCRIPTION[band],
    bandOutcome: BAND_OUTCOME[band],
    remediationNotes,
    launchGateWarnings,
    notes: input.notes ?? null,
    advisory: ADVISORY_DISCLAIMER,
    source: {
      framework: FRAMEWORK_NAME,
      version: FRAMEWORK_VERSION,
      path: FRAMEWORK_PATH,
    },
  };
}
