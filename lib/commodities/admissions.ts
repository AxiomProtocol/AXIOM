/**
 * Tokenized Commodities Integration Layer — Commodity Admissions Schema
 *
 * Formal admission schema for evaluating and onboarding future commodity assets
 * into Axiom Protocol through the Tokenized Commodities Integration Layer.
 *
 * Hard rules:
 *   - This file is INTERNAL / PIPELINE ONLY. No new asset becomes publicly
 *     supported without passing all admission checks AND explicit governance
 *     approval + launch-gate sign-off.
 *   - AXAG MUST remain NOT_LIVE_NOT_ISSUED. This file does not change that.
 *   - No write paths. No contract deploys. No token issuance.
 *   - Classifications here are advisory. They do not replace governance votes.
 *
 * Readiness classifications:
 *   READY_NOW        — all evidence present; may proceed to governance
 *   NEEDS_DILIGENCE  — missing evidence; blocked pending further research
 *   OUT_OF_SCOPE     — structurally incompatible; deferred or rejected
 *
 * Maturity classifications (mirrors CommodityMaturityLabel in registry.ts):
 *   production       — Axiom-issued, live, fully operational
 *   external-live    — external issuer, read-only support active
 *   inactive         — deployed contracts; issuance not active
 *   deferred         — governance/custody blocked
 *   not-issued       — no contract, no token
 *
 * Risk classifications:
 *   LOW    — suitable for integration with standard diligence
 *   MEDIUM — integration possible with documented risk mitigations
 *   HIGH   — significant blockers; requires extended diligence
 *   DISQUALIFIED — structurally incompatible with framework
 */

import type { CommodityCategory, CommodityProductStatus } from './registry';

// ─── Enums / unions ────────────────────────────────────────────────────────────

export type AdmissionReadiness = 'READY_NOW' | 'NEEDS_DILIGENCE' | 'OUT_OF_SCOPE';

export type AdmissionMaturity =
  | 'production'
  | 'external-live'
  | 'inactive'
  | 'deferred'
  | 'not-issued';

export type AdmissionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'DISQUALIFIED';

// ─── Admission schema ──────────────────────────────────────────────────────────

/**
 * CommodityAdmissionCandidate — the full set of required fields an operator
 * must supply when proposing a new commodity asset for integration.
 *
 * All fields are required. Unknown or unavailable evidence must be explicitly
 * marked with a null/false/empty value, not omitted.
 */
export interface CommodityAdmissionCandidate {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** Token ticker symbol (uppercase, e.g. "PAXG") */
  symbol: string;
  /** Full human-readable name (e.g. "PAX Gold") */
  name: string;
  /** Asset class */
  category: CommodityCategory;
  /** Issuing entity name and jurisdiction */
  issuer: string;
  /** Primary blockchain network */
  chain: string;
  /** On-chain contract address; empty string if none */
  contractAddress: string;

  // ── Issuer verification ─────────────────────────────────────────────────────
  /** Issuer is a regulated entity with public registration */
  issuerRegulated: boolean;
  /** Regulatory jurisdiction of issuer */
  issuerJurisdiction: string;
  /** Public legal / corporate documentation available */
  issuerPublicDocumentation: boolean;
  /** Notes on issuer verification */
  issuerVerificationNotes: string;

  // ── Contract verification ───────────────────────────────────────────────────
  /** Contract is verified on a block explorer */
  contractVerified: boolean;
  /** Block explorer URL for contract verification */
  contractExplorerUrl: string;
  /** Contract audit available (security audit) */
  contractAudited: boolean;
  /** Audit firm name; empty string if none */
  contractAuditFirm: string;
  /** Notes on contract verification */
  contractVerificationNotes: string;

  // ── Pricing source ──────────────────────────────────────────────────────────
  /** Canonical pricing source label (e.g. "CoinGecko kinesis-silver") */
  pricingSource: string;
  /** On-chain oracle available (Chainlink, Pyth, API3, etc.) */
  onChainOracleAvailable: boolean;
  /** Oracle provider name; empty string if none */
  oracleProvider: string;
  /** Pricing is reference-only (not buy/sell signal) — must be true */
  pricingReferenceOnly: boolean;
  /** Notes on pricing source */
  pricingNotes: string;

  // ── Reserve / backing disclosure ────────────────────────────────────────────
  /** Reserve or backing model is publicly disclosed */
  reserveDisclosed: boolean;
  /** Proof-of-reserves or equivalent attestation available */
  proofOfReservesAvailable: boolean;
  /** Reserve attestation frequency (e.g. "monthly", "quarterly", "none") */
  reserveAttestationFrequency: string;
  /** Custodian is a regulated qualified custodian */
  custodianRegulated: boolean;
  /** Custodian name; empty string if unknown */
  custodianName: string;
  /** Reserve/backing description */
  reserveDescription: string;
  /** Notes on reserve/backing disclosure */
  reserveNotes: string;

  // ── Integration scope ────────────────────────────────────────────────────────
  /**
   * Intended product status for initial integration.
   * Must be EXTERNAL_SUPPORTED (read-only) for non-Axiom-issued assets.
   */
  intendedProductStatus: CommodityProductStatus;
  /** Integration is read-only (no write paths, no swaps, no deposits) — must be true for external */
  intendedReadOnly: boolean;
  /** Axiom will issue this token — false for all external candidates */
  axiomWillIssue: boolean;
  /** Estimated integration friction: "LOW", "MEDIUM", "HIGH" */
  integrationFriction: 'LOW' | 'MEDIUM' | 'HIGH';

  // ── Page / API / portfolio / insights integration ────────────────────────────
  /** A detail page (/commodities/<symbol>) will be created */
  pageRequired: boolean;
  /** API status route will be created */
  apiStatusRequired: boolean;
  /** API balance route will be created (optional for externals) */
  apiBalanceRequired: boolean;
  /** Asset will appear in commodity insights layer */
  insightsIntegrationRequired: boolean;
  /** Asset will appear in portfolio / real-assets view */
  portfolioIntegrationRequired: boolean;

  // ── Rejection / blockers ─────────────────────────────────────────────────────
  /** Known blockers that prevent admission (empty array if none) */
  blockers: string[];

  // ── Documentation ────────────────────────────────────────────────────────────
  /** Evidence package URL or internal document path; empty string if none */
  evidencePackageRef: string;
  /** Free-text notes from the evaluating operator */
  operatorNotes: string;

  // ── Metadata ────────────────────────────────────────────────────────────────
  /** ISO 8601 date when this candidate record was created */
  createdAt: string;
  /** Operator ID or alias who created this record */
  createdBy: string;
}

// ─── Admission result ──────────────────────────────────────────────────────────

export interface AdmissionCheckResult {
  /** Field name checked */
  field: string;
  /** Whether the check passed */
  passed: boolean;
  /** Human-readable note explaining the result */
  note: string;
}

export interface CommodityAdmissionResult {
  symbol: string;
  name: string;
  /** Overall readiness classification */
  readiness: AdmissionReadiness;
  /** Maturity classification */
  maturity: AdmissionMaturity;
  /** Risk classification */
  risk: AdmissionRisk;
  /** Per-field check results */
  checks: AdmissionCheckResult[];
  /** Checks that failed */
  failures: AdmissionCheckResult[];
  /** Checks that passed */
  passes: AdmissionCheckResult[];
  /** Disclosure completeness score (0–100) */
  disclosureCompleteness: number;
  /** Whether the disclosure package is complete */
  disclosureComplete: boolean;
  /** Unresolved blockers from candidate.blockers */
  openBlockers: string[];
  /** Advisory summary */
  summary: string;
  /** Timestamp when the admission was evaluated */
  evaluatedAt: string;
}

// ─── Validation helpers ────────────────────────────────────────────────────────

function check(
  field: string,
  passed: boolean,
  passNote: string,
  failNote: string,
): AdmissionCheckResult {
  return { field, passed, note: passed ? passNote : failNote };
}

/**
 * runAdmissionChecks — evaluate all structured fields of a candidate and return
 * per-field check results.
 */
export function runAdmissionChecks(
  c: CommodityAdmissionCandidate,
): AdmissionCheckResult[] {
  return [
    // Identity
    check('symbol', c.symbol.length > 0 && c.symbol === c.symbol.toUpperCase(),
      'Symbol is non-empty and uppercase.',
      'Symbol must be non-empty and uppercase (e.g. "PAXG").'),
    check('name', c.name.trim().length > 0,
      'Asset name is present.',
      'Asset name is required.'),
    check('issuer', c.issuer.trim().length > 0,
      'Issuer is identified.',
      'Issuer must be identified.'),
    check('chain', c.chain.trim().length > 0,
      'Chain is specified.',
      'Chain must be specified.'),

    // Issuer verification
    check('issuerRegulated', c.issuerRegulated,
      'Issuer is regulated.',
      'Issuer is not confirmed as regulated — additional diligence required.'),
    check('issuerJurisdiction', c.issuerJurisdiction.trim().length > 0,
      'Issuer jurisdiction is stated.',
      'Issuer jurisdiction must be stated.'),
    check('issuerPublicDocumentation', c.issuerPublicDocumentation,
      'Issuer has public documentation.',
      'Issuer public documentation is missing — diligence blocker.'),

    // Contract verification
    check('contractVerified', c.contractVerified,
      'Contract is verified on block explorer.',
      'Contract is not verified on a block explorer — diligence blocker.'),
    check('contractAudited', c.contractAudited,
      'Contract has a security audit.',
      'No contract audit on file — integration risk without audit.'),

    // Pricing source
    check('pricingSource', c.pricingSource.trim().length > 0,
      'Pricing source is identified.',
      'Pricing source must be identified.'),
    check('pricingReferenceOnly', c.pricingReferenceOnly,
      'Pricing is explicitly reference-only.',
      'Pricing must be reference-only — no buy/sell signals.'),
    check('onChainOracleAvailable', c.onChainOracleAvailable,
      'On-chain oracle is available.',
      'No on-chain oracle — pricing may rely on off-chain feeds only; document fallback.'),

    // Reserve / backing
    check('reserveDisclosed', c.reserveDisclosed,
      'Reserve/backing is publicly disclosed.',
      'Reserve/backing disclosure is missing — diligence blocker.'),
    check('proofOfReservesAvailable', c.proofOfReservesAvailable,
      'Proof-of-reserves or equivalent attestation is available.',
      'No proof-of-reserves available — document reserve model clearly.'),
    check('custodianRegulated', c.custodianRegulated,
      'Custodian is a regulated qualified custodian.',
      'Custodian is not confirmed as regulated — higher custody risk.'),
    check('reserveDescription', c.reserveDescription.trim().length > 0,
      'Reserve/backing description is present.',
      'Reserve/backing description is required.'),

    // Integration scope
    check('intendedReadOnly', c.intendedReadOnly,
      'Integration is read-only as required.',
      'Integration must be read-only for external commodity assets. No write paths.'),
    check('axiomWillIssue_false', !c.axiomWillIssue,
      'Axiom is not the issuer — correct for external integration.',
      'axiomWillIssue is true — requires separate governance vote and launch gate.'),
    check('intendedProductStatus', c.intendedProductStatus === 'EXTERNAL_SUPPORTED' || c.intendedProductStatus === 'DEFERRED',
      `Intended product status (${c.intendedProductStatus}) is appropriate for a candidate.`,
      `Intended product status must be EXTERNAL_SUPPORTED or DEFERRED for admission candidates. Got: ${c.intendedProductStatus}.`),

    // Blockers
    check('noOpenBlockers', c.blockers.length === 0,
      'No open blockers.',
      `${c.blockers.length} open blocker(s) on file — must be resolved before admission.`),

    // Evidence
    check('evidencePackageRef', c.evidencePackageRef.trim().length > 0,
      'Evidence package reference is on file.',
      'Evidence package reference is missing — document the diligence evidence.'),
  ];
}

// ─── Disclosure completeness ───────────────────────────────────────────────────

/** Weighted disclosure fields (field name → weight out of 100) */
const DISCLOSURE_WEIGHTS: Array<{ field: keyof CommodityAdmissionCandidate; weight: number }> = [
  { field: 'reserveDisclosed', weight: 20 },
  { field: 'proofOfReservesAvailable', weight: 15 },
  { field: 'custodianRegulated', weight: 15 },
  { field: 'issuerPublicDocumentation', weight: 15 },
  { field: 'contractVerified', weight: 10 },
  { field: 'contractAudited', weight: 10 },
  { field: 'onChainOracleAvailable', weight: 10 },
  { field: 'pricingReferenceOnly', weight: 5 },
];

/**
 * computeDisclosureCompleteness — weighted score (0–100) of disclosure fields.
 * 100 = all disclosure evidence present.
 */
export function computeDisclosureCompleteness(c: CommodityAdmissionCandidate): number {
  let score = 0;
  for (const { field, weight } of DISCLOSURE_WEIGHTS) {
    if (c[field] === true) {
      score += weight;
    }
  }
  return score;
}

// ─── Maturity classifier ───────────────────────────────────────────────────────

/**
 * classifyMaturity — derive the admission maturity label from candidate fields.
 */
export function classifyMaturity(c: CommodityAdmissionCandidate): AdmissionMaturity {
  if (c.axiomWillIssue && c.intendedProductStatus === 'LIVE') return 'production';
  if (c.intendedProductStatus === 'EXTERNAL_SUPPORTED') return 'external-live';
  if (c.intendedProductStatus === 'DEPLOYED_INACTIVE') return 'inactive';
  if (c.intendedProductStatus === 'NOT_LIVE_NOT_ISSUED') return 'not-issued';
  return 'deferred';
}

// ─── Risk classifier ───────────────────────────────────────────────────────────

/**
 * classifyRisk — derive a risk classification based on the candidate's fields.
 * This is advisory only and does not replace the Commodity Risk Scoring engine
 * (lib/commodity/riskScoring.ts, Section 10 of COMMODITY_EXPANSION_FRAMEWORK.md).
 */
export function classifyRisk(c: CommodityAdmissionCandidate): AdmissionRisk {
  // Hard disqualifiers
  if (c.axiomWillIssue && c.intendedProductStatus !== 'LIVE') return 'DISQUALIFIED';
  if (!c.intendedReadOnly && !c.axiomWillIssue) return 'DISQUALIFIED';

  // Count critical missing evidence
  const criticalMissing = [
    !c.reserveDisclosed,
    !c.issuerPublicDocumentation,
    !c.contractVerified,
    !c.pricingReferenceOnly,
    c.blockers.length >= 3,
  ].filter(Boolean).length;

  if (criticalMissing >= 3) return 'HIGH';

  // Count medium concerns
  const mediumConcerns = [
    !c.contractAudited,
    !c.proofOfReservesAvailable,
    !c.custodianRegulated,
    !c.onChainOracleAvailable,
    c.blockers.length >= 1,
  ].filter(Boolean).length;

  if (criticalMissing >= 1 || mediumConcerns >= 3) return 'MEDIUM';

  return 'LOW';
}

// ─── Readiness classifier ──────────────────────────────────────────────────────

/**
 * classifyReadiness — derive the overall admission readiness classification.
 *
 * READY_NOW       — all critical evidence present; no open blockers; risk LOW
 * NEEDS_DILIGENCE — some evidence missing or medium risk; open blockers < 3
 * OUT_OF_SCOPE    — hard disqualifiers present or HIGH/DISQUALIFIED risk
 */
export function classifyReadiness(
  c: CommodityAdmissionCandidate,
  risk: AdmissionRisk,
  checks: AdmissionCheckResult[],
): AdmissionReadiness {
  if (risk === 'DISQUALIFIED' || risk === 'HIGH') return 'OUT_OF_SCOPE';

  const criticalFailures = checks.filter(
    (ch) =>
      !ch.passed &&
      [
        'reserveDisclosed',
        'pricingReferenceOnly',
        'intendedReadOnly',
        'axiomWillIssue_false',
        'intendedProductStatus',
      ].includes(ch.field),
  );
  if (criticalFailures.length > 0) return 'OUT_OF_SCOPE';

  const allPassed = checks.every((ch) => ch.passed);
  if (allPassed && risk === 'LOW') return 'READY_NOW';

  return 'NEEDS_DILIGENCE';
}

// ─── Main evaluation entrypoint ────────────────────────────────────────────────

/**
 * evaluateAdmission — run all checks on a candidate and return a full
 * CommodityAdmissionResult.
 *
 * This is the primary entrypoint for the admissions pipeline. The result is
 * advisory only. Admission requires governance approval and launch-gate sign-off.
 */
export function evaluateAdmission(c: CommodityAdmissionCandidate): CommodityAdmissionResult {
  const checks = runAdmissionChecks(c);
  const failures = checks.filter((ch) => !ch.passed);
  const passes = checks.filter((ch) => ch.passed);
  const disclosureCompleteness = computeDisclosureCompleteness(c);
  const disclosureComplete = disclosureCompleteness >= 80;
  const maturity = classifyMaturity(c);
  const risk = classifyRisk(c);
  const readiness = classifyReadiness(c, risk, checks);

  const openBlockers = [...c.blockers];

  let summary: string;
  switch (readiness) {
    case 'READY_NOW':
      summary =
        `${c.symbol} has passed all admission checks (${passes.length}/${checks.length}). ` +
        `Disclosure completeness: ${disclosureCompleteness}/100. ` +
        'Candidate may proceed to governance vote and launch-gate diligence. ' +
        'Advisory only — governance approval required.';
      break;
    case 'NEEDS_DILIGENCE':
      summary =
        `${c.symbol} requires further diligence before admission. ` +
        `${failures.length} check(s) failed. ` +
        `Disclosure completeness: ${disclosureCompleteness}/100. ` +
        'Resolve all failures and open blockers before proceeding.';
      break;
    case 'OUT_OF_SCOPE':
      summary =
        `${c.symbol} is classified OUT_OF_SCOPE. ` +
        `Risk: ${risk}. ` +
        `${failures.length} check(s) failed. ` +
        'Candidate is structurally incompatible or has hard blockers. ' +
        'Do not proceed without resolving critical failures and re-evaluating.';
      break;
  }

  return {
    symbol: c.symbol,
    name: c.name,
    readiness,
    maturity,
    risk,
    checks,
    failures,
    passes,
    disclosureCompleteness,
    disclosureComplete,
    openBlockers,
    summary,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── Comparison utility ────────────────────────────────────────────────────────

export interface CandidateComparisonRow {
  symbol: string;
  name: string;
  issuer: string;
  chain: string;
  contractVerified: boolean;
  pricingSource: string;
  reserveDisclosed: boolean;
  custodianRegulated: boolean;
  integrationFriction: 'LOW' | 'MEDIUM' | 'HIGH';
  disclosureCompleteness: number;
  readiness: AdmissionReadiness;
  risk: AdmissionRisk;
  openBlockerCount: number;
  blockerSummary: string;
}

/**
 * buildComparisonTable — generate a comparison table across multiple admission
 * candidates. Intended for internal/operator use only. Do NOT expose this
 * table on public-facing pages or APIs.
 *
 * No candidate in this table is publicly supported unless it has been through
 * the full governance approval and launch-gate process and has been added to
 * lib/commodities/registry.ts with an appropriate productStatus.
 */
export function buildComparisonTable(
  candidates: CommodityAdmissionCandidate[],
): CandidateComparisonRow[] {
  return candidates.map((c) => {
    const checks = runAdmissionChecks(c);
    const risk = classifyRisk(c);
    const readiness = classifyReadiness(c, risk, checks);
    const disclosureCompleteness = computeDisclosureCompleteness(c);

    return {
      symbol: c.symbol,
      name: c.name,
      issuer: c.issuer,
      chain: c.chain,
      contractVerified: c.contractVerified,
      pricingSource: c.pricingSource,
      reserveDisclosed: c.reserveDisclosed,
      custodianRegulated: c.custodianRegulated,
      integrationFriction: c.integrationFriction,
      disclosureCompleteness,
      readiness,
      risk,
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

// ─── Known reference snapshots ─────────────────────────────────────────────────

/**
 * KNOWN_ASSETS_ADMISSION_SNAPSHOTS — pre-built admission records for the three
 * already-classified assets (AXAU, KAG, AXAG). These are provided for operator
 * reference and pipeline testing. They are NOT new admissions — all three are
 * already classified in lib/commodities/registry.ts.
 *
 * Do NOT use these to alter the registry or change any asset's status.
 */
export const KNOWN_ASSETS_ADMISSION_SNAPSHOTS: CommodityAdmissionCandidate[] = [
  {
    // AXAU — already live; included as a reference "passing" example
    symbol: 'AXAU',
    name: 'Axiom Gold Reserve',
    category: 'GOLD',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    contractAddress: '0x6b22DE1AeFE6D52Ce64598E1Fb1a9cBa3D9eB5A4',
    issuerRegulated: true,
    issuerJurisdiction: 'Axiom Protocol entity',
    issuerPublicDocumentation: true,
    issuerVerificationNotes: 'Axiom Protocol is the issuer. On-chain contracts verified on Arbiscan.',
    contractVerified: true,
    contractExplorerUrl: 'https://arbiscan.io/address/0x6b22DE1AeFE6D52Ce64598E1Fb1a9cBa3D9eB5A4',
    contractAudited: true,
    contractAuditFirm: 'Internal + pending third-party audit',
    contractVerificationNotes: 'AXGoldVault, NAVEngine, MintRedeemController all verified on Arbiscan.',
    pricingSource: 'CoinGecko pax-gold / Chainlink XAU/USD (Arbitrum One)',
    onChainOracleAvailable: true,
    oracleProvider: 'Chainlink XAU/USD',
    pricingReferenceOnly: true,
    pricingNotes: 'CoinGecko pax-gold reference + Chainlink on-chain oracle. NAV published by NAVEngine.',
    reserveDisclosed: true,
    proofOfReservesAvailable: true,
    reserveAttestationFrequency: 'on-chain / continuous',
    custodianRegulated: true,
    custodianName: 'PAXG (Paxos) + direct custodied gold',
    reserveDescription:
      'Gold reserves held via PAXG (PAX Gold ERC-20) and direct custodied gold. NAV published on-chain by NAVEngine. Coverage ratio enforced by MintRedeemController.',
    reserveNotes: 'Authoritative on-chain NAV governs.',
    intendedProductStatus: 'LIVE',
    intendedReadOnly: false,
    axiomWillIssue: true,
    integrationFriction: 'LOW',
    pageRequired: true,
    apiStatusRequired: true,
    apiBalanceRequired: true,
    insightsIntegrationRequired: true,
    portfolioIntegrationRequired: true,
    blockers: [],
    evidencePackageRef: 'documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md',
    operatorNotes: 'Reference snapshot only. AXAU is already LIVE. No admission action required.',
    createdAt: '2026-05-01',
    createdBy: 'axiom-ops',
  },
  {
    // KAG — already EXTERNAL_SUPPORTED; included as a reference example
    symbol: 'KAG',
    name: 'Kinesis Silver',
    category: 'SILVER',
    issuer: 'KMS Labs / Kinesis ecosystem',
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    issuerRegulated: true,
    issuerJurisdiction: 'KMS Labs (Kinesis ecosystem)',
    issuerPublicDocumentation: true,
    issuerVerificationNotes: 'KMS Labs is a publicly documented issuer within the Kinesis ecosystem.',
    contractVerified: true,
    contractExplorerUrl: 'https://etherscan.io/address/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    contractAudited: true,
    contractAuditFirm: 'Kinesis ecosystem audit — refer to KMS Labs',
    contractVerificationNotes: 'Contract verified on Etherscan.',
    pricingSource: 'CoinGecko kinesis-silver (USD per gram)',
    onChainOracleAvailable: false,
    oracleProvider: '',
    pricingReferenceOnly: true,
    pricingNotes: 'CoinGecko kinesis-silver direct. No on-chain oracle for KAG; off-chain reference price only.',
    reserveDisclosed: true,
    proofOfReservesAvailable: true,
    reserveAttestationFrequency: 'published by KMS Labs / Kinesis',
    custodianRegulated: true,
    custodianName: 'Kinesis ecosystem custodian',
    reserveDescription: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver. Issued and custodied by KMS Labs within the Kinesis ecosystem.',
    reserveNotes: 'Axiom does not issue or custody KAG. Read-only support only.',
    intendedProductStatus: 'EXTERNAL_SUPPORTED',
    intendedReadOnly: true,
    axiomWillIssue: false,
    integrationFriction: 'LOW',
    pageRequired: true,
    apiStatusRequired: true,
    apiBalanceRequired: true,
    insightsIntegrationRequired: true,
    portfolioIntegrationRequired: true,
    blockers: [],
    evidencePackageRef: 'documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md',
    operatorNotes: 'Reference snapshot only. KAG is already EXTERNAL_SUPPORTED. No admission action required.',
    createdAt: '2026-05-01',
    createdBy: 'axiom-ops',
  },
  {
    // AXAG — NOT LIVE AND NOT ISSUED; included to show what OUT_OF_SCOPE looks like
    symbol: 'AXAG',
    name: 'Axiom Silver Reserve (Not Issued)',
    category: 'SILVER',
    issuer: 'n/a',
    chain: 'n/a',
    contractAddress: '',
    issuerRegulated: false,
    issuerJurisdiction: 'n/a',
    issuerPublicDocumentation: false,
    issuerVerificationNotes: 'AXAG is not issued. No issuer to verify.',
    contractVerified: false,
    contractExplorerUrl: '',
    contractAudited: false,
    contractAuditFirm: '',
    contractVerificationNotes: 'AXAG is not deployed. No contract to verify.',
    pricingSource: 'n/a (not issued)',
    onChainOracleAvailable: false,
    oracleProvider: '',
    pricingReferenceOnly: true,
    pricingNotes: 'AXAG has no price. Not issued.',
    reserveDisclosed: false,
    proofOfReservesAvailable: false,
    reserveAttestationFrequency: 'none',
    custodianRegulated: false,
    custodianName: '',
    reserveDescription: 'No reserve. AXAG is not issued.',
    reserveNotes: 'AXAG is deferred. Custody resolution required before any future admission.',
    intendedProductStatus: 'NOT_LIVE_NOT_ISSUED',
    intendedReadOnly: true,
    axiomWillIssue: false,
    integrationFriction: 'HIGH',
    pageRequired: false,
    apiStatusRequired: false,
    apiBalanceRequired: false,
    insightsIntegrationRequired: false,
    portfolioIntegrationRequired: false,
    blockers: [
      'AXAG is not issued — no token exists on any chain',
      'Custody resolution required before any future admission',
      'Governance proposal required before any AXAG activation',
    ],
    evidencePackageRef: 'documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md',
    operatorNotes:
      'AXAG remains NOT_LIVE_NOT_ISSUED. This snapshot is provided to show what a deferred/out-of-scope record looks like. ' +
      'Do not activate AXAG without governance approval and launch-gate sign-off.',
    createdAt: '2026-05-01',
    createdBy: 'axiom-ops',
  },
];
