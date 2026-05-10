/**
 * Axiom Supported Assets Admissions Framework
 *
 * General admission schema for evaluating supported-asset candidates across
 * commodities, stable assets, reserve-grade crypto assets, yield-bearing
 * external assets, and future external RWAs.
 *
 * Hard rules:
 *   - Internal / operator only. Results are advisory and do not create public
 *     support, token issuance, contract deployment, banking rails, or write paths.
 *   - Commodity admissions remain specialized in lib/commodities/admissions.ts.
 *     This file sits one level above that pipeline and can wrap commodity
 *     reference snapshots without weakening commodity-specific checks.
 *   - AXAU remains the live Axiom gold reserve module.
 *   - KAG remains EXTERNAL_SUPPORTED read-only silver.
 *   - AXAG remains NOT_LIVE_NOT_ISSUED. This framework cannot activate it.
 */

import type {
  AdmissionCheckResult as CommodityAdmissionCheckResult,
  CommodityAdmissionCandidate,
} from '../commodities/admissions';
import { KNOWN_ASSETS_ADMISSION_SNAPSHOTS } from '../commodities/admissions';

// ─── Enums / unions ────────────────────────────────────────────────────────────

export type SupportedAssetCategory =
  | 'COMMODITY'
  | 'STABLE'
  | 'GOLD'
  | 'SILVER'
  | 'BTC'
  | 'ETH'
  | 'STAKED_ETH'
  | 'RWA_EXTERNAL';

export type SupportedAssetReadiness =
  | 'READY_NOW'
  | 'NEEDS_DILIGENCE'
  | 'OUT_OF_SCOPE';

export type SupportedAssetMaturity =
  | 'LIVE_AXIOM_MODULE'
  | 'EXTERNAL_READ_ONLY'
  | 'CANDIDATE_ONLY'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'OUT_OF_SCOPE_REFERENCE';

export type SupportedAssetRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'DISQUALIFIED';

export type VerificationState =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'MISSING'
  | 'NOT_APPLICABLE';

export type ClarityState = 'CLEAR' | 'CONDITIONAL' | 'OPAQUE' | 'NONE';

export type ReadOnlyIntegrationReadiness =
  | 'READY'
  | 'NEEDS_ADAPTER'
  | 'NOT_REQUIRED'
  | 'BLOCKED';

export type PublicSupportStatus =
  | 'LIVE_AXIOM_ISSUED'
  | 'EXTERNAL_SUPPORTED'
  | 'CANDIDATE_ONLY'
  | 'NOT_LIVE_NOT_ISSUED';

export type IntegrationFriction = 'LOW' | 'MEDIUM' | 'HIGH';

export type CandidateSource = 'COMMODITY_PIPELINE' | 'SUPPORTED_ASSETS_FRAMEWORK';

// ─── Admission schema ──────────────────────────────────────────────────────────

/**
 * SupportedAssetAdmissionCandidate is the general supported-assets admission
 * record. Every candidate must be complete enough for internal comparison, but
 * it does not create or imply a public listing.
 */
export interface SupportedAssetAdmissionCandidate {
  // Identity
  symbol: string;
  name: string;
  category: SupportedAssetCategory;
  issuer: string;
  chain: string;
  contractAddress: string;

  // Current truth / public surface status
  publicSupportStatus: PublicSupportStatus;
  currentTruthStatement: string;
  source: CandidateSource;
  commodityPipelineRef?: string;

  // Verification evidence
  issuerVerification: VerificationState;
  issuerVerificationNotes: string;
  chainVerification: VerificationState;
  chainVerificationNotes: string;
  contractVerification: VerificationState;
  contractVerificationNotes: string;
  pricingSource: string;
  pricingSourceVerification: VerificationState;
  pricingSourceNotes: string;
  reserveBackingClarity: ClarityState;
  reserveBackingNotes: string;
  disclosureCompleteness: VerificationState;
  disclosureNotes: string;
  custodyRedemptionClarity: ClarityState;
  custodyRedemptionNotes: string;
  readOnlyIntegrationReadiness: ReadOnlyIntegrationReadiness;
  readOnlyIntegrationNotes: string;

  // Safety boundaries
  axiomIssued: boolean;
  axiomCustodiesUnderlying: boolean;
  introducesWritePath: boolean;
  introducesContractWrite: boolean;
  introducesBankingRail: boolean;
  activatesAxag: boolean;

  // Operator metadata
  integrationFriction: IntegrationFriction;
  blockers: string[];
  evidencePackageRef: string;
  operatorNotes: string;
  createdAt: string;
  createdBy: string;
}

export interface SupportedAssetAdmissionResult {
  symbol: string;
  name: string;
  category: SupportedAssetCategory;
  publicSupportStatus: PublicSupportStatus;
  maturity: SupportedAssetMaturity;
  risk: SupportedAssetRisk;
  readiness: SupportedAssetReadiness;
  disclosureScore: number;
  disclosureComplete: boolean;
  checks: CommodityAdmissionCheckResult[];
  passes: CommodityAdmissionCheckResult[];
  failures: CommodityAdmissionCheckResult[];
  openBlockers: string[];
  summary: string;
  evaluatedAt: string;
}

export interface SupportedAssetComparisonRow {
  symbol: string;
  name: string;
  category: SupportedAssetCategory;
  issuer: string;
  chain: string;
  contractVerified: boolean;
  pricingSource: string;
  reserveBackingClarity: ClarityState;
  custodyRedemptionClarity: ClarityState;
  readOnlyIntegrationReadiness: ReadOnlyIntegrationReadiness;
  publicSupportStatus: PublicSupportStatus;
  maturity: SupportedAssetMaturity;
  risk: SupportedAssetRisk;
  readiness: SupportedAssetReadiness;
  integrationFriction: IntegrationFriction;
  disclosureScore: number;
  openBlockerCount: number;
  blockerSummary: string;
}

// ─── Validation helpers ────────────────────────────────────────────────────────

function check(
  field: string,
  passed: boolean,
  passNote: string,
  failNote: string,
): CommodityAdmissionCheckResult {
  return { field, passed, note: passed ? passNote : failNote };
}

function isVerified(state: VerificationState): boolean {
  return state === 'VERIFIED' || state === 'NOT_APPLICABLE';
}

function isClearEnough(state: ClarityState): boolean {
  return state === 'CLEAR' || state === 'CONDITIONAL';
}

function isExternalCandidate(c: SupportedAssetAdmissionCandidate): boolean {
  return !c.axiomIssued && c.publicSupportStatus !== 'NOT_LIVE_NOT_ISSUED';
}

function isAxag(c: SupportedAssetAdmissionCandidate): boolean {
  return c.symbol.toUpperCase() === 'AXAG';
}

// ─── Admission checks ──────────────────────────────────────────────────────────

export function runSupportedAssetAdmissionChecks(
  c: SupportedAssetAdmissionCandidate,
): CommodityAdmissionCheckResult[] {
  return [
    check(
      'symbol',
      c.symbol.trim().length > 0,
      'Symbol is non-empty.',
      'Symbol must be non-empty.',
    ),
    check(
      'name',
      c.name.trim().length > 0,
      'Asset name is present.',
      'Asset name is required.',
    ),
    check(
      'category',
      c.category.trim().length > 0,
      `Category is set to ${c.category}.`,
      'Category is required.',
    ),
    check(
      'issuerVerification',
      isVerified(c.issuerVerification),
      'Issuer verification is complete or not applicable.',
      'Issuer verification is incomplete.',
    ),
    check(
      'chainVerification',
      isVerified(c.chainVerification),
      'Chain verification is complete or not applicable.',
      'Chain verification is incomplete.',
    ),
    check(
      'contractVerification',
      isVerified(c.contractVerification),
      'Contract verification is complete or not applicable.',
      'Contract verification is incomplete.',
    ),
    check(
      'pricingSourceVerification',
      isVerified(c.pricingSourceVerification) && c.pricingSource.trim().length > 0,
      'Pricing source is identified and verified.',
      'Pricing source must be identified and verified.',
    ),
    check(
      'reserveBackingClarity',
      isClearEnough(c.reserveBackingClarity),
      'Reserve/backing model is clear enough for disclosure.',
      'Reserve/backing model is unclear or missing.',
    ),
    check(
      'disclosureCompleteness',
      isVerified(c.disclosureCompleteness),
      'Disclosure package is complete or not applicable.',
      'Disclosure package is incomplete.',
    ),
    check(
      'custodyRedemptionClarity',
      isClearEnough(c.custodyRedemptionClarity),
      'Custody/redemption posture is clear enough for disclosure.',
      'Custody/redemption posture is unclear or missing.',
    ),
    check(
      'readOnlyIntegrationReadiness',
      c.readOnlyIntegrationReadiness === 'READY' ||
        c.readOnlyIntegrationReadiness === 'NOT_REQUIRED',
      'Read-only integration is ready or not required for this reference asset.',
      'Read-only integration is not ready.',
    ),
    check(
      'externalAssetsAreReadOnly',
      !isExternalCandidate(c) || c.readOnlyIntegrationReadiness === 'READY',
      'External asset path is read-only-ready.',
      'External candidates must be read-only-ready before support.',
    ),
    check(
      'noWritePaths',
      !c.introducesWritePath,
      'No write path is introduced.',
      'Candidate would introduce a write path.',
    ),
    check(
      'noContractWrites',
      !c.introducesContractWrite,
      'No contract write is introduced.',
      'Candidate would require contract writes.',
    ),
    check(
      'noBankingRails',
      !c.introducesBankingRail,
      'No banking rail is introduced.',
      'Candidate would introduce banking rails.',
    ),
    check(
      'axagNotActivated',
      !(isAxag(c) && (c.activatesAxag || c.publicSupportStatus !== 'NOT_LIVE_NOT_ISSUED')),
      'AXAG remains NOT_LIVE_NOT_ISSUED.',
      'AXAG cannot be activated or marked as publicly supported by this framework.',
    ),
    check(
      'evidencePackageRef',
      c.evidencePackageRef.trim().length > 0,
      'Evidence package reference is on file.',
      'Evidence package reference is missing.',
    ),
    check(
      'noOpenBlockers',
      c.blockers.length === 0,
      'No open blockers.',
      `${c.blockers.length} open blocker(s) on file.`,
    ),
  ];
}

// ─── Classifiers ───────────────────────────────────────────────────────────────

const DISCLOSURE_WEIGHTS: Array<{
  field: keyof SupportedAssetAdmissionCandidate;
  weight: number;
  accepts: (value: SupportedAssetAdmissionCandidate[keyof SupportedAssetAdmissionCandidate]) => boolean;
}> = [
  { field: 'issuerVerification', weight: 10, accepts: (v) => isVerified(v as VerificationState) },
  { field: 'chainVerification', weight: 10, accepts: (v) => isVerified(v as VerificationState) },
  { field: 'contractVerification', weight: 10, accepts: (v) => isVerified(v as VerificationState) },
  { field: 'pricingSourceVerification', weight: 15, accepts: (v) => isVerified(v as VerificationState) },
  { field: 'reserveBackingClarity', weight: 15, accepts: (v) => isClearEnough(v as ClarityState) },
  { field: 'disclosureCompleteness', weight: 20, accepts: (v) => isVerified(v as VerificationState) },
  { field: 'custodyRedemptionClarity', weight: 10, accepts: (v) => isClearEnough(v as ClarityState) },
  {
    field: 'readOnlyIntegrationReadiness',
    weight: 10,
    accepts: (v) => v === 'READY' || v === 'NOT_REQUIRED',
  },
];

export function computeSupportedAssetDisclosureScore(
  c: SupportedAssetAdmissionCandidate,
): number {
  return DISCLOSURE_WEIGHTS.reduce((score, item) => {
    return score + (item.accepts(c[item.field]) ? item.weight : 0);
  }, 0);
}

export function classifySupportedAssetMaturity(
  c: SupportedAssetAdmissionCandidate,
): SupportedAssetMaturity {
  if (c.publicSupportStatus === 'LIVE_AXIOM_ISSUED' && c.axiomIssued) return 'LIVE_AXIOM_MODULE';
  if (c.publicSupportStatus === 'EXTERNAL_SUPPORTED') return 'EXTERNAL_READ_ONLY';
  if (c.publicSupportStatus === 'NOT_LIVE_NOT_ISSUED') return 'NOT_LIVE_NOT_ISSUED';
  if (c.blockers.length > 0 && c.integrationFriction === 'HIGH') {
    return 'OUT_OF_SCOPE_REFERENCE';
  }
  return 'CANDIDATE_ONLY';
}

export function classifySupportedAssetRisk(
  c: SupportedAssetAdmissionCandidate,
): SupportedAssetRisk {
  if (
    c.introducesWritePath ||
    c.introducesContractWrite ||
    c.introducesBankingRail ||
    c.activatesAxag ||
    (isAxag(c) && c.publicSupportStatus !== 'NOT_LIVE_NOT_ISSUED')
  ) {
    return 'DISQUALIFIED';
  }

  const criticalMissing = [
    c.issuerVerification === 'MISSING',
    c.chainVerification === 'MISSING',
    c.contractVerification === 'MISSING',
    c.pricingSourceVerification === 'MISSING',
    c.reserveBackingClarity === 'NONE',
    c.disclosureCompleteness === 'MISSING',
    c.custodyRedemptionClarity === 'NONE',
    c.readOnlyIntegrationReadiness === 'BLOCKED',
  ].filter(Boolean).length;

  if (criticalMissing >= 3 || c.blockers.length >= 3) return 'HIGH';

  const mediumConcerns = [
    c.issuerVerification === 'PARTIAL',
    c.chainVerification === 'PARTIAL',
    c.contractVerification === 'PARTIAL',
    c.pricingSourceVerification === 'PARTIAL',
    c.reserveBackingClarity === 'OPAQUE',
    c.disclosureCompleteness === 'PARTIAL',
    c.custodyRedemptionClarity === 'OPAQUE',
    c.readOnlyIntegrationReadiness === 'NEEDS_ADAPTER',
    c.blockers.length > 0,
  ].filter(Boolean).length;

  if (criticalMissing > 0 || mediumConcerns >= 2) return 'MEDIUM';
  return 'LOW';
}

export function classifySupportedAssetReadiness(
  c: SupportedAssetAdmissionCandidate,
  risk: SupportedAssetRisk,
  checks: CommodityAdmissionCheckResult[],
): SupportedAssetReadiness {
  if (risk === 'DISQUALIFIED' || risk === 'HIGH') return 'OUT_OF_SCOPE';

  const criticalFailures = checks.filter(
    (ch) =>
      !ch.passed &&
      [
        'pricingSourceVerification',
        'reserveBackingClarity',
        'readOnlyIntegrationReadiness',
        'externalAssetsAreReadOnly',
        'noWritePaths',
        'noContractWrites',
        'noBankingRails',
        'axagNotActivated',
      ].includes(ch.field),
  );
  if (criticalFailures.length > 0) return 'OUT_OF_SCOPE';

  if (checks.every((ch) => ch.passed) && risk === 'LOW') return 'READY_NOW';
  return 'NEEDS_DILIGENCE';
}

// ─── Evaluation / comparison ───────────────────────────────────────────────────

export function evaluateSupportedAssetAdmission(
  c: SupportedAssetAdmissionCandidate,
): SupportedAssetAdmissionResult {
  const checks = runSupportedAssetAdmissionChecks(c);
  const passes = checks.filter((ch) => ch.passed);
  const failures = checks.filter((ch) => !ch.passed);
  const disclosureScore = computeSupportedAssetDisclosureScore(c);
  const disclosureComplete = disclosureScore >= 80;
  const maturity = classifySupportedAssetMaturity(c);
  const risk = classifySupportedAssetRisk(c);
  const readiness = classifySupportedAssetReadiness(c, risk, checks);

  let summary: string;
  switch (readiness) {
    case 'READY_NOW':
      summary =
        `${c.symbol} has a complete supported-assets admission profile. ` +
        `Disclosure score: ${disclosureScore}/100. Advisory only; governance and ` +
        'launch-gate review are still required before any new public support.';
      break;
    case 'NEEDS_DILIGENCE':
      summary =
        `${c.symbol} needs additional diligence before any status expansion. ` +
        `${failures.length} check(s) failed. Disclosure score: ${disclosureScore}/100.`;
      break;
    case 'OUT_OF_SCOPE':
      summary =
        `${c.symbol} is OUT_OF_SCOPE for the current supported-assets path. ` +
        `Risk: ${risk}. ${failures.length} check(s) failed. Do not onboard without ` +
        'resolving critical blockers and re-evaluating.';
      break;
  }

  return {
    symbol: c.symbol,
    name: c.name,
    category: c.category,
    publicSupportStatus: c.publicSupportStatus,
    maturity,
    risk,
    readiness,
    disclosureScore,
    disclosureComplete,
    checks,
    passes,
    failures,
    openBlockers: [...c.blockers],
    summary,
    evaluatedAt: new Date().toISOString(),
  };
}

export function buildSupportedAssetComparisonTable(
  candidates: SupportedAssetAdmissionCandidate[],
  precomputedResults?: SupportedAssetAdmissionResult[],
): SupportedAssetComparisonRow[] {
  return candidates.map((c, i) => {
    const result = precomputedResults?.[i] ?? evaluateSupportedAssetAdmission(c);

    return {
      symbol: c.symbol,
      name: c.name,
      category: c.category,
      issuer: c.issuer,
      chain: c.chain,
      contractVerified: c.contractVerification === 'VERIFIED',
      pricingSource: c.pricingSource,
      reserveBackingClarity: c.reserveBackingClarity,
      custodyRedemptionClarity: c.custodyRedemptionClarity,
      readOnlyIntegrationReadiness: c.readOnlyIntegrationReadiness,
      publicSupportStatus: c.publicSupportStatus,
      maturity: result.maturity,
      risk: result.risk,
      readiness: result.readiness,
      integrationFriction: c.integrationFriction,
      disclosureScore: result.disclosureScore,
      openBlockerCount: c.blockers.length,
      blockerSummary:
        c.blockers.length === 0
          ? 'None'
          : c.blockers.length === 1
          ? c.blockers[0]
          : `${c.blockers[0]} (+${c.blockers.length - 1} more)`,
    };
  });
}

// ─── Commodity wrapper ─────────────────────────────────────────────────────────

function commodityCategoryToSupportedCategory(
  category: CommodityAdmissionCandidate['category'],
): SupportedAssetCategory {
  if (category === 'GOLD') return 'GOLD';
  if (category === 'SILVER') return 'SILVER';
  return 'COMMODITY';
}

function commodityStatusToPublicSupportStatus(
  status: CommodityAdmissionCandidate['intendedProductStatus'],
): PublicSupportStatus {
  if (status === 'LIVE') return 'LIVE_AXIOM_ISSUED';
  if (status === 'EXTERNAL_SUPPORTED') return 'EXTERNAL_SUPPORTED';
  if (status === 'NOT_LIVE_NOT_ISSUED') return 'NOT_LIVE_NOT_ISSUED';
  return 'CANDIDATE_ONLY';
}

export function fromCommodityAdmissionCandidate(
  c: CommodityAdmissionCandidate,
): SupportedAssetAdmissionCandidate {
  const isNotIssued = c.intendedProductStatus === 'NOT_LIVE_NOT_ISSUED';
  const isAxiomLive = c.axiomWillIssue && c.intendedProductStatus === 'LIVE';

  return {
    symbol: c.symbol,
    name: c.name,
    category: commodityCategoryToSupportedCategory(c.category),
    issuer: c.issuer,
    chain: c.chain,
    contractAddress: c.contractAddress,
    publicSupportStatus: commodityStatusToPublicSupportStatus(c.intendedProductStatus),
    currentTruthStatement: `${c.symbol} commodity reference snapshot from the specialized commodity admissions pipeline.`,
    source: 'COMMODITY_PIPELINE',
    commodityPipelineRef: 'lib/commodities/admissions.ts',
    issuerVerification: c.issuerRegulated && c.issuerPublicDocumentation ? 'VERIFIED' : 'MISSING',
    issuerVerificationNotes: c.issuerVerificationNotes,
    chainVerification: isNotIssued ? 'NOT_APPLICABLE' : c.chain.trim().length > 0 ? 'VERIFIED' : 'MISSING',
    chainVerificationNotes: c.chain,
    contractVerification: isNotIssued ? 'NOT_APPLICABLE' : c.contractVerified ? 'VERIFIED' : 'MISSING',
    contractVerificationNotes: c.contractVerificationNotes,
    pricingSource: c.pricingSource,
    pricingSourceVerification: c.pricingReferenceOnly ? 'VERIFIED' : 'MISSING',
    pricingSourceNotes: c.pricingNotes,
    reserveBackingClarity: c.reserveDisclosed ? 'CLEAR' : 'NONE',
    reserveBackingNotes: c.reserveNotes,
    disclosureCompleteness: c.evidencePackageRef ? 'VERIFIED' : 'MISSING',
    disclosureNotes: c.operatorNotes,
    custodyRedemptionClarity: c.custodianRegulated ? 'CLEAR' : isNotIssued ? 'NONE' : 'OPAQUE',
    custodyRedemptionNotes: c.reserveDescription,
    readOnlyIntegrationReadiness: isAxiomLive
      ? 'NOT_REQUIRED'
      : c.intendedReadOnly && !isNotIssued
      ? 'READY'
      : isNotIssued
      ? 'BLOCKED'
      : 'NEEDS_ADAPTER',
    readOnlyIntegrationNotes: isAxiomLive
      ? 'AXAU is the existing Axiom-issued reserve module; read-only external integration does not apply.'
      : c.intendedReadOnly
      ? 'Commodity snapshot targets read-only external support.'
      : 'Commodity snapshot is not read-only-ready.',
    axiomIssued: c.axiomWillIssue,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: c.integrationFriction,
    blockers: [...c.blockers],
    evidencePackageRef: c.evidencePackageRef,
    operatorNotes: c.operatorNotes,
    createdAt: c.createdAt,
    createdBy: c.createdBy,
  };
}

// ─── Candidate snapshots ───────────────────────────────────────────────────────

const commodityReferenceCandidates =
  KNOWN_ASSETS_ADMISSION_SNAPSHOTS.map(fromCommodityAdmissionCandidate);

const futureCandidateSnapshots: SupportedAssetAdmissionCandidate[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    category: 'STABLE',
    issuer: 'Circle Internet Financial, LLC',
    chain: 'Arbitrum One',
    contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    publicSupportStatus: 'CANDIDATE_ONLY',
    currentTruthStatement:
      'External stable asset; no Axiom issuance. This admissions snapshot does not add new support.',
    source: 'SUPPORTED_ASSETS_FRAMEWORK',
    issuerVerification: 'VERIFIED',
    issuerVerificationNotes: 'Circle is an identified issuer with public reserve and licensing disclosures.',
    chainVerification: 'VERIFIED',
    chainVerificationNotes: 'Native Arbitrum One USDC contract is documented publicly.',
    contractVerification: 'VERIFIED',
    contractVerificationNotes: 'ERC-20 contract is verified on Arbiscan.',
    pricingSource: 'CoinGecko usd-coin / Chainlink USDC/USD',
    pricingSourceVerification: 'VERIFIED',
    pricingSourceNotes: 'Reference pricing only; no buy/sell signal.',
    reserveBackingClarity: 'CLEAR',
    reserveBackingNotes: 'Circle publishes reserve composition and attestations.',
    disclosureCompleteness: 'VERIFIED',
    disclosureNotes: 'Must distinguish USDC from AXUSD and state no Axiom issuance.',
    custodyRedemptionClarity: 'CLEAR',
    custodyRedemptionNotes: 'Redemption depends on Circle terms; Axiom does not control redemption.',
    readOnlyIntegrationReadiness: 'READY',
    readOnlyIntegrationNotes: 'Read-only ERC-20 balance and reference price path only.',
    axiomIssued: false,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: 'LOW',
    blockers: [],
    evidencePackageRef: 'documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md',
    operatorNotes: 'Candidate/advisory row only. No new live asset is added by this framework.',
    createdAt: '2026-05-10',
    createdBy: 'axiom-ops',
  },
  {
    symbol: 'PAXG',
    name: 'Paxos Gold',
    category: 'GOLD',
    issuer: 'Paxos Trust Company, LLC',
    chain: 'Ethereum mainnet / Arbitrum One reference',
    contractAddress: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
    publicSupportStatus: 'CANDIDATE_ONLY',
    currentTruthStatement:
      'External gold asset; AXAU remains the Axiom-issued gold rail.',
    source: 'SUPPORTED_ASSETS_FRAMEWORK',
    issuerVerification: 'VERIFIED',
    issuerVerificationNotes: 'Paxos is a publicly documented NYDFS-regulated trust company.',
    chainVerification: 'VERIFIED',
    chainVerificationNotes: 'Ethereum mainnet PAXG contract is publicly documented.',
    contractVerification: 'VERIFIED',
    contractVerificationNotes: 'ERC-20 contract is verified on Etherscan.',
    pricingSource: 'CoinGecko pax-gold / Chainlink XAU/USD',
    pricingSourceVerification: 'VERIFIED',
    pricingSourceNotes: 'Reference pricing only; AXAU NAV remains separately governed.',
    reserveBackingClarity: 'CLEAR',
    reserveBackingNotes: 'Paxos publishes gold reserve disclosures and attestations.',
    disclosureCompleteness: 'VERIFIED',
    disclosureNotes: 'Must distinguish PAXG from AXAU and avoid implying Axiom issuance.',
    custodyRedemptionClarity: 'CLEAR',
    custodyRedemptionNotes: 'Redemption depends on Paxos terms; Axiom does not control redemption.',
    readOnlyIntegrationReadiness: 'READY',
    readOnlyIntegrationNotes: 'Read-only balance and reference price path only.',
    axiomIssued: false,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: 'LOW',
    blockers: [],
    evidencePackageRef: 'documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md',
    operatorNotes: 'Candidate/advisory row only. AXAU remains the live gold module.',
    createdAt: '2026-05-10',
    createdBy: 'axiom-ops',
  },
  {
    symbol: 'XAUT',
    name: 'Tether Gold',
    category: 'GOLD',
    issuer: 'TG Commodities Limited',
    chain: 'Ethereum mainnet',
    contractAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
    publicSupportStatus: 'CANDIDATE_ONLY',
    currentTruthStatement:
      'External gold asset; this framework adds no new public asset status.',
    source: 'SUPPORTED_ASSETS_FRAMEWORK',
    issuerVerification: 'PARTIAL',
    issuerVerificationNotes: 'Issuer is public; regulatory posture requires ongoing review.',
    chainVerification: 'VERIFIED',
    chainVerificationNotes: 'Ethereum mainnet contract is publicly documented.',
    contractVerification: 'VERIFIED',
    contractVerificationNotes: 'ERC-20 contract is verified on Etherscan.',
    pricingSource: 'CoinGecko tether-gold',
    pricingSourceVerification: 'VERIFIED',
    pricingSourceNotes: 'CoinGecko reference pricing only.',
    reserveBackingClarity: 'CONDITIONAL',
    reserveBackingNotes: 'Gold backing disclosures exist; attestation cadence should be verified.',
    disclosureCompleteness: 'PARTIAL',
    disclosureNotes: 'Needs conservative disclosure around issuer/regulatory posture.',
    custodyRedemptionClarity: 'CONDITIONAL',
    custodyRedemptionNotes: 'Redemption depends on Tether Gold terms.',
    readOnlyIntegrationReadiness: 'READY',
    readOnlyIntegrationNotes: 'Read-only ERC-20 and reference price path only.',
    axiomIssued: false,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: 'MEDIUM',
    blockers: ['Issuer transparency and attestation cadence require periodic review'],
    evidencePackageRef: 'documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md',
    operatorNotes: 'Keep as diligence candidate unless disclosures are fully reviewed.',
    createdAt: '2026-05-10',
    createdBy: 'axiom-ops',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    category: 'BTC',
    issuer: 'BitGo Trust Company / WBTC merchant network',
    chain: 'Arbitrum One',
    contractAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    publicSupportStatus: 'CANDIDATE_ONLY',
    currentTruthStatement:
      'External wrapped BTC asset; no Axiom BTC issuance or custody.',
    source: 'SUPPORTED_ASSETS_FRAMEWORK',
    issuerVerification: 'VERIFIED',
    issuerVerificationNotes: 'BitGo Trust Company and WBTC network are publicly documented.',
    chainVerification: 'VERIFIED',
    chainVerificationNotes: 'Arbitrum One WBTC contract is publicly documented.',
    contractVerification: 'VERIFIED',
    contractVerificationNotes: 'ERC-20 contract is verified on Arbiscan.',
    pricingSource: 'CoinGecko wrapped-bitcoin / Chainlink BTC/USD',
    pricingSourceVerification: 'VERIFIED',
    pricingSourceNotes: 'Reference pricing only.',
    reserveBackingClarity: 'CLEAR',
    reserveBackingNotes: 'BTC proof-of-reserves model is public; merchant network risk remains.',
    disclosureCompleteness: 'VERIFIED',
    disclosureNotes: 'Must disclose wrapped-asset and merchant-network risk.',
    custodyRedemptionClarity: 'CONDITIONAL',
    custodyRedemptionNotes: 'Redemption depends on WBTC merchant network and BitGo custody terms.',
    readOnlyIntegrationReadiness: 'READY',
    readOnlyIntegrationNotes: 'Read-only ERC-20 and reference price path only.',
    axiomIssued: false,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: 'LOW',
    blockers: [],
    evidencePackageRef: 'documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md',
    operatorNotes: 'Candidate/advisory row only. Axiom does not custody BTC.',
    createdAt: '2026-05-10',
    createdBy: 'axiom-ops',
  },
  {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    category: 'STAKED_ETH',
    issuer: 'Coinbase, Inc.',
    chain: 'Ethereum mainnet',
    contractAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    publicSupportStatus: 'CANDIDATE_ONLY',
    currentTruthStatement:
      'External yield-bearing staked ETH wrapper; no Axiom yield product.',
    source: 'SUPPORTED_ASSETS_FRAMEWORK',
    issuerVerification: 'VERIFIED',
    issuerVerificationNotes: 'Coinbase issuer and custody posture are publicly documented.',
    chainVerification: 'VERIFIED',
    chainVerificationNotes: 'Ethereum mainnet cbETH contract is publicly documented.',
    contractVerification: 'VERIFIED',
    contractVerificationNotes: 'ERC-20 contract is verified on Etherscan.',
    pricingSource: 'CoinGecko coinbase-wrapped-staked-eth',
    pricingSourceVerification: 'VERIFIED',
    pricingSourceNotes: 'Reference pricing only; no yield or return claim by Axiom.',
    reserveBackingClarity: 'CONDITIONAL',
    reserveBackingNotes: 'Represents staked ETH exposure via Coinbase staking terms.',
    disclosureCompleteness: 'PARTIAL',
    disclosureNotes: 'Yield-bearing wrapper language requires heightened disclosure review.',
    custodyRedemptionClarity: 'CONDITIONAL',
    custodyRedemptionNotes: 'Unstaking/redemption depends on Coinbase and Ethereum validator mechanics.',
    readOnlyIntegrationReadiness: 'READY',
    readOnlyIntegrationNotes: 'Read-only ERC-20 and reference price path only.',
    axiomIssued: false,
    axiomCustodiesUnderlying: false,
    introducesWritePath: false,
    introducesContractWrite: false,
    introducesBankingRail: false,
    activatesAxag: false,
    integrationFriction: 'MEDIUM',
    blockers: ['Yield-bearing disclosure package must remain explicit and conservative'],
    evidencePackageRef: 'documents/assets/SUPPORTED_ASSETS_CANDIDATE_TRACKER.md',
    operatorNotes: 'Needs diligence because yield accrues from Coinbase staking, not Axiom.',
    createdAt: '2026-05-10',
    createdBy: 'axiom-ops',
  },
];

/**
 * Reference and candidate snapshots for internal/operator comparison only.
 *
 * Do not use this list to render public supported-assets pages or APIs. Public
 * support remains governed by the existing registries, disclosures, governance,
 * and launch gates.
 */
export const SUPPORTED_ASSET_ADMISSION_CANDIDATES: SupportedAssetAdmissionCandidate[] = [
  ...commodityReferenceCandidates,
  ...futureCandidateSnapshots,
];
