/**
 * Tokenized Commodities Integration Layer — Shared Disclosure Helper
 *
 * Canonical disclosure strings for all commodity surfaces.
 * Import from here to avoid inconsistent wording across pages.
 *
 * Hard rules preserved:
 *   - KAG is issued by KMS Labs within the Kinesis ecosystem
 *   - Axiom supports KAG as an external commodity asset
 *   - Axiom does not issue KAG
 *   - Axiom does not directly custody the underlying silver
 *   - Any redemption rights depend on KMS Labs / Kinesis terms
 *   - AXAG is not live and is not issued
 *   - AXAU is the reserve framework; gold is the current live reserve module
 *   - Additional reserve sleeves may be added through governance and launch gates
 */

// ─── Atomic disclosure strings ────────────────────────────────────────────────

export const D = {
  // Reference / informational
  REFERENCE_ONLY:
    'This page is informational and reference only. It does not constitute trading, investment, or financial advice.',
  NO_BUY_SELL:
    'No buy/sell recommendations are made. No yield is offered or implied.',
  NO_FINANCIAL_ADVICE:
    'Nothing on this page constitutes financial, investment, or tax advice.',

  // AXAU truths
  AXAU_ISSUED_BY_AXIOM:
    'AXAU is issued by Axiom Protocol and is live on Arbitrum One.',
  AXAU_RESERVE_FRAMEWORK:
    'AXAU is the reserve framework. Gold is the current live reserve module.',
  AXAU_ADDITIONAL_SLEEVES:
    'Additional reserve sleeves may be added through governance and launch gates.',
  AXAU_NAV_ON_CHAIN:
    'AXAU NAV is published on-chain by NAVEngine. The authoritative on-chain value governs.',
  AXAU_REDEMPTION:
    'AXAU redemption is subject to KYC/AML identity verification and platform terms.',

  // KAG truths
  KAG_ISSUED_BY_KMS:
    'KAG is issued by KMS Labs within the Kinesis ecosystem.',
  KAG_AXIOM_SUPPORTS:
    'Axiom supports KAG as an external commodity asset for portfolio visibility and disclosure.',
  KAG_AXIOM_DOES_NOT_ISSUE:
    'Axiom does not issue KAG.',
  KAG_NO_CUSTODY:
    'Axiom does not directly custody the underlying silver.',
  KAG_REDEMPTION_DEPENDS:
    'Any redemption rights depend on KMS Labs / Kinesis terms.',
  KAG_READ_ONLY:
    'KAG support is read-only: no swaps, no deposits, no withdrawals, no banking rails.',

  // AXAG truths
  AXAG_NOT_LIVE:
    'AXAG is not live and is not issued.',
  AXAG_NO_TOKEN:
    'No AXAG token exists on any chain.',
  AXAG_DEFERRED:
    'The AXAG silver wrapper-token path is deferred.',
  AXAG_NOT_ISSUED_THIS_PHASE:
    'Axiom does not issue AXAG in this phase.',
  AXAG_PHASE1:
    'Phase 1 direct silver support is KAG (external) only.',

  // External assets general
  EXTERNAL_READ_ONLY:
    'External supported assets are not issued or custodied by Axiom Protocol. ' +
    'Support is read-only — no swaps, no lending, no deposits, no withdrawals, no banking rails. ' +
    'Redemption rights depend on each issuer.',
} as const;

// ─── Grouped disclosure sets ──────────────────────────────────────────────────

/** Standard page header disclosure banner text for all commodity pages. */
export const COMMODITY_PAGE_BANNER =
  'REFERENCE ONLY — AXAG IS NOT LIVE AND IS NOT ISSUED. ' +
  'This page provides reference information about tokenized commodity assets. ' +
  'It does not constitute trading, investment, or rebalancing advice. ' +
  'No buy/sell recommendations are made. No yield is offered or implied.';

/** Full disclosure list for the commodities hub and insights pages. */
export const COMMODITY_DISCLOSURES: string[] = [
  D.REFERENCE_ONLY,
  D.NO_BUY_SELL,
  D.AXAU_ISSUED_BY_AXIOM,
  D.AXAU_RESERVE_FRAMEWORK,
  D.AXAU_ADDITIONAL_SLEEVES,
  D.KAG_ISSUED_BY_KMS,
  D.KAG_AXIOM_SUPPORTS,
  D.KAG_AXIOM_DOES_NOT_ISSUE,
  D.KAG_NO_CUSTODY,
  D.KAG_REDEMPTION_DEPENDS,
  D.KAG_READ_ONLY,
  D.AXAG_NOT_LIVE,
  D.AXAG_NO_TOKEN,
  D.AXAG_DEFERRED,
  D.AXAG_NOT_ISSUED_THIS_PHASE,
  D.EXTERNAL_READ_ONLY,
];

/** Minimal disclosure set for AXAU-specific pages. */
export const AXAU_DISCLOSURES: string[] = [
  D.AXAU_ISSUED_BY_AXIOM,
  D.AXAU_RESERVE_FRAMEWORK,
  D.AXAU_NAV_ON_CHAIN,
  D.AXAU_REDEMPTION,
  D.AXAU_ADDITIONAL_SLEEVES,
  D.NO_FINANCIAL_ADVICE,
];

/** Minimal disclosure set for KAG-specific pages. */
export const KAG_DISCLOSURES: string[] = [
  D.KAG_ISSUED_BY_KMS,
  D.KAG_AXIOM_SUPPORTS,
  D.KAG_AXIOM_DOES_NOT_ISSUE,
  D.KAG_NO_CUSTODY,
  D.KAG_REDEMPTION_DEPENDS,
  D.KAG_READ_ONLY,
  D.AXAG_NOT_LIVE,
  D.NO_FINANCIAL_ADVICE,
];
