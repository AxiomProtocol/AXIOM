/**
 * Axiom Digital Assets Admission Registry
 *
 * Generalized read-only registry for external digital assets recognized by
 * Axiom for portfolio visibility and disclosure. Implements the Axiom Digital
 * Assets Admission Framework — see documents/assets/DIGITAL_ASSETS_ADMISSION_FRAMEWORK.md.
 *
 * Hard rules (mirrors lib/commodities/kagService.ts pattern):
 *   - Read-only. No custody. No issuance. No lending. No swaps. No banking rails.
 *   - No Axiom contract holds these assets.
 *   - No write paths beyond documentation/registry updates.
 *   - Axiom does not issue any asset listed here.
 *   - AXAG is not live and is not issued.
 *
 * To add a new external asset:
 *   1. Score the asset against the six readiness dimensions (Framework §3).
 *   2. Add an entry below with full evidence — every field must be sourced.
 *   3. If READY_NOW: add per-asset service module and disclosure surface.
 *   4. If NEEDS_DILIGENCE: track open items in
 *        documents/assets/diligence/<symbol>_DILIGENCE.md
 *   5. If OUT_OF_SCOPE: record rejectionReason; no public surface.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetCategory =
  | 'DIGITAL_COMMODITY'
  | 'RESERVE_GRADE_STABLE'
  | 'STRATEGIC_CRYPTO'
  | 'TOKENIZED_RWA'
  | 'AXIOM_ISSUED';

export type AdmissionStatus =
  | 'READY_NOW'
  | 'NEEDS_DILIGENCE'
  | 'OUT_OF_SCOPE';

export type ProductStatus =
  | 'EXTERNAL_SUPPORTED'
  | 'INTERNAL_ISSUED'
  | 'PLANNED'
  | 'DEFERRED'
  | 'NOT_LIVE_NOT_ISSUED';

export type DisclosureStatus =
  | 'PUBLISHED'
  | 'DRAFT'
  | 'PENDING'
  | 'NOT_REQUIRED';

export type RiskLabel =
  | 'TIER_1_VERIFIED'
  | 'TIER_2_REVIEWED'
  | 'TIER_3_RESTRICTED';

export type RedeemabilityClarity =
  | 'CLEAR'
  | 'CONDITIONAL'
  | 'OPAQUE'
  | 'NONE';

export type PricingSourceTier =
  | 'CHAINLINK_PRIMARY'
  | 'CHAINLINK_AND_SECONDARY'
  | 'COINGECKO_PRIMARY'
  | 'COINMARKETCAP_PRIMARY'
  | 'NONE';

/**
 * Six-dimension readiness scoring (Framework §3).
 * Each dimension 0–3, lower = less friction.
 */
export interface ReadinessScore {
  d1IssuerVerification: 0 | 1 | 2 | 3;
  d2ContractConfirmation: 0 | 1 | 2 | 3;
  d3MarketData: 0 | 1 | 2 | 3;
  d4CustodyRedeemability: 0 | 1 | 2 | 3;
  d5RegulatoryClarity: 0 | 1 | 2 | 3;
  d6DisclosureCompatibility: 0 | 1 | 2 | 3;
}

export interface ExternalAsset {
  // Identity
  symbol: string;
  name: string;
  category: AssetCategory;

  // Issuer
  issuer: string;
  issuerRegulator: string;

  // On-chain
  chain: string;
  chainId: number;
  contractAddress: string | null;
  contractConfirmed: boolean;
  contractStandard: string;
  decimals: number;

  // Pricing
  pricingSource: string;
  pricingSourceTier: PricingSourceTier;
  pricingSourceVerified: boolean;

  // Custody and redemption
  custodyModel: string;
  redeemabilityClarity: RedeemabilityClarity;

  // Status
  productStatus: ProductStatus;
  disclosureStatus: DisclosureStatus;
  admissionStatus: AdmissionStatus;
  riskLabel: RiskLabel;
  readOnlySupported: boolean;

  // Axiom relationship (always false for external assets)
  axiomCustodies: false;
  axiomIssues: false;

  // Scoring
  readinessScore: ReadinessScore;

  // Surfaces
  detailRoute: string | null;
  disclosureLinks: { label: string; url: string }[];

  // Documentation
  notes: string;
  rejectionReason?: string;
  effectiveDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sum the six readiness dimensions. Lower = less friction. */
export function totalReadinessScore(score: ReadinessScore): number {
  return (
    score.d1IssuerVerification +
    score.d2ContractConfirmation +
    score.d3MarketData +
    score.d4CustodyRedeemability +
    score.d5RegulatoryClarity +
    score.d6DisclosureCompatibility
  );
}

/** Whether any single dimension is at the maximum-friction score (3). */
export function hasHardBlockingDimension(score: ReadinessScore): boolean {
  return (
    score.d1IssuerVerification === 3 ||
    score.d2ContractConfirmation === 3 ||
    score.d3MarketData === 3 ||
    score.d4CustodyRedeemability === 3 ||
    score.d5RegulatoryClarity === 3 ||
    score.d6DisclosureCompatibility === 3
  );
}

/**
 * Derive admission status from readiness score per Framework §3.
 * - READY_NOW: total ≤ 6 AND no single dimension at 3 (KAG profile is the
 *   operating definition of READY_NOW)
 * - NEEDS_DILIGENCE: total 7–10 AND no single dimension at 3
 * - OUT_OF_SCOPE: total > 10 OR any single dimension at 3
 */
export function deriveAdmissionStatus(score: ReadinessScore): AdmissionStatus {
  const total = totalReadinessScore(score);
  if (hasHardBlockingDimension(score)) return 'OUT_OF_SCOPE';
  if (total <= 6) return 'READY_NOW';
  if (total <= 10) return 'NEEDS_DILIGENCE';
  return 'OUT_OF_SCOPE';
}

/** Derive risk label from readiness score per Framework §8. */
export function deriveRiskLabel(score: ReadinessScore): RiskLabel {
  const total = totalReadinessScore(score);
  if (hasHardBlockingDimension(score)) return 'TIER_3_RESTRICTED';
  if (total <= 2) return 'TIER_1_VERIFIED';
  if (total <= 6) return 'TIER_2_REVIEWED';
  return 'TIER_3_RESTRICTED';
}

// ─── Registry seed ────────────────────────────────────────────────────────────

/**
 * Initial registry. Every entry carries full evidence per Framework §7.
 * Scores are documentary — adding a new asset requires citing sources for
 * each dimension (see DIGITAL_ASSETS_CANDIDATE_LIST.md).
 */
export const EXTERNAL_ASSETS: ExternalAsset[] = [
  // ── Live: KAG (Kinesis Silver) ──────────────────────────────────────────────
  // Mirrors lib/commodities/registry.ts and lib/commodities/kagService.ts.
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    category: 'DIGITAL_COMMODITY',
    issuer: 'KMS Labs AG (operating as Kinesis Money)',
    issuerRegulator:
      'Liechtenstein Token and Trustworthy Technology Service Providers Act (TVTG)',
    chain: 'ethereum-mainnet',
    chainId: 1,
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource: 'CoinGecko (kinesis-silver, USD)',
    pricingSourceTier: 'COINGECKO_PRIMARY',
    pricingSourceVerified: true,
    custodyModel:
      'Physical LBMA Good Delivery 999 fine silver held in KMS Labs vault network. ' +
      'KMS Labs publishes attestations; cadence and auditor identity should be ' +
      'verified directly from kinesis.money before reliance.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PUBLISHED',
    admissionStatus: 'READY_NOW',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 1, // TVTG (non-US prudential framework)
      d2ContractConfirmation: 0, // Verified, official source
      d3MarketData: 2, // CoinGecko only
      d4CustodyRedeemability: 1, // Custodian named, redemption conditional
      d5RegulatoryClarity: 1, // Recognized under TVTG
      d6DisclosureCompatibility: 0, // Existing language live
    },
    detailRoute: '/commodities/kag',
    disclosureLinks: [
      { label: 'Kinesis Money', url: 'https://kinesis.money' },
      { label: 'Kinesis Terms', url: 'https://kinesis.money/terms' },
      {
        label: 'KAG on Etherscan',
        url: 'https://etherscan.io/token/0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
      },
    ],
    notes:
      'Direct KAG support on Ethereum mainnet. Read-only. Axiom does not issue ' +
      'KAG. Axiom does not custody the underlying silver. Redemption depends on ' +
      'KMS Labs / Kinesis terms. AXAG is not live and is not issued.',
    effectiveDate: '2026-05-02',
  },

  // ── Recommended next: PAXG (Paxos Gold) ─────────────────────────────────────
  // Already used internally as the AXAU gold reserve asset; admitting it as a
  // recognized external commodity asset for read-only portfolio visibility is
  // zero-friction. Issuer is NYDFS-regulated.
  {
    symbol: 'PAXG',
    name: 'Paxos Gold',
    category: 'DIGITAL_COMMODITY',
    issuer: 'Paxos Trust Company, LLC',
    issuerRegulator:
      'New York Department of Financial Services (NYDFS) — limited-purpose trust company charter',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource:
      'Chainlink XAU/USD (Arbitrum One) — primary; CoinGecko (pax-gold) — secondary',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'Physical London Good Delivery gold held in Brink\'s London vaults under ' +
      'Paxos custody. Paxos publishes monthly third-party reserve attestations.',
    redeemabilityClarity: 'CLEAR',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'READY_NOW',
    riskLabel: 'TIER_1_VERIFIED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 0, // NYDFS-regulated
      d2ContractConfirmation: 0, // Verified, official source
      d3MarketData: 0, // Chainlink + CoinGecko
      d4CustodyRedeemability: 0, // Brink's + monthly Paxos attestation
      d5RegulatoryClarity: 0, // NYDFS commodity framework
      d6DisclosureCompatibility: 0, // Already used as AXAU gold reserve
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Paxos PAXG', url: 'https://paxos.com/paxgold' },
      {
        label: 'PAXG on Arbiscan',
        url: 'https://arbiscan.io/token/0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
      },
    ],
    notes:
      'PAXG is the gold reserve asset used by AXAU\'s AXGoldVault. ' +
      'Recognizing PAXG as an externally supported asset for portfolio visibility ' +
      'does not change AXAU mechanics. Axiom does not issue PAXG. ' +
      'Axiom does not directly custody physical gold.',
    effectiveDate: '2026-05-02',
  },

  // ── Recommended next: KAU (Kinesis Gold) ────────────────────────────────────
  // Symmetric to KAG — same issuer (KMS Labs), same regulatory framework,
  // same disclosure pattern. Direct replication of the KAG admission.
  {
    symbol: 'KAU',
    name: 'Kinesis Gold',
    category: 'DIGITAL_COMMODITY',
    issuer: 'KMS Labs AG (operating as Kinesis Money)',
    issuerRegulator:
      'Liechtenstein Token and Trustworthy Technology Service Providers Act (TVTG)',
    chain: 'ethereum-mainnet',
    chainId: 1,
    contractAddress: '0x38d05ae9C44b8b40CdE3402A2A86E83b6a7174eF',
    contractConfirmed: false,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource: 'CoinGecko (kinesis-gold, USD)',
    pricingSourceTier: 'COINGECKO_PRIMARY',
    pricingSourceVerified: true,
    custodyModel:
      'Physical LBMA Good Delivery 999.9 fine gold held in KMS Labs vault network. ' +
      'Same custody framework as KAG. KMS Labs publishes attestations; cadence ' +
      'should be verified from kinesis.money before reliance.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 1, // TVTG
      d2ContractConfirmation: 1, // Pending direct verification on Etherscan
      d3MarketData: 2, // CoinGecko only
      d4CustodyRedeemability: 1, // Same as KAG
      d5RegulatoryClarity: 1, // Same as KAG
      d6DisclosureCompatibility: 0, // KAG pattern reusable
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Kinesis Money', url: 'https://kinesis.money' },
      { label: 'Kinesis Terms', url: 'https://kinesis.money/terms' },
    ],
    notes:
      'KAU is the gram-denominated gold counterpart to KAG. 1 KAU = 1 gram of ' +
      'LBMA Good Delivery 999.9 fine gold. Contract address requires direct ' +
      'verification from KMS Labs developer documentation before READY_NOW ' +
      'admission is finalized; treat as pending until KIN-style verification ' +
      'item is closed.',
    effectiveDate: '2026-05-02',
  },

  // ── Recommended next: USDC ──────────────────────────────────────────────────
  {
    symbol: 'USDC',
    name: 'USD Coin',
    category: 'RESERVE_GRADE_STABLE',
    issuer: 'Circle Internet Financial, LLC',
    issuerRegulator:
      'US state money-transmitter licenses; UK FCA registered; EU MiCA-compliant ' +
      '(EMT issuance via Circle Mint Europe SAS)',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    contractConfirmed: true,
    contractStandard: 'ERC-20 (native Arbitrum USDC)',
    decimals: 6,
    pricingSource:
      'Chainlink USDC/USD (Arbitrum One) — primary; CoinGecko (usd-coin) — secondary',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'Cash and short-duration US Treasuries held with regulated custodians ' +
      '(BNY Mellon, others). Reserves held in segregated accounts and US Treasury ' +
      'money-market funds. Circle publishes monthly attestations by Deloitte and ' +
      'daily reserve composition updates.',
    redeemabilityClarity: 'CLEAR',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'READY_NOW',
    riskLabel: 'TIER_1_VERIFIED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 0, // US MTL + FCA + MiCA
      d2ContractConfirmation: 0, // Native Arbitrum USDC
      d3MarketData: 0, // Chainlink + CoinGecko
      d4CustodyRedeemability: 0, // Cash + Treasuries, monthly attestation
      d5RegulatoryClarity: 0, // Recognized payment instrument
      d6DisclosureCompatibility: 0, // Standard institutional language
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Circle USDC', url: 'https://www.circle.com/en/usdc' },
      {
        label: 'Circle Reserve Reports',
        url: 'https://www.circle.com/transparency',
      },
      {
        label: 'USDC on Arbiscan',
        url: 'https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      },
    ],
    notes:
      'USDC is recognized as an external reserve-grade stable for portfolio ' +
      'visibility and disclosure only. Axiom does not issue USDC. ' +
      'AXUSD is the Axiom-issued stable; USDC is supported as an external ' +
      'reference asset. Native Arbitrum USDC contract used (not bridged USDC.e).',
    effectiveDate: '2026-05-02',
  },

  // ── Recommended next: WBTC ──────────────────────────────────────────────────
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    category: 'STRATEGIC_CRYPTO',
    issuer:
      'BitGo Trust Company, Inc. (custodian and issuer of record); WBTC DAO governs ' +
      'the merchant network',
    issuerRegulator:
      'BitGo Trust Company is a South Dakota chartered trust company; subject to ' +
      'state trust regulation',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 8,
    pricingSource:
      'Chainlink BTC/USD (Arbitrum One) — primary; CoinGecko (wrapped-bitcoin) — secondary',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'BTC held 1:1 in BitGo cold storage with on-chain proof of reserves ' +
      'published continuously. Mint and burn handled by approved merchants ' +
      'against verified BTC deposits.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'READY_NOW',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 1, // BitGo Trust (state charter, not federal)
      d2ContractConfirmation: 0, // Verified
      d3MarketData: 0, // Chainlink + CoinGecko
      d4CustodyRedeemability: 1, // PoR + merchant network model
      d5RegulatoryClarity: 1, // Regulated trust custodian model
      d6DisclosureCompatibility: 0, // Standard wrapper-asset language
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'WBTC.network', url: 'https://wbtc.network' },
      { label: 'BitGo Trust', url: 'https://www.bitgo.com/trust/' },
      {
        label: 'WBTC on Arbiscan',
        url: 'https://arbiscan.io/token/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      },
    ],
    notes:
      'WBTC is recognized as a strategic crypto asset for portfolio visibility ' +
      'and disclosure. Axiom already uses BitGo CaaS for separate banking ' +
      'infrastructure; that relationship does not extend WBTC oversight to Axiom. ' +
      'Axiom does not issue WBTC and does not custody the underlying BTC.',
    effectiveDate: '2026-05-02',
  },

  // ── Recommended next: DAI ───────────────────────────────────────────────────
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    category: 'RESERVE_GRADE_STABLE',
    issuer: 'Sky Protocol (formerly MakerDAO) — decentralized issuer',
    issuerRegulator:
      'Decentralized protocol — no single regulator. Operates via on-chain ' +
      'governance. Not a regulated entity.',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource:
      'Chainlink DAI/USD (Arbitrum One) — primary; CoinGecko (dai) — secondary',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'Backed by a mix of crypto-collateral (ETH, wstETH, etc.) and real-world ' +
      'assets via Sky vaults; reserve composition published on-chain and via ' +
      'Sky governance dashboards.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 2, // Decentralized issuer, no prudential regulator
      d2ContractConfirmation: 0, // Verified
      d3MarketData: 0, // Chainlink + CoinGecko
      d4CustodyRedeemability: 1, // On-chain collateral, governance redemption
      d5RegulatoryClarity: 2, // Categorization uncertain in many jurisdictions
      d6DisclosureCompatibility: 1, // Requires careful framing of collateral mix
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Sky / MakerDAO', url: 'https://sky.money' },
      {
        label: 'DAI on Arbiscan',
        url: 'https://arbiscan.io/token/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      },
    ],
    notes:
      'DAI is registered as a reserve-grade stable candidate but enters at ' +
      'NEEDS_DILIGENCE due to (a) decentralized issuer without prudential ' +
      'regulator and (b) ongoing rebrand from MakerDAO to Sky and the USDS ' +
      'parallel issuance. Public surface deferred until disclosure language ' +
      'pattern for decentralized stables is filed.',
    effectiveDate: '2026-05-02',
  },

  // ── NEEDS DILIGENCE: USDT ───────────────────────────────────────────────────
  {
    symbol: 'USDT',
    name: 'Tether USD',
    category: 'RESERVE_GRADE_STABLE',
    issuer: 'Tether Operations Limited',
    issuerRegulator:
      'British Virgin Islands; El Salvador stablecoin license. Not regulated ' +
      'by NYDFS, OCC, FCA, or under MiCA.',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 6,
    pricingSource: 'Chainlink USDT/USD (Arbitrum One); CoinGecko (tether)',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'Reserves disclosed quarterly by BDO. Reserve composition includes US ' +
      'Treasuries, cash, and other assets. Attestation cadence and depth less ' +
      'rigorous than Circle USDC; no full audit by a Big-4 firm.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 2, // Disclosed but not under prudential regulator
      d2ContractConfirmation: 0,
      d3MarketData: 0,
      d4CustodyRedeemability: 2, // Custodian opaque historically; quarterly only
      d5RegulatoryClarity: 1,
      d6DisclosureCompatibility: 1, // Requires careful attestation framing
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Tether Transparency', url: 'https://tether.to/en/transparency' },
    ],
    notes:
      'USDT enters as NEEDS_DILIGENCE pending review of attestation cadence ' +
      'and disclosure language sufficient to describe Tether reserves without ' +
      'overclaiming. No public surface until diligence complete.',
    effectiveDate: '2026-05-02',
  },

  // ── NEEDS DILIGENCE: wstETH ─────────────────────────────────────────────────
  {
    symbol: 'wstETH',
    name: 'Wrapped Liquid Staked Ether (Lido)',
    category: 'STRATEGIC_CRYPTO',
    issuer: 'Lido DAO',
    issuerRegulator:
      'Decentralized protocol — no single regulator. Subject to ETH staking ' +
      'regulatory considerations in various jurisdictions.',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: '0x5979D7b546E38E414F7E9822514be443A4800529',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource:
      'Chainlink wstETH/USD (Arbitrum One); CoinGecko (wrapped-steth)',
    pricingSourceTier: 'CHAINLINK_AND_SECONDARY',
    pricingSourceVerified: true,
    custodyModel:
      'Non-custodial — wstETH is a wrapper around stETH, which represents staked ' +
      'ETH in the Lido validator set. Withdrawal goes through the Lido ' +
      'withdrawal queue post-Shapella.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PENDING',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_3_RESTRICTED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 2, // DAO, no prudential regulator
      d2ContractConfirmation: 0,
      d3MarketData: 0,
      d4CustodyRedeemability: 1,
      d5RegulatoryClarity: 2, // ETH staking SEC posture in flux
      d6DisclosureCompatibility: 2, // Yield-bearing wrapper requires careful framing
    },
    detailRoute: null,
    disclosureLinks: [
      { label: 'Lido Finance', url: 'https://lido.fi' },
    ],
    notes:
      'wstETH is a yield-bearing ETH wrapper. Admission requires explicit ' +
      'disclosure that holding wstETH represents ETH staking exposure with ' +
      'protocol risk and validator risk, and that any displayed yield comes ' +
      'from ETH staking rewards distributed by Lido — not by Axiom. ' +
      'NEEDS_DILIGENCE until yield disclosure pattern is filed.',
    effectiveDate: '2026-05-02',
  },

  // ── Live: XAUT (Tether Gold) ────────────────────────────────────────────────
  // External-supported gold rail; BVI-issued, Swiss-vaulted LBMA gold.
  // Read-only, served via the generalized externalAssetService.
  {
    symbol: 'XAUT',
    name: 'Tether Gold',
    category: 'DIGITAL_COMMODITY',
    issuer: 'TG Commodities Limited (Tether Gold)',
    issuerRegulator:
      'British Virgin Islands. Not regulated by U.S. SEC, CFTC, OCC, or NYDFS. ' +
      'Tether publishes periodic attestations; verify directly from gold.tether.to.',
    chain: 'ethereum-mainnet',
    chainId: 1,
    contractAddress: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 6,
    pricingSource: 'CoinGecko (tether-gold, USD per token ≈ per troy oz)',
    pricingSourceTier: 'COINGECKO_PRIMARY',
    pricingSourceVerified: true,
    custodyModel:
      'Physical LBMA Good Delivery 995+ fine gold held in a Swiss vault by ' +
      'TG Commodities Limited. Each XAUT represents one troy ounce of gold ' +
      'with a specific bar serial-number reference.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PUBLISHED',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_2_REVIEWED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 2, // BVI; not U.S.-regulated
      d2ContractConfirmation: 0,
      d3MarketData: 0,
      d4CustodyRedeemability: 1,
      d5RegulatoryClarity: 2, // BVI vs U.S. issuer profile
      d6DisclosureCompatibility: 1,
    },
    detailRoute: '/assets/xaut',
    disclosureLinks: [
      { label: 'Tether Gold — Official Site', url: 'https://gold.tether.to' },
      {
        label: 'XAUT contract on Etherscan',
        url: 'https://etherscan.io/token/0x68749665FF8D2d112Fa859AA293F07A622782F38',
      },
    ],
    notes:
      'External-supported gold rail. Direct read-only support via ' +
      'lib/assets/externalAssetService.ts — metadata, balance, USD reference, ' +
      'disclosure, portfolio. No swaps, no lending, no banking rails. ' +
      'AXAU remains the Axiom-issued gold rail; XAUT is independent.',
    effectiveDate: '2026-05-02',
  },

  // ── Live: cbETH (Coinbase Wrapped Staked ETH) ───────────────────────────────
  // Yield-bearing wrapper — rate changes over time as Coinbase staking rewards
  // accrue. NOT a 1:1 ETH wrapper. Read-only, no Axiom yield offered or implied.
  {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    category: 'STRATEGIC_CRYPTO',
    issuer: 'Coinbase, Inc. (cbETH issuer; Coinbase Custody Trust as custodian)',
    issuerRegulator:
      'Coinbase Custody Trust Company is a New York limited purpose trust company ' +
      'regulated by NYDFS. ETH staking products operate under the evolving U.S. ' +
      'staking regulatory framework; verify product status from coinbase.com.',
    chain: 'ethereum-mainnet',
    chainId: 1,
    contractAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    contractConfirmed: true,
    contractStandard: 'ERC-20',
    decimals: 18,
    pricingSource: 'CoinGecko (coinbase-wrapped-staked-eth, USD)',
    pricingSourceTier: 'COINGECKO_PRIMARY',
    pricingSourceVerified: true,
    custodyModel:
      'cbETH represents an evolving claim on ETH staked on the Coinbase staking ' +
      'platform. Underlying ETH is held in Coinbase Custody. cbETH/ETH conversion ' +
      'rate is published on-chain and increases over time as staking rewards accrue.',
    redeemabilityClarity: 'CONDITIONAL',
    productStatus: 'EXTERNAL_SUPPORTED',
    disclosureStatus: 'PUBLISHED',
    admissionStatus: 'NEEDS_DILIGENCE',
    riskLabel: 'TIER_3_RESTRICTED',
    readOnlySupported: true,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 1, // NYDFS-regulated custodian
      d2ContractConfirmation: 0,
      d3MarketData: 0,
      d4CustodyRedeemability: 2, // Staking unwind queue dependency
      d5RegulatoryClarity: 2, // U.S. staking framework still evolving
      d6DisclosureCompatibility: 2, // Yield-bearing wrapper requires explicit disclosure
    },
    detailRoute: '/assets/cbeth',
    disclosureLinks: [
      { label: 'Coinbase — cbETH', url: 'https://www.coinbase.com/cbeth' },
      {
        label: 'cbETH contract on Etherscan',
        url: 'https://etherscan.io/token/0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
      },
    ],
    notes:
      'Yield-bearing staked-ETH wrapper. cbETH/ETH ratio changes over time. ' +
      'Read-only support via lib/assets/externalAssetService.ts — metadata, ' +
      'balance, USD reference, disclosure, portfolio. No yield is offered or ' +
      'implied by Axiom — staking rewards accrue from the Coinbase staking ' +
      'platform, not from Axiom. No swaps, no lending, no staking, no banking rails.',
    effectiveDate: '2026-05-02',
  },

  // ── OUT OF SCOPE: AXAG ──────────────────────────────────────────────────────
  // Recorded explicitly so the registry truth matches the public truth.
  {
    symbol: 'AXAG',
    name: 'Axiom Silver (deferred)',
    category: 'AXIOM_ISSUED',
    issuer: 'Axiom Protocol (would-be issuer — not active)',
    issuerRegulator: 'N/A — instrument not live',
    chain: 'arbitrum-one',
    chainId: 42161,
    contractAddress: null,
    contractConfirmed: false,
    contractStandard: 'N/A',
    decimals: 0,
    pricingSource: 'N/A — instrument not live',
    pricingSourceTier: 'NONE',
    pricingSourceVerified: false,
    custodyModel:
      'Not applicable — AXAG is not live and is not issued. The silver sleeve ' +
      'inside AXAU (Option B) is the active path; AXAG standalone (Option A) ' +
      'is deferred.',
    redeemabilityClarity: 'NONE',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    disclosureStatus: 'PUBLISHED',
    admissionStatus: 'OUT_OF_SCOPE',
    riskLabel: 'TIER_3_RESTRICTED',
    readOnlySupported: false,
    axiomCustodies: false,
    axiomIssues: false,
    readinessScore: {
      d1IssuerVerification: 0,
      d2ContractConfirmation: 3, // No contract — hard block
      d3MarketData: 3, // No market — hard block
      d4CustodyRedeemability: 3, // Not live
      d5RegulatoryClarity: 0,
      d6DisclosureCompatibility: 0,
    },
    detailRoute: null,
    disclosureLinks: [],
    notes:
      'AXAG truth statement: not live, not issued. Recorded in the registry ' +
      'so that the read-only asset truth matches the public truth across all ' +
      'surfaces. The silver path inside Axiom is (a) KAG external support, ' +
      'live; and (b) the silver sleeve inside AXAU (Option B), in diligence.',
    rejectionReason:
      'AXAG is not live and is not issued. Recording in registry as ' +
      'OUT_OF_SCOPE preserves truth-statement alignment across all surfaces. ' +
      'Silver sleeve inside AXAU (Option B) is the active path — see ' +
      'documents/commodities/AXAG_INTERNAL_AUDIT_REPORT.md §5.',
    effectiveDate: '2026-05-02',
  },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

export function listAssets(): ExternalAsset[] {
  return EXTERNAL_ASSETS;
}

export function getAsset(symbol: string): ExternalAsset | undefined {
  const target = symbol.toUpperCase();
  return EXTERNAL_ASSETS.find((a) => a.symbol === target);
}

export function listAssetsByCategory(category: AssetCategory): ExternalAsset[] {
  return EXTERNAL_ASSETS.filter((a) => a.category === category);
}

export function listAssetsByAdmissionStatus(
  status: AdmissionStatus
): ExternalAsset[] {
  return EXTERNAL_ASSETS.filter((a) => a.admissionStatus === status);
}

export function listReadyNowAssets(): ExternalAsset[] {
  return listAssetsByAdmissionStatus('READY_NOW');
}

export function listNeedsDiligenceAssets(): ExternalAsset[] {
  return listAssetsByAdmissionStatus('NEEDS_DILIGENCE');
}

export function listOutOfScopeAssets(): ExternalAsset[] {
  return listAssetsByAdmissionStatus('OUT_OF_SCOPE');
}

/**
 * Verifies a registry entry's admission status against its readinessScore.
 *
 * Manual downgrades are permitted — a reviewer may hold an asset more
 * conservatively than its score suggests (e.g., NEEDS_DILIGENCE despite a
 * READY_NOW score) when there is a documented diligence item open. This
 * matches the principle "always allowed to be more cautious."
 *
 * Manual upgrades are NEVER permitted — stored status must not be more
 * permissive than derived. Any such case is returned as a mismatch.
 *
 * Returns null if consistent (or conservatively downgraded), otherwise an
 * object describing the dangerous mismatch. Intended for integrity tests.
 */
const STATUS_PERMISSIVENESS: Record<AdmissionStatus, number> = {
  READY_NOW: 2,
  NEEDS_DILIGENCE: 1,
  OUT_OF_SCOPE: 0,
};

export function checkAdmissionConsistency(
  asset: ExternalAsset
): { stored: AdmissionStatus; derived: AdmissionStatus; reason: string } | null {
  const derived = deriveAdmissionStatus(asset.readinessScore);
  if (derived === asset.admissionStatus) return null;
  const storedRank = STATUS_PERMISSIVENESS[asset.admissionStatus];
  const derivedRank = STATUS_PERMISSIVENESS[derived];
  if (storedRank > derivedRank) {
    return {
      stored: asset.admissionStatus,
      derived,
      reason:
        'Stored status is more permissive than derived score allows. ' +
        'Either lower the stored status or document why the score is wrong.',
    };
  }
  return null; // Conservative downgrade — allowed.
}
