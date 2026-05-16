import { ACTIVE_AXUSD, ACTIVE_CONTRACTS } from '../../src/config/activeContracts.generated';
import { CANONICAL_TOKENS } from '../tokens';
import { getInternalAsset } from '../assets/internalRegistry';
import type {
  LiquidityAsset,
  LiquidityAssetSymbol,
  LiquidityChain,
  LiquidityPoolDefinition,
  LiquidityVenue,
  LiquidityVenueId,
} from './types';

export const ARBITRUM_ONE_LIQUIDITY_CHAIN: LiquidityChain = {
  id: 42161,
  name: 'Arbitrum One',
  explorerUrl: 'https://arbiscan.io',
};

const axauInternalAsset = getInternalAsset('AXAU');

function requireAddress(value: string | null | undefined, label: string): string {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Missing canonical liquidity address for ${label}`);
  }
  return value;
}

export const LIQUIDITY_ASSETS: Record<LiquidityAssetSymbol, LiquidityAsset> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: CANONICAL_TOKENS.USDC.address,
    decimals: CANONICAL_TOKENS.USDC.decimals,
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    role: 'external_stable_quote',
    isStable: true,
    isGovernance: false,
    isReserveLinked: false,
    publicAmmTradingPermitted: true,
    restrictedTransferLogicExists: false,
    wrapperRequired: false,
    launchPriority: 0,
    preferredQuoteAsset: null,
    approvedVenues: ['uniswap-v3', 'curve'],
    blockedVenues: [],
    notes: 'External stable quote asset for AXUSD parity and external routing.',
    rationale: 'AXUSD should be quoted externally against USDC before any secondary quote path is considered.',
  },
  AXUSD: {
    symbol: 'AXUSD',
    name: 'Axiom USD',
    address: ACTIVE_AXUSD,
    decimals: CANONICAL_TOKENS.AXUSD.decimals,
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    role: 'stable_settlement_spine',
    isStable: true,
    isGovernance: false,
    isReserveLinked: false,
    publicAmmTradingPermitted: true,
    restrictedTransferLogicExists: true,
    wrapperRequired: false,
    launchPriority: 1,
    preferredQuoteAsset: 'USDC',
    approvedVenues: ['uniswap-v3', 'curve'],
    blockedVenues: ['balancer'],
    notes: 'Internal settlement spine. Defend parity more aggressively than AXM or AXAU.',
    rationale: 'AXUSD market quality matters most; launch with the deepest AXUSD/USDC venue before broader routing.',
  },
  AXM: {
    symbol: 'AXM',
    name: 'Axiom Governance Token',
    address: ACTIVE_CONTRACTS.axmToken,
    decimals: CANONICAL_TOKENS.AXM.decimals,
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    role: 'governance_coordination',
    isStable: false,
    isGovernance: true,
    isReserveLinked: false,
    publicAmmTradingPermitted: true,
    restrictedTransferLogicExists: false,
    wrapperRequired: false,
    launchPriority: 2,
    preferredQuoteAsset: 'AXUSD',
    approvedVenues: ['uniswap-v3'],
    blockedVenues: ['curve', 'camelot'],
    notes: 'Governance and coordination asset. Price discovery should be controlled and not fragmented.',
    rationale: 'AXM should quote against AXUSD first to reinforce ecosystem settlement gravity and avoid AXM/USDC fragmentation.',
  },
  AXAU: {
    symbol: 'AXAU',
    name: 'Axiom Gold Reserve',
    address: requireAddress(axauInternalAsset?.contractAddress, 'AXAU'),
    decimals: 18,
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    role: 'reserve_linked',
    isStable: false,
    isGovernance: false,
    isReserveLinked: true,
    publicAmmTradingPermitted: false,
    restrictedTransferLogicExists: true,
    wrapperRequired: true,
    launchPriority: 99,
    preferredQuoteAsset: 'AXUSD',
    approvedVenues: [],
    blockedVenues: ['uniswap-v3', 'curve', 'balancer', 'camelot'],
    notes: 'ERC-3643 reserve-linked token with identity-gated transfers. Public AMM listing is blocked until compatibility is proven.',
    rationale: 'AXAU transfer, compliance, and pool/router behavior must be affirmatively validated before any public venue is allowed.',
  },
};

export const LIQUIDITY_VENUES: Record<LiquidityVenueId, LiquidityVenue> = {
  'uniswap-v3': {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    status: 'approved_primary',
    firstWavePermitted: true,
    approvedForAssets: ['AXUSD', 'AXM', 'USDC'],
    blockedForAssets: ['AXAU'],
    notes: 'Primary launch venue for AXUSD/USDC and AXM/AXUSD. AXAU remains blocked until gates pass.',
  },
  curve: {
    id: 'curve',
    name: 'Curve',
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    status: 'approved_secondary',
    firstWavePermitted: false,
    approvedForAssets: ['AXUSD', 'USDC'],
    blockedForAssets: ['AXM', 'AXAU'],
    notes: 'Secondary stable-liquidity venue for AXUSD/USDC after real AXUSD flow exists.',
  },
  balancer: {
    id: 'balancer',
    name: 'Balancer',
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    status: 'evaluation_only',
    firstWavePermitted: false,
    approvedForAssets: [],
    blockedForAssets: ['AXUSD', 'AXAU'],
    notes: 'AXM weighted pool may be evaluated only after AXM has real price discovery.',
  },
  camelot: {
    id: 'camelot',
    name: 'Camelot',
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    status: 'deferred',
    firstWavePermitted: false,
    approvedForAssets: [],
    blockedForAssets: ['AXAU'],
    notes: 'Selective later Arbitrum-native expansion only if it improves distribution without fragmenting liquidity.',
  },
  'axiom-reserve-access': {
    id: 'axiom-reserve-access',
    name: 'Axiom Reserve Access',
    chain: ARBITRUM_ONE_LIQUIDITY_CHAIN,
    status: 'approved_primary',
    firstWavePermitted: true,
    approvedForAssets: ['AXUSD', 'AXM', 'USDC'],
    blockedForAssets: ['AXAU'],
    notes: 'Axiom-native on-chain financial rails replacing the withdrawn Euler EVK/EulerSwap layer (withdrawn 2026-05-13). Protocol-controlled liquidity access.',
  },
};

export const LIQUIDITY_POOLS: LiquidityPoolDefinition[] = [
  {
    id: 'axusd-usdc-uniswap-v3',
    baseAsset: 'AXUSD',
    quoteAsset: 'USDC',
    venue: 'uniswap-v3',
    fee: {
      kind: 'uniswap_v3_fee_tier',
      valueBps: 5,
      status: 'recommended',
      notes: 'Recommended stable-pair tier; final tick spacing and initialization price require deployment approval.',
    },
    launchPhase: 'phase_1',
    status: 'planned',
    active: false,
    treasuryPriority: 'highest',
    targetDepthPriority: 'deepest_launch_pool',
    paritySensitivity: 'critical',
    complianceRiskLevel: 'medium',
    deploymentAddress: null,
    activationFlag: 'LIQUIDITY_POOL_AXUSD_USDC_UNISWAP_ENABLED',
    readinessChecks: [
      'Canonical AXUSD address confirmed against src/config/activeContracts.generated.ts',
      'USDC address confirmed on Arbitrum One',
      'Treasury allocation approved for deepest launch pool',
      'Initial price set at 1 AXUSD = 1 USDC',
      'Parity monitoring and rollback runbook ready',
    ],
    riskFlags: ['AXUSD parity defense', 'stable-pair slippage', 'treasury exposure'],
    complianceFlags: ['AXUSD ERC-3643 transfer compatibility must be verified for pool and router contracts'],
    analyticsHooks: ['depth', 'slippage', 'price_deviation', 'volume', 'venue_health', 'parity_sensitivity', 'treasury_exposure'],
    adminControls: ['activation flag', 'treasury allocation approval', 'parity alert review'],
    internalNotes: 'Primary launch pool and deepest pool at launch.',
  },
  {
    id: 'axm-axusd-uniswap-v3',
    baseAsset: 'AXM',
    quoteAsset: 'AXUSD',
    venue: 'uniswap-v3',
    fee: {
      kind: 'uniswap_v3_fee_tier',
      valueBps: 30,
      status: 'recommended',
      notes: 'Recommended controlled price-discovery tier; final range and depth require treasury approval.',
    },
    launchPhase: 'phase_1',
    status: 'planned',
    active: false,
    treasuryPriority: 'high',
    targetDepthPriority: 'controlled_smaller_pool',
    paritySensitivity: 'low',
    complianceRiskLevel: 'medium',
    deploymentAddress: null,
    activationFlag: 'LIQUIDITY_POOL_AXM_AXUSD_UNISWAP_ENABLED',
    readinessChecks: [
      'AXM and canonical AXUSD addresses confirmed',
      'Pool size capped below AXUSD/USDC launch depth',
      'No AXM/USDC pool enabled',
      'Treasury quote asset allocation sourced from AXUSD policy bucket',
    ],
    riskFlags: ['AXM price discovery', 'treasury liquidity fragmentation'],
    complianceFlags: ['AXUSD ERC-3643 transfer compatibility must be verified for pool and router contracts'],
    analyticsHooks: ['depth', 'slippage', 'volume', 'venue_health', 'treasury_exposure'],
    adminControls: ['activation flag', 'allocation cap', 'launch sequencing review'],
    internalNotes: 'Smaller controlled pool for public AXM access while preserving AXUSD as quote asset.',
  },
  {
    id: 'axusd-usdc-curve',
    baseAsset: 'AXUSD',
    quoteAsset: 'USDC',
    venue: 'curve',
    fee: {
      kind: 'curve_stableswap',
      valueBps: null,
      status: 'pending_venue_design',
      notes: 'Curve parameters remain pending until AXUSD has measurable flow on the primary pool.',
    },
    launchPhase: 'phase_2',
    status: 'planned',
    active: false,
    treasuryPriority: 'medium',
    targetDepthPriority: 'deferred_depth',
    paritySensitivity: 'critical',
    complianceRiskLevel: 'medium',
    deploymentAddress: null,
    activationFlag: 'LIQUIDITY_POOL_AXUSD_USDC_CURVE_ENABLED',
    readinessChecks: [
      'AXUSD/USDC Uniswap pool live and functioning',
      'Sustained AXUSD flow observed',
      'Curve pool parameters approved',
      'No evidence that Curve liquidity would fragment primary parity defense',
    ],
    riskFlags: ['secondary stable-liquidity venue', 'fragmentation risk'],
    complianceFlags: ['AXUSD transfer compatibility must be verified for Curve pool contracts'],
    analyticsHooks: ['depth', 'slippage', 'price_deviation', 'volume', 'venue_health', 'parity_sensitivity'],
    adminControls: ['secondary venue readiness check', 'treasury allocation approval'],
    internalNotes: 'Delayed stable-liquidity depth venue. Do not launch before AXUSD has real flow.',
  },
  {
    id: 'axm-axusd-balancer-weighted',
    baseAsset: 'AXM',
    quoteAsset: 'AXUSD',
    venue: 'balancer',
    fee: {
      kind: 'balancer_weighted',
      valueBps: null,
      status: 'pending_venue_design',
      notes: 'Weights, fee, and pool type are intentionally unset until AXM price discovery matures.',
    },
    launchPhase: 'phase_3',
    status: 'evaluation',
    active: false,
    treasuryPriority: 'low',
    targetDepthPriority: 'none',
    paritySensitivity: 'not_applicable',
    complianceRiskLevel: 'medium',
    deploymentAddress: null,
    activationFlag: 'LIQUIDITY_POOL_AXM_AXUSD_BALANCER_REVIEW_ENABLED',
    readinessChecks: [
      'AXM has real Uniswap price discovery',
      'Weighted pool improves liquidity quality without diluting core pair',
      'Treasury approves explicit weights and allocation cap',
    ],
    riskFlags: ['AXM liquidity fragmentation', 'governance-token volatility'],
    complianceFlags: ['AXUSD transfer compatibility must be verified for Balancer vault and pool contracts'],
    analyticsHooks: ['depth', 'slippage', 'volume', 'venue_health', 'treasury_exposure'],
    adminControls: ['governance review', 'explicit phase 3 approval'],
    internalNotes: 'Evaluation placeholder only. Not approved for deployment.',
  },
  {
    id: 'axau-axusd-uniswap-v3',
    baseAsset: 'AXAU',
    quoteAsset: 'AXUSD',
    venue: 'uniswap-v3',
    fee: {
      kind: 'uniswap_v3_fee_tier',
      valueBps: null,
      status: 'pending_venue_design',
      notes: 'No fee tier should be selected until AXAU compatibility gates pass.',
    },
    launchPhase: 'conditional_axau',
    status: 'blocked',
    active: false,
    treasuryPriority: 'none',
    targetDepthPriority: 'none',
    paritySensitivity: 'not_applicable',
    complianceRiskLevel: 'blocked',
    deploymentAddress: null,
    activationFlag: 'LIQUIDITY_POOL_AXAU_AXUSD_UNISWAP_ENABLED',
    readinessChecks: [
      'Unrestricted ERC-20 behavior confirmed',
      'Transfers through user wallets confirmed',
      'Transfers through pool contracts confirmed',
      'Transfers through router contracts confirmed',
      'Compliance logic does not break swaps',
      'Holder restrictions do not break public market flows',
      'Wrapper requirement resolved',
      'Governance approval recorded',
    ],
    riskFlags: ['AXAU restricted transfers', 'reserve-linked asset', 'public market compatibility unknown'],
    complianceFlags: ['ERC-3643 identity gating', 'pool/router identity compatibility', 'wrapper review required'],
    analyticsHooks: ['pool_readiness'],
    adminControls: ['AXAU compatibility gate', 'governance signoff', 'wrapper design review'],
    internalNotes: 'Potential first pair only if AXAU is affirmatively approved for public AMM trading. Blocked by default.',
  },
];

export function listLiquidityAssets(): LiquidityAsset[] {
  return Object.values(LIQUIDITY_ASSETS);
}

export function getLiquidityAsset(symbol: LiquidityAssetSymbol): LiquidityAsset {
  return LIQUIDITY_ASSETS[symbol];
}

export function listLiquidityVenues(): LiquidityVenue[] {
  return Object.values(LIQUIDITY_VENUES);
}

export function getLiquidityVenue(id: LiquidityVenueId): LiquidityVenue {
  return LIQUIDITY_VENUES[id];
}

export function listLiquidityPools(): LiquidityPoolDefinition[] {
  return LIQUIDITY_POOLS;
}

export function getLiquidityPool(id: string): LiquidityPoolDefinition | undefined {
  return LIQUIDITY_POOLS.find((pool) => pool.id === id);
}

export function listLiquidityPoolsByPhase(phase: LiquidityPoolDefinition['launchPhase']): LiquidityPoolDefinition[] {
  return LIQUIDITY_POOLS.filter((pool) => pool.launchPhase === phase);
}
