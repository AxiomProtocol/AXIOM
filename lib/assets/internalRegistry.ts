/**
 * Axiom Internal Asset Registry
 *
 * Read-only mapping layer for all protocol-native and Axiom-issued assets.
 * This is a thin aggregation layer — it does not replace or modify:
 *   - lib/commodities/registry.ts  (commodity assets)
 *   - lib/assets/registry.ts       (external digital assets)
 *   - lib/tokens.ts                (canonical addresses)
 *   - shared/contracts.ts          (all deployed contracts)
 *
 * Purpose:
 *   Provide a single typed list of internal assets for the operator view
 *   at /operator/assets/internal. Implements the classification produced by
 *   documents/assets/INTERNAL_ASSET_DISCOVERY_REPORT.md.
 *
 * Hard rules:
 *   - READ-ONLY. No writes, no deploys, no issuance.
 *   - AXAG MUST remain NOT_LIVE_NOT_ISSUED.
 *   - Status values here mirror the discovery report; do not promote
 *     an asset to a higher-readiness status without coordinated governance.
 *   - AXUSD canonical address is 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7.
 *   - AXAU is LIVE (gold module); LAND module is DEPLOYED_INACTIVE.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type InternalAssetStatus =
  | 'LIVE'
  | 'DEPLOYED_INACTIVE'
  | 'DRAFT_ONLY'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'DEPRECATED'
  | 'UNKNOWN_NEEDS_REVIEW';

export type InternalAssetCategory =
  | 'STABLECOIN'
  | 'RESERVE_BASKET'
  | 'RESERVE_MODULE'
  | 'GOVERNANCE_TOKEN'
  | 'GOVERNANCE_YIELD'
  | 'COMMODITY_EXTERNAL'
  | 'NFT_BADGE'
  | 'NFT_RECEIPT'
  | 'DRAFT';

export interface InternalAsset {
  /** Token ticker symbol (or descriptive label if no symbol) */
  symbol: string;
  /** Full human-readable name */
  name: string;
  /** Asset category */
  category: InternalAssetCategory;
  /** Issuing entity */
  issuer: string;
  /** Whether Axiom Protocol is the issuer */
  axiomIssues: boolean;
  /** Whether Axiom directly custodies the underlying */
  axiomCustodies: boolean;
  /** Primary chain; null if not deployed */
  chain: string | null;
  /** Primary contract address; null if not deployed */
  contractAddress: string | null;
  /** Normalized status from discovery report */
  status: InternalAssetStatus;
  /**
   * Key source files that define this asset's truth.
   * Paths are relative to the repo root.
   */
  sourceFiles: string[];
  /** Current product truth — one-line summary */
  productTruth: string;
  /** What would be required to make it live, if not already */
  activationNotes: string | null;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTERNAL_ASSET_REGISTRY: InternalAsset[] = [
  // ── AXUSD ─────────────────────────────────────────────────────────────────
  {
    symbol: 'AXUSD',
    name: 'Axiom USD',
    category: 'STABLECOIN',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7',
    status: 'LIVE',
    sourceFiles: [
      'lib/tokens.ts',
      'src/config/activeContracts.generated.ts',
      'shared/contracts.ts',
      'contracts/axusd/CanonicalPSM.sol',
    ],
    productTruth:
      'Axiom-issued ERC-3643 peg-stability stablecoin on Arbitrum One. ' +
      '1:1 USDC-backed via Canonical PSM. Canonical production token.',
    activationNotes: null,
  },

  // ── AXAU ──────────────────────────────────────────────────────────────────
  {
    symbol: 'AXAU',
    name: 'Axiom Gold Reserve',
    category: 'RESERVE_BASKET',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
    status: 'LIVE',
    sourceFiles: [
      'lib/commodities/registry.ts',
      'deployments/axau-arbitrum.json',
      'documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md',
      'contracts/axau/AXAUTokenLite3643.sol',
    ],
    productTruth:
      'Axiom-issued ERC-3643 multi-component reserve token on Arbitrum One. ' +
      'Gold (XAU) module live, backed by PAXG in AXGoldVault. ' +
      '105% coverage floor enforced by MintRedeemController.',
    activationNotes: null,
  },

  // ── AXAU LAND module ──────────────────────────────────────────────────────
  {
    symbol: 'LAND',
    name: 'AXAU Land Reserve Module',
    category: 'RESERVE_MODULE',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: true,
    chain: 'Arbitrum One',
    contractAddress: '0x66Aadce66a359609ec5E18fb3d8927a2363449cf',
    status: 'DEPLOYED_INACTIVE',
    sourceFiles: [
      'deployments/axau-arbitrum.json',
      'contracts/axau/AXLandVault.sol',
      'contracts/axau/LandNAVOracleMultiSig.sol',
      'documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md',
    ],
    productTruth:
      'AXLandVault and LandNAVOracleMultiSig are deployed on Arbitrum One ' +
      'but the LAND component is disabled (enabled=false in CommodityRegistry). ' +
      'No NAV has been submitted. No LAND-backed AXAU has been minted.',
    activationNotes:
      'Requires: (1) authorized appraiser signers on LandNAVOracleMultiSig (≥2), ' +
      '(2) first NAV proposal confirmed by ≥threshold signers, ' +
      '(3) AXLandVault.markConsumed() called, ' +
      '(4) governor calls CommodityRegistry.setEnabled(keccak256("LAND"), true), ' +
      '(5) titled property acquisition and appraisal cadence established, ' +
      '(6) Stage 1 CEF scoring filed for land component.',
  },

  // ── AXM ───────────────────────────────────────────────────────────────────
  {
    symbol: 'AXM',
    name: 'Axiom Governance Token',
    category: 'GOVERNANCE_TOKEN',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    status: 'LIVE',
    sourceFiles: [
      'lib/tokens.ts',
      'shared/contracts.ts',
      'src/config/activeContracts.generated.ts',
      'lib/config/governance-authority.ts',
    ],
    productTruth:
      'Axiom ERC-20 governance and utility token on Arbitrum One. ' +
      'Used for governance voting, DePIN node purchase discounts (15%), ' +
      'and AXM/AXUSD EulerSwap liquidity.',
    activationNotes: null,
  },

  // ── SEED (veAXM) ──────────────────────────────────────────────────────────
  {
    symbol: 'SEED',
    name: 'SEED — Vote-Escrowed AXM',
    category: 'GOVERNANCE_YIELD',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: true,
    chain: 'Arbitrum One',
    contractAddress: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046',
    status: 'LIVE',
    sourceFiles: [
      'shared/contracts.ts',
      'lib/server/v2ContractService.ts',
      'lib/governance/service.ts',
    ],
    productTruth:
      'Curve-style vote-escrow contract. Lock AXM for 1–4 years to earn SEED. ' +
      'SEED grants governance power, AXUSD yield access, and cycle eligibility. ' +
      'Yield distributed weekly by SEEDYieldDistributor.',
    activationNotes: null,
  },

  // ── AXAG ──────────────────────────────────────────────────────────────────
  {
    symbol: 'AXAG',
    name: 'Axiom Silver Reserve (Not Issued)',
    category: 'DRAFT',
    issuer: 'n/a',
    axiomIssues: false,
    axiomCustodies: false,
    chain: null,
    contractAddress: null,
    status: 'NOT_LIVE_NOT_ISSUED',
    sourceFiles: [
      'lib/commodities/registry.ts',
      'lib/assets/registry.ts',
      'contracts/axau/drafts/README.md',
      'documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md',
    ],
    productTruth:
      'AXAG is not live and is not issued. No contract has been deployed. ' +
      'Draft contracts exist in contracts/axau/drafts/ for design reference only. ' +
      'Current design target is Path A: silver sleeve inside AXAU (not a separate token). ' +
      'All activation gates remain open.',
    activationNotes:
      'Path A (silver sleeve inside AXAU): ' +
      'G-01 Gnosis Safe quorum for addComponent("XAG",...); ' +
      'G-03 KAG bridged to Arbitrum One; ' +
      'G-04a/b bridged KAG address confirmed; ' +
      'G-06 Reserve KAG staged; ' +
      'G-07 Atomic disclosure flip across six surfaces; ' +
      'C-02–C-07 Custody RFP, custodian selection, term sheet, attestation; ' +
      'L-01–L-05 AMM bootstrap, market maker; ' +
      'External audit of AXSilverVault and XagPerGramOracle. ' +
      'Path B (standalone AXAG token): additional legal opinion, KMS Labs ToS, separate audit. ' +
      'See documents/commodities/AXAG_STAGE_2_EVIDENCE_TRACKER.md.',
  },

  // ── KAG ───────────────────────────────────────────────────────────────────
  {
    symbol: 'KAG',
    name: 'Kinesis Silver (External)',
    category: 'COMMODITY_EXTERNAL',
    issuer: 'KMS Labs AG (Kinesis ecosystem)',
    axiomIssues: false,
    axiomCustodies: false,
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    status: 'LIVE',
    sourceFiles: [
      'lib/commodities/registry.ts',
      'lib/commodities/kagService.ts',
      'lib/assets/registry.ts',
      'pages/api/commodities/kag/',
    ],
    productTruth:
      'First external commodity integrated. EXTERNAL_SUPPORTED, read-only. ' +
      'Axiom does not issue KAG and does not custody the underlying silver. ' +
      'Reference pattern for all external asset admissions.',
    activationNotes: null,
  },

  // ── NFT: AxiomParticipation ───────────────────────────────────────────────
  {
    symbol: 'AXPART',
    name: 'AxiomParticipation (Protocol Badges)',
    category: 'NFT_BADGE',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: null,
    status: 'UNKNOWN_NEEDS_REVIEW',
    sourceFiles: [
      'contracts/nft/AxiomParticipation.sol',
      'scripts/nft/deploy-nft.ts',
      'lib/nft/traitEngine.ts',
    ],
    productTruth:
      'ERC-1155 multi-edition participation badges. Contract code exists; ' +
      'deployed address not confirmed in canonical shared/contracts.ts. ' +
      'Deploy script exists at scripts/nft/deploy-nft.ts.',
    activationNotes:
      'Verify deployment: check scripts/nft/deployment-output.json if it exists locally; ' +
      'search Arbiscan for deployer address (0x8d7892CF226B43d48B6e3ce988A1274e6D114C96). ' +
      'If deployed, add address to shared/contracts.ts.',
  },

  // ── NFT: AxiomFounderBadge ────────────────────────────────────────────────
  {
    symbol: 'AXFB',
    name: 'AxiomFounderBadge',
    category: 'NFT_BADGE',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: null,
    status: 'UNKNOWN_NEEDS_REVIEW',
    sourceFiles: [
      'contracts/nft/AxiomFounderBadge.sol',
      'scripts/nft/deploy-nft.ts',
      'lib/nft/traitEngine.ts',
    ],
    productTruth:
      'ERC-721 founder badge. Contract code exists; ' +
      'deployed address not confirmed in canonical shared/contracts.ts.',
    activationNotes:
      'Verify deployment: same as AxiomParticipation — check scripts/nft/deployment-output.json ' +
      'or Arbiscan for deployer address.',
  },

  // ── NFT: AxiomLandReceipt ─────────────────────────────────────────────────
  {
    symbol: 'AXLR',
    name: 'AxiomLandReceipt',
    category: 'NFT_BADGE',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: null,
    status: 'UNKNOWN_NEEDS_REVIEW',
    sourceFiles: [
      'contracts/nft/AxiomLandReceipt.sol',
      'scripts/nft/deploy-nft.ts',
      'lib/nft/traitEngine.ts',
    ],
    productTruth:
      'ERC-1155 land receipt NFT. Contract code exists; ' +
      'deployed address not confirmed in canonical shared/contracts.ts.',
    activationNotes:
      'Verify deployment: same as other badge NFTs.',
  },

  // ── NFT: Loan Receipt (Fix & Flip) ────────────────────────────────────────
  {
    symbol: 'AXFFNFT',
    name: 'Fix & Flip Loan Receipt NFT',
    category: 'NFT_RECEIPT',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: '0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9',
    status: 'LIVE',
    sourceFiles: [
      'shared/contracts.ts',
    ],
    productTruth:
      'ERC-721 loan receipt NFT for Fix & Flip bridge loans. Deployed and tracked ' +
      'in shared/contracts.ts (REALESTATE_LENDING_CONTRACTS.LOAN_RECEIPT_NFT).',
    activationNotes: null,
  },

  // ── NFT: DSCR Loan Receipt ────────────────────────────────────────────────
  {
    symbol: 'AXDSCRNFT',
    name: 'DSCR Rental Loan Receipt NFT',
    category: 'NFT_RECEIPT',
    issuer: 'Axiom Protocol',
    axiomIssues: true,
    axiomCustodies: false,
    chain: 'Arbitrum One',
    contractAddress: '0x66DB145A7ac0de369da88098E8F85467cFaD7674',
    status: 'LIVE',
    sourceFiles: [
      'shared/contracts.ts',
    ],
    productTruth:
      'ERC-721 loan receipt NFT for DSCR rental loans. Deployed and tracked ' +
      'in shared/contracts.ts (REALESTATE_LENDING_CONTRACTS.DSCR_LOAN_RECEIPT_NFT).',
    activationNotes: null,
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

/** List all internal assets. */
export function listInternalAssets(): InternalAsset[] {
  return INTERNAL_ASSET_REGISTRY;
}

/** List only assets with the given status. */
export function listInternalAssetsByStatus(status: InternalAssetStatus): InternalAsset[] {
  return INTERNAL_ASSET_REGISTRY.filter((a) => a.status === status);
}

/** Look up a single internal asset by symbol (case-insensitive). */
export function getInternalAsset(symbol: string): InternalAsset | undefined {
  const upper = symbol.toUpperCase();
  return INTERNAL_ASSET_REGISTRY.find((a) => a.symbol === upper);
}

/** Return all assets that are actively live (Axiom-issued). */
export function listLiveInternalAssets(): InternalAsset[] {
  return INTERNAL_ASSET_REGISTRY.filter(
    (a) => a.status === 'LIVE' && a.axiomIssues,
  );
}
