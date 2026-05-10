/**
 * Axiom Assets Hub aggregation layer
 *
 * Public, read-only normalization of the official starting asset universe.
 * This file aggregates existing registry/source truth into one hub model without
 * mutating commodity, external-asset, cap-infra, or contract registries.
 *
 * Hard rules:
 *   - No writes, no contract calls, no banking rails.
 *   - Do not add new assets through this file.
 *   - AXAG remains NOT_LIVE_NOT_ISSUED.
 *   - LAND remains DEPLOYED_INACTIVE.
 *   - KAG remains EXTERNAL_SUPPORTED and read-only.
 */

import { getCommodity } from '../commodities/registry';
import { D } from '../commodities/disclosures';
import { RESERVE_LAYERS } from '../axau/spec';
import { AXM_TOKEN_CONFIG, CORE_CONTRACTS } from '../../shared/contracts';

export type AssetHubGroup =
  | 'INTERNAL_LIVE_CORE'
  | 'EXTERNAL_SUPPORTED_LAYER'
  | 'PAUSED_INACTIVE_DRAFT'
  | 'INVESTIGATE_LATER';

export type AssetHubCategory =
  | 'STABLE'
  | 'RESERVE_FRAMEWORK'
  | 'GOVERNANCE'
  | 'VOTE_ESCROW'
  | 'SILVER'
  | 'LAND'
  | 'NFT_UTILITY'
  | 'UNKNOWN';

export type AssetHubProductStatus =
  | 'LIVE'
  | 'EXTERNAL_SUPPORTED'
  | 'DEPLOYED_INACTIVE'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'NEEDS_REVIEW';

export type AssetHubMaturityLabel =
  | 'production'
  | 'external-live'
  | 'inactive'
  | 'not-issued'
  | 'investigate';

export type AssetHubRiskLabel =
  | 'LIVE_CORE'
  | 'EXTERNAL_READ_ONLY'
  | 'INACTIVE'
  | 'NOT_ISSUED'
  | 'NEEDS_REVIEW';

export interface AssetHubLink {
  href: string;
  label: string;
  kind: 'primary' | 'detail' | 'tool' | 'docs';
}

export interface AssetHubEntry {
  name: string;
  symbol: string;
  category: AssetHubCategory;
  group: AssetHubGroup;
  issuer: string;
  chain: string;
  productStatus: AssetHubProductStatus;
  axiomIssued: boolean;
  axiomCustodies: boolean;
  lifecycleTruth: 'LIVE' | 'READ_ONLY' | 'INACTIVE' | 'NOT_ISSUED' | 'UNCLASSIFIED';
  description: string;
  links: AssetHubLink[];
  disclosureNotes: string[];
  maturityLabel: AssetHubMaturityLabel;
  riskLabel: AssetHubRiskLabel;
  role: string;
  productTruthStatement: string;
  sourceRefs: string[];
}

export interface AssetHubSection {
  id: AssetHubGroup;
  title: string;
  description: string;
  entries: AssetHubEntry[];
}

const axau = getCommodity('AXAU');
const kag = getCommodity('KAG');
const axag = getCommodity('AXAG');
const landLayer = RESERVE_LAYERS.find((layer) => layer.id === 'land-rwa');

const INTERNAL_LIVE_CORE: AssetHubEntry[] = [
  {
    name: 'Axiom USD',
    symbol: 'AXUSD',
    category: 'STABLE',
    group: 'INTERNAL_LIVE_CORE',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    productStatus: 'LIVE',
    axiomIssued: true,
    axiomCustodies: false,
    lifecycleTruth: 'LIVE',
    description:
      'Axiom-issued stable settlement asset used as the protocol unit of account across settlement, treasury, lending, and portfolio surfaces.',
    links: [
      { href: '/axusd', label: 'AXUSD overview', kind: 'primary' },
      { href: '/axusd-3643', label: 'AXUSD settlement rail', kind: 'detail' },
      { href: '/portfolio/real-assets', label: 'Real-assets portfolio', kind: 'tool' },
    ],
    disclosureNotes: [
      'AXUSD is the Axiom-issued stable asset layer.',
      'AXUSD balances are wallet-held; this hub introduces no custody or write path.',
      'AXUSD reserve, lending, and settlement surfaces remain governed by their existing controls.',
    ],
    maturityLabel: 'production',
    riskLabel: 'LIVE_CORE',
    role: 'Stable settlement and unit-of-account layer.',
    productTruthStatement: 'AXUSD is an internal live core Axiom asset.',
    sourceRefs: [
      'pages/axusd.tsx',
      'pages/axusd-3643.tsx',
      'lib/portfolio/realAssetsPortfolio.ts',
      'shared/contracts.ts',
    ],
  },
  {
    name: axau?.name ?? 'Axiom Gold Reserve',
    symbol: 'AXAU',
    category: 'RESERVE_FRAMEWORK',
    group: 'INTERNAL_LIVE_CORE',
    issuer: axau?.issuer ?? 'Axiom Protocol',
    chain: axau?.chain ?? 'Arbitrum One',
    productStatus: 'LIVE',
    axiomIssued: true,
    axiomCustodies: axau?.axiomCustodies ?? false,
    lifecycleTruth: 'LIVE',
    description:
      'Axiom reserve framework with gold as the current live reserve module. AXAU is the live gold reserve rail, not a roadmap claim.',
    links: [
      { href: '/axau', label: 'AXAU reserve', kind: 'primary' },
      { href: '/axau-disclosure', label: 'AXAU disclosure', kind: 'detail' },
      { href: '/commodities', label: 'Commodities hub', kind: 'tool' },
      { href: '/commodities/insights', label: 'Commodity insights', kind: 'tool' },
    ],
    disclosureNotes: [
      D.AXAU_ISSUED_BY_AXIOM,
      D.AXAU_RESERVE_FRAMEWORK,
      D.AXAU_NAV_ON_CHAIN,
      D.AXAU_ADDITIONAL_SLEEVES,
    ],
    maturityLabel: 'production',
    riskLabel: 'LIVE_CORE',
    role: 'Gold reserve module and reserve-framework anchor.',
    productTruthStatement:
      'AXAU is the reserve framework and gold is the current live reserve module.',
    sourceRefs: [
      'lib/commodities/registry.ts',
      'lib/commodities/disclosures.ts',
      'lib/axau/spec.ts',
    ],
  },
  {
    name: AXM_TOKEN_CONFIG.name,
    symbol: AXM_TOKEN_CONFIG.symbol,
    category: 'GOVERNANCE',
    group: 'INTERNAL_LIVE_CORE',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    productStatus: 'LIVE',
    axiomIssued: true,
    axiomCustodies: false,
    lifecycleTruth: 'LIVE',
    description:
      'Protocol governance and coordination token for Axiom system parameters, treasury policy, and asset-layer governance.',
    links: [
      { href: '/trust/governance', label: 'Governance overview', kind: 'primary' },
      { href: '/dex', label: 'Protocol exchange', kind: 'tool' },
      { href: '/infrastructure', label: 'Infrastructure map', kind: 'tool' },
    ],
    disclosureNotes: [
      'AXM is the Axiom protocol governance token on Arbitrum One.',
      'AXM stays in user wallets; this hub introduces no custody path.',
      'Governance functionality is subject to the active governance controls and disclosures.',
    ],
    maturityLabel: 'production',
    riskLabel: 'LIVE_CORE',
    role: 'Governance and protocol coordination.',
    productTruthStatement: 'AXM is part of the internal live core asset layer.',
    sourceRefs: ['shared/contracts.ts', 'pages/trust/governance.tsx', 'pages/dex.tsx'],
  },
  {
    name: 'SEED / veAXM',
    symbol: 'SEED',
    category: 'VOTE_ESCROW',
    group: 'INTERNAL_LIVE_CORE',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    productStatus: 'LIVE',
    axiomIssued: true,
    axiomCustodies: false,
    lifecycleTruth: 'LIVE',
    description:
      'Vote-escrow / participation-lock representation for AXM alignment. The repo preserves veAXM as a legacy alias for the same SEED contract.',
    links: [
      { href: '/earn', label: 'Earn and participation surfaces', kind: 'primary' },
      { href: '/earn/axusd', label: 'AXUSD earn surface', kind: 'tool' },
      { href: '/trust/governance', label: 'Governance overview', kind: 'detail' },
    ],
    disclosureNotes: [
      'SEED is the current vote-escrow / participation-lock naming for the veAXM contract.',
      'veAXM remains a legacy alias in contract references.',
      'This hub does not create a staking, reward, or custody action.',
    ],
    maturityLabel: 'production',
    riskLabel: 'LIVE_CORE',
    role: 'Participation lockup and governance-alignment layer.',
    productTruthStatement:
      'SEED / veAXM is part of the internal live core governance layer.',
    sourceRefs: ['shared/contracts.ts', 'lib/server/v2ContractService.ts', 'pages/earn.tsx'],
  },
];

const EXTERNAL_SUPPORTED_LAYER: AssetHubEntry[] = [
  {
    name: kag?.name ?? 'Kinesis Silver',
    symbol: 'KAG',
    category: 'SILVER',
    group: 'EXTERNAL_SUPPORTED_LAYER',
    issuer: kag?.issuer ?? 'KMS Labs / Kinesis ecosystem',
    chain: kag?.chain ?? 'Ethereum mainnet',
    productStatus: 'EXTERNAL_SUPPORTED',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'READ_ONLY',
    description:
      'External supported silver asset. Axiom provides read-only portfolio visibility, disclosure, and commodity insight linkage.',
    links: [
      { href: '/commodities/kag', label: 'KAG details', kind: 'primary' },
      { href: '/commodities', label: 'Commodities hub', kind: 'tool' },
      { href: '/portfolio/real-assets', label: 'Real-assets portfolio', kind: 'tool' },
      { href: '/commodities/insights', label: 'Commodity insights', kind: 'tool' },
    ],
    disclosureNotes: [
      D.KAG_ISSUED_BY_KMS,
      D.KAG_AXIOM_SUPPORTS,
      D.KAG_AXIOM_DOES_NOT_ISSUE,
      D.KAG_NO_CUSTODY,
      D.KAG_REDEMPTION_DEPENDS,
      D.KAG_READ_ONLY,
    ],
    maturityLabel: 'external-live',
    riskLabel: 'EXTERNAL_READ_ONLY',
    role: 'External silver visibility and disclosure layer.',
    productTruthStatement:
      'KAG is EXTERNAL_SUPPORTED, issued by KMS Labs within the Kinesis ecosystem, and supported read-only by Axiom.',
    sourceRefs: [
      'lib/commodities/registry.ts',
      'lib/commodities/disclosures.ts',
      'lib/commodities/kagService.ts',
    ],
  },
];

const PAUSED_INACTIVE_DRAFT: AssetHubEntry[] = [
  {
    name: 'LAND reserve sleeve',
    symbol: 'LAND',
    category: 'LAND',
    group: 'PAUSED_INACTIVE_DRAFT',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    productStatus: 'DEPLOYED_INACTIVE',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'INACTIVE',
    description:
      'Inactive land reserve expansion sleeve. LAND is not active reserve backing and is not presented as a live asset.',
    links: [
      { href: '/land', label: 'Land pipeline', kind: 'primary' },
      { href: '/axau', label: 'AXAU reserve context', kind: 'detail' },
    ],
    disclosureNotes: [
      'LAND is deployed inactive and not active reserve backing.',
      'LAND remains outside the active asset layer until governance, appraisal, custody, and reserve-enablement requirements are satisfied.',
      `Current AXAU reserve-layer source status: ${landLayer?.status ?? 'PLANNED / inactive'}.`,
    ],
    maturityLabel: 'inactive',
    riskLabel: 'INACTIVE',
    role: 'Inactive reserve expansion candidate.',
    productTruthStatement: 'LAND is DEPLOYED_INACTIVE and not active reserve backing.',
    sourceRefs: [
      'documents/axau/AXAU_RESERVE_FRAMEWORK_BRIEF.md',
      'documents/axau/AXAU_EVOLUTION_BOUNDARY_REPORT.md',
      'lib/axau/spec.ts',
      'pages/land.tsx',
    ],
  },
  {
    name: axag?.name ?? 'Axiom Silver Reserve',
    symbol: 'AXAG',
    category: 'SILVER',
    group: 'PAUSED_INACTIVE_DRAFT',
    issuer: axag?.issuer ?? 'n/a',
    chain: axag?.chain ?? 'n/a',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'NOT_ISSUED',
    description:
      'Axiom silver wrapper path that is explicitly not live and not issued. The active silver path is KAG external support.',
    links: [
      { href: '/commodities', label: 'Commodities hub', kind: 'primary' },
      { href: '/commodities/kag', label: 'Current silver path: KAG', kind: 'detail' },
    ],
    disclosureNotes: [
      D.AXAG_NOT_LIVE,
      D.AXAG_NO_TOKEN,
      D.AXAG_DEFERRED,
      D.AXAG_NOT_ISSUED_THIS_PHASE,
      D.AXAG_PHASE1,
    ],
    maturityLabel: 'not-issued',
    riskLabel: 'NOT_ISSUED',
    role: 'Deferred silver wrapper reference only.',
    productTruthStatement: 'AXAG is NOT_LIVE_NOT_ISSUED. No AXAG token exists.',
    sourceRefs: [
      'lib/commodities/registry.ts',
      'lib/commodities/disclosures.ts',
      'lib/assets/admissions.ts',
    ],
  },
];

const INVESTIGATE_LATER: AssetHubEntry[] = [
  {
    name: 'AxiomParticipation',
    symbol: 'AxiomParticipation',
    category: 'NFT_UTILITY',
    group: 'INVESTIGATE_LATER',
    issuer: 'Needs review',
    chain: 'Needs review',
    productStatus: 'NEEDS_REVIEW',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'UNCLASSIFIED',
    description:
      'NFT utility contract name found in repo minting/deployment surfaces. It is not classified into the active asset integration layer.',
    links: [{ href: '/nft', label: 'NFT utility surface', kind: 'primary' }],
    disclosureNotes: [
      'Unknown / needs review.',
      'Not part of the active integration layer.',
      'Do not treat as live until classified.',
    ],
    maturityLabel: 'investigate',
    riskLabel: 'NEEDS_REVIEW',
    role: 'Investigatory contract reference.',
    productTruthStatement:
      'AxiomParticipation needs review and is not part of the active asset layer.',
    sourceRefs: ['scripts/nft/deploy-nft.ts', 'pages/api/nft/mint-participation.ts'],
  },
  {
    name: 'AxiomFounderBadge',
    symbol: 'AxiomFounderBadge',
    category: 'NFT_UTILITY',
    group: 'INVESTIGATE_LATER',
    issuer: 'Needs review',
    chain: 'Needs review',
    productStatus: 'NEEDS_REVIEW',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'UNCLASSIFIED',
    description:
      'NFT utility contract name found in repo minting/deployment surfaces. It is not classified into the active asset integration layer.',
    links: [{ href: '/nft', label: 'NFT utility surface', kind: 'primary' }],
    disclosureNotes: [
      'Unknown / needs review.',
      'Not part of the active integration layer.',
      'Do not treat as live until classified.',
    ],
    maturityLabel: 'investigate',
    riskLabel: 'NEEDS_REVIEW',
    role: 'Investigatory contract reference.',
    productTruthStatement:
      'AxiomFounderBadge needs review and is not part of the active asset layer.',
    sourceRefs: ['scripts/nft/deploy-nft.ts', 'pages/api/nft/mint-badge.ts'],
  },
  {
    name: 'AxiomLandReceipt',
    symbol: 'AxiomLandReceipt',
    category: 'NFT_UTILITY',
    group: 'INVESTIGATE_LATER',
    issuer: 'Needs review',
    chain: 'Needs review',
    productStatus: 'NEEDS_REVIEW',
    axiomIssued: false,
    axiomCustodies: false,
    lifecycleTruth: 'UNCLASSIFIED',
    description:
      'NFT utility contract name found in repo minting/deployment surfaces. It is not LAND reserve backing and is not classified as an active asset.',
    links: [{ href: '/nft', label: 'NFT utility surface', kind: 'primary' }],
    disclosureNotes: [
      'Unknown / needs review.',
      'Not part of the active integration layer.',
      'Do not treat as live until classified.',
      'This is separate from the inactive LAND reserve sleeve.',
    ],
    maturityLabel: 'investigate',
    riskLabel: 'NEEDS_REVIEW',
    role: 'Investigatory contract reference.',
    productTruthStatement:
      'AxiomLandReceipt needs review and is not part of the active asset layer.',
    sourceRefs: ['scripts/nft/deploy-nft.ts', 'pages/api/nft/mint-land.ts'],
  },
];

export const AXIOM_ASSETS_HUB_DISCLOSURES: string[] = [
  D.KAG_ISSUED_BY_KMS,
  'Axiom supports KAG as an external commodity asset.',
  D.KAG_AXIOM_DOES_NOT_ISSUE,
  D.AXAG_NOT_ISSUED_THIS_PHASE,
  D.KAG_NO_CUSTODY,
  D.KAG_REDEMPTION_DEPENDS,
  D.AXAG_NOT_LIVE,
  'LAND is deployed inactive and not active reserve backing.',
  D.AXAU_RESERVE_FRAMEWORK,
];

export const AXIOM_ASSET_SYSTEM_MAP = [
  {
    layer: 'Internal issued',
    assets: 'AXUSD, AXAU, AXM, SEED / veAXM',
    description: 'Axiom-issued live core assets and governance/participation layer.',
  },
  {
    layer: 'Reserve framework',
    assets: 'AXAU',
    description: 'AXAU is the reserve framework; gold is the current live reserve module.',
  },
  {
    layer: 'Governance layer',
    assets: 'AXM, SEED / veAXM',
    description: 'Protocol coordination and participation-lock layer.',
  },
  {
    layer: 'External supported layer',
    assets: 'KAG',
    description: 'Read-only external silver support; issuer and redemption remain with KMS Labs / Kinesis.',
  },
  {
    layer: 'Inactive reserve expansion',
    assets: 'LAND, AXAG',
    description: 'LAND is deployed inactive; AXAG is not live and not issued.',
  },
  {
    layer: 'Investigatory assets',
    assets: 'AxiomParticipation, AxiomFounderBadge, AxiomLandReceipt',
    description: 'Needs review; not part of the active integration layer.',
  },
] as const;

export function listAxiomAssets(): AssetHubEntry[] {
  return [
    ...INTERNAL_LIVE_CORE,
    ...EXTERNAL_SUPPORTED_LAYER,
    ...PAUSED_INACTIVE_DRAFT,
    ...INVESTIGATE_LATER,
  ];
}

export function getAxiomAssetsHubSections(): AssetHubSection[] {
  return [
    {
      id: 'INTERNAL_LIVE_CORE',
      title: 'Internal Live Core',
      description: 'Axiom-issued or Axiom-core live assets in the current protocol layer.',
      entries: INTERNAL_LIVE_CORE,
    },
    {
      id: 'EXTERNAL_SUPPORTED_LAYER',
      title: 'External Supported Layer',
      description: 'External assets Axiom supports read-only for visibility and disclosure.',
      entries: EXTERNAL_SUPPORTED_LAYER,
    },
    {
      id: 'PAUSED_INACTIVE_DRAFT',
      title: 'Paused / Inactive / Draft Reserve Expansion',
      description: 'Known assets or reserve sleeves that must not be treated as active.',
      entries: PAUSED_INACTIVE_DRAFT,
    },
    {
      id: 'INVESTIGATE_LATER',
      title: 'Investigate Later',
      description: 'Contract names that need classification before entering the active layer.',
      entries: INVESTIGATE_LATER,
    },
  ];
}

export function listActiveStartingAssets(): AssetHubEntry[] {
  return [...INTERNAL_LIVE_CORE, ...EXTERNAL_SUPPORTED_LAYER];
}

export function getAxiomAssetBySymbol(symbol: string): AssetHubEntry | undefined {
  return listAxiomAssets().find((asset) => asset.symbol.toLowerCase() === symbol.toLowerCase());
}

export const AXIOM_ASSETS_HUB_SOURCE_CONTRACTS = {
  axmToken: CORE_CONTRACTS.AXM_TOKEN,
  seedOrVeAxm: CORE_CONTRACTS.SEED,
} as const;
