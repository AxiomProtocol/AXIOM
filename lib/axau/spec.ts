export const AXAU_SPEC_VERSION = '1.0.0';
export const AXAU_SPEC_EFFECTIVE_DATE = '2026-04-02';
export const AXAU_SPEC_CLASSIFICATION = 'Institutional Specification — Not Investment Advice';

export const AXAU_TOKEN_METADATA = {
  name: 'Axiom Gold Reserve Unit',
  symbol: 'AXAU',
  standard: 'ERC-3643 (T-REX)',
  network: 'Arbitrum One',
  chainId: 42161,
  decimals: 18,
  pegMechanism: 'Multi-commodity reserve basket anchored by gold (XAU)',
  architectureBrand: 'AXAU Reserve Layers',
  deploymentStatus: 'SPECIFICATION_PHASE',
  contractAddress: null,
  description:
    'AXAU is Axiom Protocol\'s store-of-value and wealth preservation instrument. Each AXAU unit is backed by a governance-approved basket of real-world commodities, anchored by gold. The reserve basket expands over time through community governance — each approved commodity addition raises the per-token backing without diluting existing holders.',
} as const;

export type ReserveLayerStatus =
  | 'ACTIVE'
  | 'PLANNED'
  | 'GOVERNANCE_VOTE_REQUIRED'
  | 'SPECIFICATION_ONLY';

export type RiskTier = 'TIER_1_LIQUID' | 'TIER_2_SEMI_LIQUID' | 'TIER_3_ILLIQUID';

export interface ReserveLayer {
  id: string;
  phase: number;
  commodity: string;
  symbol: string;
  status: ReserveLayerStatus;
  riskTier: RiskTier;
  custodyMethod: string;
  reserveAsset: string;
  oracleSource: string;
  oracleFallback: string;
  haircut: number;
  maxWeightPct: number | null;
  navUpdateCadence: string;
  description: string;
  custodyNotes: string;
  regulatoryNotes: string;
}

export const RESERVE_LAYERS: ReserveLayer[] = [
  {
    id: 'gold-paxg',
    phase: 1,
    commodity: 'Gold',
    symbol: 'XAU',
    status: 'ACTIVE',
    riskTier: 'TIER_1_LIQUID',
    custodyMethod: 'Tokenized gold — PAXG (Paxos Gold, NYDFS-regulated)',
    reserveAsset: 'PAXG (ERC-20, 1 token = 1 troy oz London Good Delivery gold)',
    oracleSource: 'Chainlink XAU/USD (Arbitrum One) — primary',
    oracleFallback: 'Secondary signed institutional data feed → bounded TWAP → component pause',
    haircut: 0.05,
    maxWeightPct: null,
    navUpdateCadence: 'Real-time (on-chain oracle heartbeat — upon deployment)',
    description:
      'Gold is the founding anchor commodity of AXAU. The protocol holds PAXG as its gold reserve. PAXG is issued by Paxos Trust Company under NYDFS regulation; each token is redeemable for one troy ounce of London Good Delivery gold held in Brinks vaults. Paxos publishes monthly third-party reserve attestations. Axiom does not take direct physical custody of gold.',
    custodyNotes:
      'Physical gold custody handled by Paxos Trust Company / Brinks. Axiom treasury holds PAXG tokens in the AXGoldVault automated control layer. Monthly Paxos attestation reports referenced in Solvency Console.',
    regulatoryNotes:
      'PAXG is regulated by the New York Department of Financial Services. Gold-backed digital instruments may be subject to commodity regulations in certain jurisdictions. Participants should obtain independent legal and tax advice regarding their specific jurisdiction.',
  },
  {
    id: 'silver-xag',
    phase: 2,
    commodity: 'Silver',
    symbol: 'XAG',
    status: 'GOVERNANCE_VOTE_REQUIRED',
    riskTier: 'TIER_1_LIQUID',
    custodyMethod: 'Tokenized silver (pending admission of qualified reserve asset)',
    reserveAsset: 'Pending governance selection of qualified silver-backed token',
    oracleSource: 'Chainlink XAG/USD (Arbitrum One) — primary',
    oracleFallback: 'Secondary signed institutional data feed → bounded TWAP → component pause',
    haircut: 0.08,
    maxWeightPct: 30,
    navUpdateCadence: 'Real-time (on-chain oracle heartbeat)',
    description:
      'Silver may be added as a Phase 2 commodity component following AXM governance approval, component admission review, and custody partner selection. Addition requires a governance vote meeting minimum quorum threshold and timelock delay.',
    custodyNotes:
      'Custody partner to be determined via governance. Candidate reserve assets must demonstrate monthly third-party attestation, NYDFS or equivalent regulatory oversight, and on-chain oracle availability.',
    regulatoryNotes:
      'Subject to same commodity instrument considerations as gold. Governance admission review includes regulatory posture assessment.',
  },
  {
    id: 'land-rwa',
    phase: 3,
    commodity: 'Land (Real Property)',
    symbol: 'RWA-LAND',
    status: 'PLANNED',
    riskTier: 'TIER_3_ILLIQUID',
    custodyMethod: 'Axiom Physical-Digital Bridge — tokenized land title units from Axiom\'s proprietary acquisition pipeline',
    reserveAsset: 'Axiom Land Registry tokens representing titled real property interests acquired through governance-approved pipeline',
    oracleSource: 'Appraisal index + verified comparable transaction data (internal oracle)',
    oracleFallback: 'Previous confirmed appraisal with rising haircut schedule → governance review',
    haircut: 0.40,
    maxWeightPct: 10,
    navUpdateCadence: 'Monthly (appraisal-cadence; not real-time)',
    description:
      'Land is Axiom\'s proprietary differentiator in the AXAU reserve basket. Acquired real property from the Axiom land acquisition pipeline is tokenized through the Physical-Digital Bridge (Land and Asset Registry) and deposited into the AXLandVault illiquid sleeve. Due to the illiquid nature of real property, this component carries a 40% reserve haircut, a 10% maximum basket weight, and monthly NAV updates tied to appraisal cadence rather than real-time price feeds.',
    custodyNotes:
      'Physical title held by Axiom entity. Land Registry tokens represent governance-tracked interests in titled property. Appraisal performed by licensed third-party appraisers on a scheduled basis. Acquisition targets subject to governance approval and market conditions.',
    regulatoryNotes:
      'Real property interests and their digital representations may be subject to real estate regulations, securities laws, and transfer restrictions in applicable jurisdictions. The land sleeve represents a targeted acquisition roadmap, not a claim of current ownership or guaranteed acquisition.',
  },
  {
    id: 'energy-wti',
    phase: 4,
    commodity: 'Energy (WTI Crude)',
    symbol: 'WTI',
    status: 'GOVERNANCE_VOTE_REQUIRED',
    riskTier: 'TIER_2_SEMI_LIQUID',
    custodyMethod: 'Pending — no credible non-synthetic tokenized oil instrument currently qualifies',
    reserveAsset: 'Pending admission of qualified energy-backed reserve instrument',
    oracleSource: 'Chainlink WTI/USD (Arbitrum One, if available) — primary',
    oracleFallback: 'Secondary institutional feed → bounded TWAP → component pause',
    haircut: 0.15,
    maxWeightPct: 20,
    navUpdateCadence: 'Real-time (on-chain oracle heartbeat)',
    description:
      'Energy commodities represent a future expansion layer, pending maturation of credible tokenized commodity infrastructure. Synthetic or derivatives-based energy exposure does not qualify under AXAU admission criteria. This layer will not be activated until a custody-attestable, oracle-reliable instrument is available and passes governance admission review.',
    custodyNotes:
      'No custody partner currently qualified. Admission blocked until a non-synthetic, custodian-attested energy-backed instrument with verifiable on-chain proof of reserves is available.',
    regulatoryNotes:
      'Energy commodity instruments may be subject to CFTC jurisdiction and commodity derivatives regulations. Governance admission review will include regulatory posture assessment.',
  },
];

export interface NavFormula {
  name: string;
  formula: string;
  definition: string;
}

export const NAV_MECHANICS = {
  backingNAV: {
    name: 'Backing NAV',
    formula: 'Σ (Reserve_Quantity_i × Spot_Price_i × (1 − Haircut_i)) / AXAU_Outstanding',
    definition:
      'The total haircut-adjusted reserve value per outstanding AXAU token. This is the floor value each token is backed by. Backing NAV rises when governance adds commodity reserves without minting new AXAU — an expansion event accretive to existing holders.',
  },
  mintNAV: {
    name: 'Mint NAV',
    formula: 'Backing NAV × Coverage_Ratio_Floor',
    definition:
      'The minimum reserve value that must be deposited to mint 1 new AXAU. New tokens can only be issued when the deposited reserve value equals or exceeds the current Mint NAV. Discounted minting is prohibited.',
  },
  coverageRatioFloor: {
    value: 1.05,
    label: '105%',
    definition:
      'Minimum required Coverage Ratio to permit new AXAU minting. If aggregate reserve coverage falls below 105%, the mint function is paused until governance-approved rebalancing restores coverage.',
  },
  expansionEvent: {
    name: 'Expansion Event',
    definition:
      'An event in which governance approves and deposits new commodity reserves into the AXAU basket without a corresponding AXAU mint. The result is an increase in Backing NAV per outstanding token — holder-accretive by design.',
    trigger: 'AXM governance vote (supermajority) + Commodity Registry admission + reserve deposit',
  },
  redemption: {
    name: 'Redemption Mechanics',
    definition:
      'AXAU holders may redeem tokens for their pro-rata share of eligible liquid reserve components at current Backing NAV, subject to individual component availability. Illiquid sleeve components (land) are excluded from spot redemption and subject to governance-defined settlement procedures.',
  },
} as const;

export interface GovernanceRule {
  parameter: string;
  value: string;
  notes: string;
}

export const GOVERNANCE_RULES = {
  governanceToken: 'AXM (ERC-20 governance token on Arbitrum One)',
  quorumThreshold: '15% of circulating AXM supply',
  passThreshold: 'Simple majority (>50%) for parameter changes; Supermajority (>66%) for commodity additions and emergency actions',
  timelockDelay: '48 hours minimum on all parameter changes; 72 hours on commodity admission',
  emergencyGuardian: 'Governance Safe (3-of-5 multi-party authorization) — can pause individual components immediately; cannot change core parameters',
  foundingPeriod: 'During the Bootstrap Phase, Founder Ops retains operational authority. Governance transition to full AXM token-weighted voting is a planned milestone.',

  commodityAdmissionCriteria: [
    {
      criterion: 'Custody Attestability',
      description: 'Reserve asset must be supported by regular third-party attestations from a qualified custodian. Self-reported or unverified reserves do not qualify.',
    },
    {
      criterion: 'Oracle Reliability',
      description: 'A live, redundant on-chain price feed must exist for the commodity (Chainlink primary or equivalent). Synthetic or admin-only oracles do not satisfy this requirement.',
    },
    {
      criterion: 'Legal and Operational Readiness',
      description: 'The commodity instrument must have a defined regulatory posture in relevant jurisdictions. Admission review includes legal assessment of commodity, securities, and transfer law implications.',
    },
    {
      criterion: 'Non-Synthetic Backing',
      description: 'Derivatives-based or synthetic commodity exposure does not qualify. Reserve instruments must represent direct claims on physical or tokenized physical assets.',
    },
    {
      criterion: 'Solvency Stress Test',
      description: 'The proposed component must pass a solvency stress test demonstrating that its addition does not reduce aggregate coverage below the minimum threshold under adverse scenarios.',
    },
    {
      criterion: 'Liquidity Profile',
      description: 'Risk tier, haircut, and maximum weight are set at admission based on liquidity profile. Illiquid components are subject to higher haircuts and basket weight caps.',
    },
  ],

  commodityRemoval: {
    trigger: 'Oracle failure, custody attestation lapse, regulatory action, or governance vote',
    process: [
      'Emergency pause of mint against affected component (immediate, Guardian authority)',
      'Soft deprecation with rising haircut schedule (governance vote required)',
      'Full removal and unwind procedure (supermajority vote, timelock)',
    ],
  },

  parameters: [
    { parameter: 'Coverage Ratio Floor', value: '105%', notes: 'Minimum coverage to permit minting; governance can raise, not lower below 100%' },
    { parameter: 'Haircut — Tier 1 (Liquid)', value: '5–10%', notes: 'Set per component at admission; adjustable via governance vote' },
    { parameter: 'Haircut — Tier 2 (Semi-Liquid)', value: '10–20%', notes: 'Set per component at admission' },
    { parameter: 'Haircut — Tier 3 (Illiquid)', value: '30–50%', notes: 'Land sleeve minimum 40%; adjustable upward only via governance' },
    { parameter: 'Max Land Sleeve Weight', value: '10%', notes: 'Hard cap on illiquid RWA allocation; requires supermajority to increase' },
    { parameter: 'Governance Quorum', value: '15% circulating AXM', notes: 'Minimum participation for any binding vote' },
    { parameter: 'Timelock — Parameter Change', value: '48 hours', notes: 'Minimum delay; governance can extend, not reduce' },
    { parameter: 'Timelock — Commodity Admission', value: '72 hours', notes: 'Additional delay applied to all commodity additions' },
  ] as GovernanceRule[],
} as const;

export interface AuditMilestone {
  id: string;
  title: string;
  status: 'COMPLETE' | 'ACTIVE' | 'DEFERRED' | 'PLANNED';
  triggerCondition: string;
  description: string;
  targetFirms?: string[];
  scope?: string[];
}

export const AUDIT_ROADMAP: AuditMilestone[] = [
  {
    id: 'internal-review',
    title: 'Internal Specification Review',
    status: 'ACTIVE',
    triggerCondition: 'Now — in progress',
    description:
      'Full system specification, monetary policy document, and governance rules written and published on-platform. Serves as the institutional record and proof-of-execution artifact. Internal review by founding team against institutional vocabulary standards and disclosure requirements.',
  },
  {
    id: 'smart-contract-draft',
    title: 'Automated Control Layer Draft and Internal Testing',
    status: 'PLANNED',
    triggerCondition: 'Following specification approval and treasury readiness',
    description:
      'AXAUToken (ERC-3643), CommodityRegistry, ReserveVaultRouter (AXGoldVault Phase 1 + AXLandVault Phase 3), NAVEngine, and MintRedeemController drafted and tested on Arbitrum Sepolia testnet. Internal review against specification.',
    scope: [
      'AXAUToken (ERC-3643 compliant)',
      'CommodityRegistry governance module',
      'AXGoldVault (PAXG reserve adapter)',
      'AXLandVault (illiquid land sleeve adapter)',
      'NAVEngine (multi-commodity Backing NAV calculation)',
      'MintRedeemController (coverage enforcement, circuit breakers)',
      'GovernanceTimelock integration',
    ],
  },
  {
    id: 'external-audit',
    title: 'Independent Third-Party Security Audit',
    status: 'DEFERRED',
    triggerCondition: 'Treasury threshold: sufficient capital to fund a qualified security audit (estimated $50,000–$150,000 USD)',
    description:
      'External security audit of AXAU automated control layers by a qualified independent security firm. Deferred pending treasury development. This is an explicit, acknowledged risk during the bootstrap and proof-of-execution phase. No external capital is solicited or accepted without prior audit completion.',
    targetFirms: [
      'OpenZeppelin Audits',
      'Trail of Bits',
      'Certik',
      'Halborn',
      'Sherlock (competitive audit)',
    ],
    scope: [
      'All AXAU automated control layer contracts',
      'Oracle integration and manipulation resistance',
      'Access control and multi-party authorization model',
      'Mint/redeem logic and coverage enforcement',
      'Emergency pause and recovery procedures',
    ],
  },
  {
    id: 'custody-attestation',
    title: 'Ongoing Reserve Custody Attestation',
    status: 'PLANNED',
    triggerCondition: 'Upon first PAXG deposit into AXGoldVault',
    description:
      'Monthly reconciliation of Paxos reserve attestation data against on-chain PAXG balance in AXGoldVault. Published to Solvency Console. Land appraisals published monthly upon Phase 3 activation.',
  },
  {
    id: 'legal-review',
    title: 'Independent Legal and Regulatory Review',
    status: 'DEFERRED',
    triggerCondition: 'Prior to public issuance or solicitation of external capital',
    description:
      'Independent legal review of AXAU instrument classification, commodity/securities law posture, and disclosure obligations in relevant jurisdictions. Required before any external capital raising activity. Deferred during bootstrap/internal treasury phase.',
  },
];

export interface RolloutPhase {
  phase: string;
  label: string;
  status: string;
  isCurrentPhase: boolean;
  items: string[];
}

export const ROLLOUT_PHASES: RolloutPhase[] = [
  {
    phase: 'Phase 1',
    label: 'Gold Anchor — Specification and Deployment',
    status: 'Active — This specification is Phase 1, Step 1',
    isCurrentPhase: true,
    items: [
      'This specification document published and reviewed',
      'AXAUToken (ERC-3643) + CommodityRegistry + AXGoldVault (PAXG adapter)',
      'NAVEngine (XAU/USD Chainlink oracle) + MintRedeemController',
      'GovernanceTimelock integration with AXM governance',
      'Internal testnet deployment and validation',
      'Paxos reserve attestation pipeline connected to Solvency Console',
    ],
  },
  {
    phase: 'Phase 2',
    label: 'Silver Addition (First Expansion Event)',
    status: 'Planned — requires Phase 1 deployment + governance vote',
    isCurrentPhase: false,
    items: [
      'AXM governance vote approving silver as reserve commodity',
      'Custody partner selection and attestation pipeline',
      'AXSilverVault deployment and Chainlink XAG/USD integration',
      'Component isolation testing (silver fault does not halt gold)',
      'Solvency Console multi-asset reserve display',
    ],
  },
  {
    phase: 'Phase 3',
    label: 'Land Sleeve — Axiom Physical-Digital Bridge Integration',
    status: 'Planned — runs parallel to Phase 2; land acquisition pipeline prerequisite',
    isCurrentPhase: false,
    items: [
      'First qualified land parcel acquired through governance-approved pipeline',
      'AXLandVault deployment with illiquid sleeve parameters (40% haircut, 10% cap)',
      'Land Registry token integration as vault deposit unit',
      'Monthly appraisal-cadence NAV update pipeline',
      'Solvency Console land allocation display with appraisal timestamp',
    ],
  },
  {
    phase: 'Phase 4+',
    label: 'Energy and Additional Commodity Layers',
    status: 'Future — no timeline; contingent on market infrastructure maturity',
    isCurrentPhase: false,
    items: [
      'Pending maturation of credible tokenized commodity infrastructure for energy',
      'Each addition requires full commodity admission review and governance vote',
      'Synthetic and derivatives-based instruments do not qualify',
    ],
  },
];

export const DISCLOSURE_NOTICES = [
  'AXAU is currently in specification phase. No token has been deployed. No minting, redemption, or issuance is currently available.',
  'This specification document does not constitute an offer to sell or a solicitation to purchase any security, commodity, or digital asset.',
  'Past performance of referenced commodities (gold, silver, real property) is not indicative of future performance of AXAU.',
  'No independent third-party security audit of AXAU automated control layers has been completed. External audit is a deferred milestone pending treasury development.',
  'Reserve haircuts, coverage floors, and governance parameters described herein are initial specifications subject to change through the governance process.',
  'Real property interests referenced in Phase 3 represent a targeted acquisition framework, not a claim of current ownership or guaranteed acquisition of specific parcels.',
  'Participants should obtain independent legal, financial, and tax advice before participating in any AXAU-related activity.',
] as const;

export const PROTOCOL_INTEGRATION = {
  axusdRelationship:
    'AXAU is designed to complement AXUSD (the protocol\'s USD-pegged stablecoin). In Phase 1, AXAU held in the Axiom treasury is classified as a commodity reserve asset that contributes to AXUSD\'s reserve diversification (haircut-adjusted). In Phase 2, AXAU may serve as collateral to mint AXUSD, with conservative LTV ratios and dynamic haircuts by component. The two instruments serve distinct functions: AXUSD for everyday settlement and payment; AXAU for long-term store of value and wealth preservation.',
  axmRelationship:
    'AXM governance token holders exercise voting authority over AXAU: commodity admission, parameter changes, emergency actions, and governance model evolution. AXM is not a reserve component of AXAU.',
  landPipelineRelationship:
    'Axiom\'s existing Land and Asset Registry and Physical-Digital Bridge infrastructure serves as the foundation for the Phase 3 land sleeve. Titles acquired through the governance-approved land acquisition pipeline are the primary candidates for AXLandVault deposits.',
} as const;
