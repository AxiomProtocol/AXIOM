/**
 * lib/reserves/phase2/types.ts
 *
 * Phase 2 — Reserve and Collateral Registry type definitions.
 *
 * Governance invariants (do not relax without reserve-control governance vote):
 *   1. Only LIVE assets may count toward AXUSD reserve backing.
 *   2. PLANNED assets must NEVER inflate live coverage ratios.
 *   3. OPERATOR_TREASURY sleeve assets are excluded from AXUSD backing
 *      unless explicitly promoted by the reserve-control layer.
 *   4. AxiomTreasuryVault AUM is INTERNAL_ONLY until explicitly promoted.
 *   5. WETH is not reserve-eligible unless explicitly risk-approved (price-volatile,
 *      no fixed AXUSD redemption peg).
 *   6. AxiomTreasuryVault is INTERNAL operator capital management infrastructure.
 *      Its AUM does NOT count as AXUSD backing in any report.
 */

// ── Reserve Sleeve Types ──────────────────────────────────────────────────────

export type ReserveSleeve =
  | 'USDC_PSM'                           // Live — CanonicalPSM USDC backing (primary)
  | 'TOKENIZED_TBILL'                    // Planned — tokenized T-bill instruments
  | 'TOKENIZED_TREASURY_FUND'            // Planned — tokenized Treasury money market funds
  | 'TOKENIZED_GOVERNMENT_MONEY_MARKET'  // Planned — tokenized government MMFs
  | 'TOKENIZED_GOLD'                     // Future — AXAU or tokenized gold (commodity)
  | 'CASH_EQUIVALENT'                    // Live — fiat or stablecoin equivalents
  | 'OPERATOR_TREASURY'                  // Internal — AxiomTreasuryVault yield positions (EXCLUDED)
  | 'OTHER_RWA';                         // Future — other approved real-world asset collateral

export const RESERVE_SLEEVE_LABELS: Record<ReserveSleeve, string> = {
  USDC_PSM:                           'USDC PSM',
  TOKENIZED_TBILL:                    'Tokenized T-Bill',
  TOKENIZED_TREASURY_FUND:            'Tokenized Treasury Fund',
  TOKENIZED_GOVERNMENT_MONEY_MARKET:  'Tokenized Gov\'t Money Market',
  TOKENIZED_GOLD:                     'Tokenized Gold',
  CASH_EQUIVALENT:                    'Cash Equivalent',
  OPERATOR_TREASURY:                  'Operator Treasury',
  OTHER_RWA:                          'Other RWA',
};

/** Sleeves eligible to count toward AXUSD backing. OPERATOR_TREASURY is excluded. */
export const AXUSD_ELIGIBLE_SLEEVES: ReserveSleeve[] = [
  'USDC_PSM',
  'CASH_EQUIVALENT',
  // NOTE: TOKENIZED_TBILL, TOKENIZED_TREASURY_FUND, TOKENIZED_GOVERNMENT_MONEY_MARKET,
  //       TOKENIZED_GOLD, OTHER_RWA are only eligible when assets transition to LIVE
  //       and receive explicit reserve-control approval. They are NOT automatically eligible.
];

// ── Reserve Asset Status ──────────────────────────────────────────────────────

export type ReserveAssetStatus =
  | 'LIVE'           // Active — eligible to count in live reserve ratios (also requires isLive=true)
  | 'PLANNED'        // Not yet deployed — must NEVER count in live coverage
  | 'DISABLED'       // Temporarily suspended — excluded from all accounting
  | 'DEPRECATED'     // Retired — excluded from all accounting permanently
  | 'INTERNAL_ONLY'; // Operator/internal use only — excluded from public reserve reports

export const RESERVE_ASSET_STATUS_LABELS: Record<ReserveAssetStatus, string> = {
  LIVE:          'Live',
  PLANNED:       'Planned',
  DISABLED:      'Disabled',
  DEPRECATED:    'Deprecated',
  INTERNAL_ONLY: 'Internal Only',
};

// ── Custody Types ────────────────────────────────────────────────────────────

export type CustodyType =
  | 'SELF_CUSTODY_EOA'        // Protocol-controlled EOA
  | 'MULTISIG'                // Multi-party threshold wallet
  | 'INSTITUTIONAL_CUSTODIAN' // BitGo, Fireblocks, Anchorage, etc.
  | 'SMART_CONTRACT'          // Held in verified smart contract (PSM, vault, etc.)
  | 'EXCHANGE'                // Exchange account (operational, not reserve-eligible)
  | 'UNKNOWN';                // Not yet determined

// ── Valuation Source ─────────────────────────────────────────────────────────

export type ValuationSource =
  | 'STABLE_PEG'       // $1.00 fixed (USDC, USDT)
  | 'CHAINLINK_ORACLE' // On-chain Chainlink price feed
  | 'NAV_ORACLE'       // On-chain NAV engine (AXAU, T-bill NAV)
  | 'COINGECKO'        // CoinGecko API (off-chain)
  | 'CUSTODIAN_DB'     // Custodian-reported snapshot
  | 'MANUAL'           // Manually attested value
  | 'PLACEHOLDER';     // Not yet implemented

// ── Attestation Status ────────────────────────────────────────────────────────

export type AttestationStatus =
  | 'NONE'           // No attestation configured or required
  | 'PENDING'        // Attestation requested, not yet received
  | 'CURRENT'        // Attestation current and within freshness window
  | 'STALE'          // Past attestation freshness threshold
  | 'FAILED'         // Attestation request failed or rejected
  | 'MANUAL_REVIEW'; // Requires human review before accepting

// ── Reconciliation Status ────────────────────────────────────────────────────

export type ReconciliationStatus =
  | 'NOT_REQUIRED' // No periodic reconciliation required
  | 'PENDING'      // Due or in progress
  | 'CURRENT'      // Within acceptable window
  | 'OVERDUE'      // Past due
  | 'FAILED';      // Last run produced a discrepancy

// ── Disclosure Status ────────────────────────────────────────────────────────

export type DisclosureStatus =
  | 'PUBLIC'          // Shown on public reserve dashboard
  | 'OPERATOR_ONLY'   // Operator dashboard only
  | 'INTERNAL'        // Not displayed anywhere public
  | 'PENDING_REVIEW'; // Under legal/compliance review

// ── Haircut Policy ────────────────────────────────────────────────────────────

export interface HaircutPolicy {
  /** Haircut in basis points (100 bps = 1%). Applied to gross value. */
  haircutBps: number;
  /** Maximum share of total eligible reserves this asset may represent, in bps. */
  maxAllocationBps: number;
  /** Emergency disable — if true, immediately exclude from reserve accounting. */
  emergencyDisabled: boolean;
  /** If true, valuation is stale; exclude until refreshed. */
  staleValuation: boolean;
  /** If true, requires human approval before inclusion. */
  manualReviewRequired: boolean;
  haircutRationale: string;
}

// ── Custody Metadata ─────────────────────────────────────────────────────────

export interface CustodyMetadata {
  custodyType: CustodyType;
  custodyVenue: string;
  custodyWallet?: string;
  custodyProofSource: string;
  attestationUrlOrCid?: string;
  attestationTimestamp?: string;
  attestationStatus: AttestationStatus;
  lastReconciliationTimestamp?: string;
  reconciliationStatus: ReconciliationStatus;
}

// ── Approved Reserve Asset (canonical registry entry) ────────────────────────

export interface ApprovedReserveAsset {
  id: string;
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
  chainId: number;

  // Classification
  sleeve: ReserveSleeve;
  status: ReserveAssetStatus;
  disclosureStatus: DisclosureStatus;

  // Eligibility flags
  /**
   * True only when status=LIVE and the asset has passed all eligibility gates.
   * PLANNED, DISABLED, DEPRECATED, INTERNAL_ONLY assets must set isLive=false.
   * isLive=false means eligibleReserveValueUsd is always 0.
   */
  isLive: boolean;
  isPlanned: boolean;
  /** Supports AXUSD redemption (Phase 4 feature — not wired yet). */
  isRedeemable: boolean;
  /** May be used as collateral to mint AXUSD (Phase 4 feature — not wired yet). */
  isMintEligible: boolean;
  isDisclosureEligible: boolean;

  // Valuation
  valuationSource: ValuationSource;
  priceUsdPerUnit: number | null;
  currentBalance: number | null;
  /** grossValueUsd = priceUsdPerUnit * currentBalance (null if either is null). */
  grossValueUsd: number | null;
  lastValuedAt: string | null;

  // Haircut & eligibility
  haircutPolicy: HaircutPolicy;
  /**
   * Eligible reserve value after haircut.
   * = grossValueUsd * (1 - haircutBps / 10_000)
   * Always 0 when: !isLive, emergencyDisabled, staleValuation, manualReviewRequired,
   *                sleeve === 'OPERATOR_TREASURY'.
   */
  eligibleReserveValueUsd: number;

  // Custody & attestation
  custody: CustodyMetadata;

  // Notes
  adminNotes: string;
  metadataUri?: string;

  /**
   * Explicit admission gate. When false, the asset is EXCLUDED from live reserve
   * accounting regardless of status or isLive flags.
   *
   * Use case: TOKENIZED_TBILL/TOKENIZED_TREASURY_FUND/TOKENIZED_GOVERNMENT_MONEY_MARKET
   * assets are blocked (admissionGateOpen=false) until Phase 1 compliance gaps are
   * resolved in code:
   *   - LendingPlatformModule whitelist enforcement
   *   - CountryAllowModule country-code-0 pass-through
   *   - TransferLimitModule tier-3 assignment
   *
   * When undefined, treated as open (true). Must be explicitly set to false to block.
   */
  admissionGateOpen?: boolean;

  lastUpdatedAt: string;
  addedAt: string;
}

// ── Reserve Sleeve Aggregate ─────────────────────────────────────────────────

export interface ReserveSleeveAggregate {
  sleeve: ReserveSleeve;
  sleeveName: string;
  sleeveDescription: string;
  isEligibleForAxusdBacking: boolean;
  assets: ApprovedReserveAsset[];
  grossValueUsd: number;
  eligibleReserveValueUsd: number;
  liveAssetCount: number;
  plannedAssetCount: number;
  excludedAssetCount: number;
  publicLabel: string;
  disclosureCaution?: string;
}

// ── Reserve Manager Summary ──────────────────────────────────────────────────

export interface ReserveManagerSummary {
  fetchedAt: string;
  totalGrossValueUsd: number;
  liveGrossValueUsd: number;
  /** Eligible AXUSD reserve value (LIVE, non-OPERATOR_TREASURY, after haircuts). */
  eligibleReserveValueUsd: number;
  canonicalPsmReserveUsd: number;
  /** Must never be added to eligibleReserveValueUsd for live coverage calculations. */
  plannedGrossValueUsd: number;
  /** Excluded from AXUSD backing per governance invariant. */
  operatorTreasuryValueUsd: number;
  excludedValueUsd: number;
  sleeves: ReserveSleeveAggregate[];
  totalAssetCount: number;
  liveAssetCount: number;
  plannedAssetCount: number;
  excludedAssetCount: number;
  internalOnlyAssetCount: number;
  coverageInputs: {
    eligibleReserveValueUsd: number;
    denominatorNote: string;
  };
  methodology: string;
  warnings: string[];
}

// ── Reserve Coverage Result ──────────────────────────────────────────────────

export interface ReserveCoverageResult {
  fetchedAt: string;
  eligibleReserveValueUsd: number;
  axusdCirculatingSupply: number | null;
  coverageRatio: number | null;
  coverageRatioFormatted: string;
  breakdown: {
    canonicalPsmUsd: number;
    plannedTbillUsd: number;
    plannedTreasuryFundUsd: number;
    operatorTreasuryUsd: number;
    excludedUsd: number;
  };
  warnings: string[];
  methodology: string;
}

// ── Attestation Status Summary ────────────────────────────────────────────────

export interface AttestationStatusEntry {
  assetSymbol: string;
  sleeve: ReserveSleeve;
  status: ReserveAssetStatus;
  attestationStatus: AttestationStatus;
  reconciliationStatus: ReconciliationStatus;
  attestationTimestamp: string | null;
  lastReconciliationTimestamp: string | null;
  custodyVenue: string;
  notes: string;
}

export interface AttestationStatusSummary {
  fetchedAt: string;
  assets: AttestationStatusEntry[];
  summary: {
    current: number;
    pending: number;
    stale: number;
    failed: number;
    manualReview: number;
    none: number;
  };
}
