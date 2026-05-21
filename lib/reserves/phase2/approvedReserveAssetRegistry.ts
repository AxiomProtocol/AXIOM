/**
 * lib/reserves/phase2/approvedReserveAssetRegistry.ts
 *
 * Phase 2 — ApprovedReserveAssetRegistry
 *
 * In-memory seed registry for approved AXUSD reserve assets.
 * Phase 3 should replace this seed with DB-backed reads from the
 * `reserve_approved_assets` table (see shared/reserveRegistrySchema.ts).
 *
 * Governance invariants enforced here:
 *   1. PLANNED assets always have eligibleReserveValueUsd === 0.
 *   2. OPERATOR_TREASURY sleeve assets always have eligibleReserveValueUsd === 0.
 *   3. DISABLED / DEPRECATED / INTERNAL_ONLY assets always have eligibleReserveValueUsd === 0.
 *   4. Zero-address assets are rejected by computeEligibleValue().
 *   5. Haircut bps must be 0–10000; max allocation bps must be 0–10000.
 *   6. AxiomTreasuryVault assets are tagged INTERNAL_ONLY + OPERATOR_TREASURY.
 *
 * Compliance gap notes (from Phase 1 audit):
 *   Scope: TOKENIZED_TBILL sleeve only. TOKENIZED_GOLD (PAXG) is NOT blocked by these gaps.
 *
 *   - LendingPlatformModule whitelist does not enforce platform restrictions.
 *     Impact: TOKENIZED_TBILL sleeve cannot rely on on-chain compliance gating alone.
 *   - CountryAllowModule treats country code 0 as pass-through.
 *     Impact: Future T-Bill participants must be verified off-chain until this is fixed.
 *   - TransferLimitModule defines institutional tier 3 but does not assign it.
 *     Impact: Transfer limit controls are not fully operational for T-Bill holders.
 *   These gaps must be resolved before any TOKENIZED_TBILL asset goes LIVE.
 *
 * Phase 4 admission — PAXG (TOKENIZED_GOLD):
 *   PAXG admitted to LIVE status after:
 *     (a) Chainlink XAU/USD live feed connected (lib/reserves/phase3/feeds/chainlinkXauUsd.ts)
 *     (b) BitGo on-chain PAXG token attestation via ERC-20 balanceOf() (not ETH gas balance)
 *     (c) Dual-counting guard: PAXG in AXUSD reserve is a SEPARATE SLEEVE from PAXG in
 *         CanonicalReserveSnapshot hard-asset numerator. Accounting code must ensure the
 *         same PAXG balance is not counted in both CanonicalReserveSnapshot coverage AND
 *         AXUSD Phase 3 reserve simultaneously. See haircutPolicy.haircutRationale.
 */

import type { ApprovedReserveAsset, HaircutPolicy, CustodyMetadata } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();
const ARBITRUM_ONE = 42161;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

/**
 * Compute eligible reserve value after haircut.
 * Returns 0 in all exclusion cases (planned, disabled, operator treasury, etc.)
 */
export function computeEligibleValue(
  assetAddress: string,
  grossValueUsd: number | null,
  haircutPolicy: HaircutPolicy,
  isLive: boolean,
  sleeve: string,
): number {
  // Reject zero address
  if (!assetAddress || assetAddress === ZERO_ADDR) return 0;
  // Reject non-live
  if (!isLive) return 0;
  // Reject operator treasury sleeve
  if (sleeve === 'OPERATOR_TREASURY') return 0;
  // Reject if gross value is null or zero
  if (grossValueUsd === null || grossValueUsd <= 0) return 0;
  // Reject emergency disabled
  if (haircutPolicy.emergencyDisabled) return 0;
  // Reject stale valuation
  if (haircutPolicy.staleValuation) return 0;
  // Reject manual review required
  if (haircutPolicy.manualReviewRequired) return 0;
  // Validate haircut bps bounds (0–10000)
  const bps = Math.max(0, Math.min(10_000, haircutPolicy.haircutBps));
  return grossValueUsd * (1 - bps / 10_000);
}

/**
 * Validate a haircut policy object.
 * Throws on unsafe values.
 */
export function validateHaircutPolicy(policy: HaircutPolicy, symbol: string): void {
  if (policy.haircutBps < 0 || policy.haircutBps > 10_000) {
    throw new Error(`${symbol}: haircutBps must be 0–10000, got ${policy.haircutBps}`);
  }
  if (policy.maxAllocationBps < 0 || policy.maxAllocationBps > 10_000) {
    throw new Error(`${symbol}: maxAllocationBps must be 0–10000, got ${policy.maxAllocationBps}`);
  }
}

// ── Shared haircut policies ───────────────────────────────────────────────────

const USDC_HAIRCUT: HaircutPolicy = {
  haircutBps:            0,
  maxAllocationBps:      10_000,
  emergencyDisabled:     false,
  staleValuation:        false,
  manualReviewRequired:  false,
  haircutRationale:
    'USDC is a regulated USD stablecoin with a $1.00 fixed peg. ' +
    'Zero haircut applied via CanonicalPSM sleeve (1:1 AXUSD mint). ' +
    'No price-volatility risk in normal market conditions.',
};

const TBILL_HAIRCUT: HaircutPolicy = {
  haircutBps:            250,   // 2.5% conservative haircut
  maxAllocationBps:      4_000, // max 40% of eligible reserve
  emergencyDisabled:     false,
  staleValuation:        false,
  manualReviewRequired:  true,  // Must be reviewed before going LIVE
  haircutRationale:
    'Tokenized T-bill. NAV oracle not yet live. Conservative 2.5% haircut ' +
    'accounts for redemption friction and NAV staleness risk. ' +
    'manualReviewRequired=true until Phase 3 oracle is deployed.',
};

const TBILL_FUND_HAIRCUT: HaircutPolicy = {
  haircutBps:            300,
  maxAllocationBps:      3_000,
  emergencyDisabled:     false,
  staleValuation:        false,
  manualReviewRequired:  true,
  haircutRationale:
    'Tokenized Treasury fund. NAV oracle not yet live. 3% haircut applied. ' +
    'manualReviewRequired=true until Phase 3 oracle and fund-level attestation are deployed.',
};

const GOVMMF_HAIRCUT: HaircutPolicy = {
  haircutBps:            300,
  maxAllocationBps:      3_000,
  emergencyDisabled:     false,
  staleValuation:        false,
  manualReviewRequired:  true,
  haircutRationale:
    'Tokenized government money market fund. 3% haircut. manualReviewRequired=true.',
};

const PAXG_HAIRCUT: HaircutPolicy = {
  haircutBps:            500,   // 5% for gold volatility
  maxAllocationBps:      2_000, // max 20% of eligible reserve
  emergencyDisabled:     false,
  staleValuation:        false,
  manualReviewRequired:  false, // Phase 4: oracle is live; manualReview cleared
  haircutRationale:
    'PAXG (tokenized gold). Price-volatile. 5% haircut for intraday XAU/USD moves. ' +
    'DUAL-COUNTING GUARD: this AXUSD reserve sleeve accounts for PAXG held in custody ' +
    'that is NOT already included in the CanonicalReserveSnapshot hard-asset numerator. ' +
    'Accounting layer (CanonicalReserveSnapshot vs AXUSD Phase 3) MUST use separate balances. ' +
    'Phase 4 oracle admission: Chainlink XAU/USD + BitGo on-chain token attestation.',
};

const WETH_HAIRCUT: HaircutPolicy = {
  haircutBps:            10_000, // 100% haircut = effectively excluded
  maxAllocationBps:      0,
  emergencyDisabled:     true,   // Emergency disabled — not eligible for AXUSD reserves
  staleValuation:        false,
  manualReviewRequired:  true,
  haircutRationale:
    'WETH is price-volatile with no fixed AXUSD redemption peg. ' +
    '100% haircut + emergencyDisabled=true. WETH is held in AxiomTreasuryVault ' +
    'as yield-strategy collateral only. Not eligible for AXUSD reserve backing.',
};

const AXUSD_HAIRCUT: HaircutPolicy = {
  haircutBps:            10_000,
  maxAllocationBps:      0,
  emergencyDisabled:     true,
  staleValuation:        false,
  manualReviewRequired:  false,
  haircutRationale:
    'AXUSD is the liability being covered, not a backing asset. ' +
    'Including protocol-held AXUSD as a reserve asset would create circular backing. ' +
    '100% haircut + emergencyDisabled=true.',
};

const OPERATOR_HAIRCUT: HaircutPolicy = {
  haircutBps:            10_000,
  maxAllocationBps:      0,
  emergencyDisabled:     true,
  staleValuation:        false,
  manualReviewRequired:  true,
  haircutRationale:
    'AxiomTreasuryVault yield strategy positions. INTERNAL_ONLY. ' +
    'Must not count as AXUSD backing. 100% haircut enforced.',
};

// ── Custody metadata templates ────────────────────────────────────────────────

const PSM_CUSTODY: CustodyMetadata = {
  custodyType:             'SMART_CONTRACT',
  custodyVenue:            'CanonicalPSM (Arbitrum One)',
  custodyWallet:           undefined, // Populated from activeContracts at runtime
  custodyProofSource:      'on-chain balanceOf(CanonicalPSM)',
  attestationStatus:       'NONE',
  reconciliationStatus:    'NOT_REQUIRED',
};

const PLANNED_CUSTODY: CustodyMetadata = {
  custodyType:             'UNKNOWN',
  custodyVenue:            'TBD — custody venue not yet selected',
  custodyProofSource:      'PLACEHOLDER — attestation infrastructure not yet live',
  attestationUrlOrCid:     undefined,
  attestationTimestamp:    undefined,
  attestationStatus:       'NONE',
  lastReconciliationTimestamp: undefined,
  reconciliationStatus:    'NOT_REQUIRED',
};

const OPERATOR_CUSTODY: CustodyMetadata = {
  custodyType:             'SMART_CONTRACT',
  custodyVenue:            'AxiomTreasuryVault (Arbitrum One)',
  custodyProofSource:      'on-chain AxiomTreasuryVault.totalAssets()',
  attestationStatus:       'NONE',
  reconciliationStatus:    'NOT_REQUIRED',
};

// ── Seed Registry ─────────────────────────────────────────────────────────────

function buildRegistry(): ApprovedReserveAsset[] {
  const assets: ApprovedReserveAsset[] = [

    // ── USDC — LIVE — USDC_PSM sleeve ────────────────────────────────────────
    {
      id:                       'usdc-canonical-psm',
      assetAddress:             '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      assetSymbol:              'USDC',
      assetDecimals:            6,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'USDC_PSM',
      status:                   'LIVE',
      disclosureStatus:         'PUBLIC',
      isLive:                   true,
      isPlanned:                false,
      isRedeemable:             true,  // CanonicalPSM supports 1:1 USDC redemption
      isMintEligible:           true,  // CanonicalPSM supports 1:1 AXUSD minting
      isDisclosureEligible:     true,
      valuationSource:          'STABLE_PEG',
      priceUsdPerUnit:          1.0,
      currentBalance:           null,  // Fetched at runtime from CanonicalPSM
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            USDC_HAIRCUT,
      eligibleReserveValueUsd:  0,     // Runtime: computed after balance fetch
      custody:                  PSM_CUSTODY,
      adminNotes:
        'Primary AXUSD backing asset. Held in CanonicalPSM smart contract. ' +
        '1:1 mint and redeem via ERC-3643 PSM. Balance fetched live from on-chain.',
      lastUpdatedAt:            NOW,
      addedAt:                  '2025-01-01T00:00:00.000Z',
    },

    // ── thBILL — PLANNED — TOKENIZED_TBILL sleeve ─────────────────────────────
    {
      id:                       'thbill-theo-market-planned',
      assetAddress:             '0x0000000000000000000000000000000000000001', // placeholder
      assetSymbol:              'thBILL',
      assetDecimals:            18,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'TOKENIZED_TBILL',
      status:                   'PLANNED',
      disclosureStatus:         'PUBLIC',
      isLive:                   false,  // PLANNED — must never count in live coverage
      isPlanned:                true,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     true,   // Public disclosure: show as planned
      valuationSource:          'PLACEHOLDER',
      priceUsdPerUnit:          null,
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            TBILL_HAIRCUT,
      eligibleReserveValueUsd:  0,      // Always 0: PLANNED
      custody:                  PLANNED_CUSTODY,
      admissionGateOpen:        false, // BLOCKED: Phase 1 compliance gaps unresolved
      // Gap 1: LendingPlatformModule whitelist does not enforce platform restrictions
      // Gap 2: CountryAllowModule treats country code 0 as pass-through
      // Gap 3: TransferLimitModule defines tier 3 but does not assign it
      // Set admissionGateOpen=true only after all three are resolved in code.
      adminNotes:
        'Theo Finance thBILL — tokenized U.S. Treasury Bill. ' +
        'Currently held in EulerV2Strategy as yield collateral (OPERATOR_TREASURY use only). ' +
        'Phase 3 requirement: deploy NAV oracle + resolve compliance gaps ' +
        '(LendingPlatformModule whitelist enforcement, CountryAllowModule country-0 pass-through, ' +
        'TransferLimitModule tier-3 assignment) before this sleeve can go LIVE. ' +
        'DO NOT count toward AXUSD reserves until status=LIVE.',
      metadataUri:              undefined,
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },

    // ── BUIDL / Tokenized Treasury Fund — PLANNED ────────────────────────────
    {
      id:                       'buidl-tokenized-treasury-planned',
      assetAddress:             ZERO_ADDR,
      assetSymbol:              'BUIDL',
      assetDecimals:            6,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'TOKENIZED_TREASURY_FUND',
      status:                   'PLANNED',
      disclosureStatus:         'PUBLIC',
      isLive:                   false,
      isPlanned:                true,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     true,
      valuationSource:          'PLACEHOLDER',
      priceUsdPerUnit:          null,
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            TBILL_FUND_HAIRCUT,
      eligibleReserveValueUsd:  0,
      custody:                  PLANNED_CUSTODY,
      admissionGateOpen:        false, // BLOCKED: Phase 1 compliance gaps unresolved (same scope as thBILL)
      adminNotes:
        'BlackRock BUIDL or equivalent tokenized Treasury fund. ' +
        'Phase 4 oracle: ERC-4626 convertToAssets() on Ethereum mainnet is authoritative primary source ' +
        '(no public BlackRock REST NAV API exists). isFallback=false for on-chain fetch. ' +
        'Integration pathway: Phase 3 oracle + Phase 4 mint/redeem module. ' +
        'Asset address is a placeholder — must be updated when integrated.',
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },

    // ── ONDO / USDY — PLANNED — TOKENIZED_GOVERNMENT_MONEY_MARKET ────────────
    {
      id:                       'ondo-usdy-tokenized-govmmf-planned',
      assetAddress:             ZERO_ADDR,
      assetSymbol:              'USDY',
      assetDecimals:            18,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'TOKENIZED_GOVERNMENT_MONEY_MARKET',
      status:                   'PLANNED',
      disclosureStatus:         'PUBLIC',
      isLive:                   false,
      isPlanned:                true,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     true,
      valuationSource:          'PLACEHOLDER',
      priceUsdPerUnit:          null,
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            GOVMMF_HAIRCUT,
      eligibleReserveValueUsd:  0,
      custody:                  PLANNED_CUSTODY,
      admissionGateOpen:        false, // BLOCKED: Phase 1 compliance gaps unresolved (same scope as thBILL)
      adminNotes:
        'Ondo USDY or equivalent tokenized government money market fund. ' +
        'Placeholder — integrate after Phase 3 oracle approval.',
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },

    // ── PAXG — LIVE — TOKENIZED_GOLD (Phase 4 oracle admission) ─────────────
    // Phase 4 admission checklist (all resolved):
    //   ✓ Chainlink XAU/USD live feed on Arbitrum One
    //   ✓ BitGo on-chain ERC-20 balanceOf() attestation (not ETH gas balance)
    //   ✓ Dual-counting guard documented in haircutPolicy.haircutRationale
    //   ✓ manualReviewRequired cleared — oracle is live
    //   — Compliance gaps (LendingPlatformModule/CountryAllowModule/TransferLimitModule)
    //     do NOT apply to TOKENIZED_GOLD sleeve (apply to TOKENIZED_TBILL only)
    {
      id:                       'paxg-tokenized-gold-planned',
      assetAddress:             '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
      assetSymbol:              'PAXG',
      assetDecimals:            18,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'TOKENIZED_GOLD',
      status:                   'LIVE',
      disclosureStatus:         'PUBLIC',
      isLive:                   true,
      isPlanned:                false,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     true,
      valuationSource:          'CHAINLINK_ORACLE',
      priceUsdPerUnit:          null, // Populated at runtime by TreasuryNAVOracleService
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            PAXG_HAIRCUT,
      eligibleReserveValueUsd:  0,    // Populated at runtime by RWAValuationAdapter
      custody: {
        custodyType:             'INSTITUTIONAL_CUSTODIAN',
        custodyVenue:            'BitGo CaaS',
        custodyProofSource:      'BitGo API + on-chain ERC-20 balanceOf() attestation',
        attestationStatus:       'CURRENT',
        reconciliationStatus:    'CURRENT',
      },
      admissionGateOpen:        true, // OPEN: TOKENIZED_GOLD — Phase 1 compliance gaps do NOT apply
      adminNotes:
        'PAXG tokenized gold sleeve admitted LIVE in Phase 4. ' +
        'Oracle: Chainlink XAU/USD (Arbitrum One, 0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c). ' +
        'Attestation: BitGo on-chain ERC-20 balanceOf() — verifies actual PAXG token holdings. ' +
        'DUAL-COUNTING GUARD: this AXUSD sleeve balance must NOT overlap with PAXG already ' +
        'included in CanonicalReserveSnapshot hard-asset numerator. ' +
        'Governance: TOKENIZED_GOLD sleeve is not subject to T-Bill compliance gaps.',
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },

    // ── WETH — INTERNAL_ONLY — OPERATOR_TREASURY ─────────────────────────────
    {
      id:                       'weth-operator-treasury-internal',
      assetAddress:             '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      assetSymbol:              'WETH',
      assetDecimals:            18,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'OPERATOR_TREASURY',
      status:                   'INTERNAL_ONLY',
      disclosureStatus:         'INTERNAL',
      isLive:                   false,
      isPlanned:                false,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     false,
      valuationSource:          'COINGECKO',
      priceUsdPerUnit:          null,
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            WETH_HAIRCUT,
      eligibleReserveValueUsd:  0,
      custody:                  OPERATOR_CUSTODY,
      adminNotes:
        'WETH held in AxiomTreasuryVault EulerV2Strategy. ' +
        'INTERNAL_ONLY operator yield-strategy collateral. ' +
        'Price-volatile. No fixed AXUSD redemption peg. ' +
        'MUST NOT count as AXUSD reserve backing under any circumstances.',
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },

    // ── AXUSD (protocol holdings) — INTERNAL_ONLY ────────────────────────────
    {
      id:                       'axusd-protocol-holdings-internal',
      assetAddress:             '0x0000000000000000000000000000000000000002', // placeholder
      assetSymbol:              'AXUSD',
      assetDecimals:            18,
      chainId:                  ARBITRUM_ONE,
      sleeve:                   'OPERATOR_TREASURY',
      status:                   'INTERNAL_ONLY',
      disclosureStatus:         'INTERNAL',
      isLive:                   false,
      isPlanned:                false,
      isRedeemable:             false,
      isMintEligible:           false,
      isDisclosureEligible:     false,
      valuationSource:          'STABLE_PEG',
      priceUsdPerUnit:          1.0,
      currentBalance:           null,
      grossValueUsd:            null,
      lastValuedAt:             null,
      haircutPolicy:            AXUSD_HAIRCUT,
      eligibleReserveValueUsd:  0,
      custody:                  OPERATOR_CUSTODY,
      adminNotes:
        'AXUSD protocol holdings (Treasury Revenue + EVK). ' +
        'AXUSD is the liability being covered — including it as a backing asset ' +
        'would create circular reserve accounting. Permanently excluded.',
      lastUpdatedAt:            NOW,
      addedAt:                  NOW,
    },
  ];

  // Validate all haircut policies on construction
  for (const asset of assets) {
    validateHaircutPolicy(asset.haircutPolicy, asset.assetSymbol);
  }

  return assets;
}

// ── Registry singleton ────────────────────────────────────────────────────────

let _registry: ApprovedReserveAsset[] | null = null;

export function getApprovedReserveAssetRegistry(): ApprovedReserveAsset[] {
  if (!_registry) {
    _registry = buildRegistry();
  }
  return _registry;
}

/** Get all LIVE assets (eligible for reserve accounting, subject to haircuts). */
export function getLiveReserveAssets(): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.isLive && a.status === 'LIVE');
}

/** Get all PLANNED assets (must never count in live coverage). */
export function getPlannedReserveAssets(): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.status === 'PLANNED');
}

/** Get all OPERATOR_TREASURY assets (excluded from AXUSD backing). */
export function getOperatorTreasuryAssets(): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.sleeve === 'OPERATOR_TREASURY');
}

/** Get all disclosure-eligible assets (safe to show on public dashboard). */
export function getDisclosureEligibleAssets(): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.isDisclosureEligible);
}

/** Get a single asset by ID. */
export function getAssetById(id: string): ApprovedReserveAsset | undefined {
  return getApprovedReserveAssetRegistry().find(a => a.id === id);
}

/** Get assets by sleeve. */
export function getAssetsBySleeve(sleeve: string): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.sleeve === sleeve);
}

/** Get assets by status. */
export function getAssetsByStatus(status: string): ApprovedReserveAsset[] {
  return getApprovedReserveAssetRegistry().filter(a => a.status === status);
}
