/**
 * Axiom Protocol — Canonical Chain & Rail Registry
 *
 * Single source of truth for all blockchain networks and payment rails
 * in the Axiom multi-chain expansion model.
 *
 * ═══════════════════════════════════════════════════════════════════
 * LAYER ARCHITECTURE — ROLE BOUNDARIES MUST NOT BE BLURRED
 * ═══════════════════════════════════════════════════════════════════
 *
 * ARBITRUM ONE   → Core live execution layer.
 *                  All live automated control layers, AXUSD internal
 *                  settlement, AXAU reserve operations, identity
 *                  (ERC-3643), DEX (Camelot / Euler). Live today.
 *
 * ETHEREUM       → Reserve reference layer.
 *                  PAXG custody reference, L1 finality anchor.
 *                  Not a deployment target for Axiom contracts.
 *
 * POLYGON        → Planned: Identity bridge + credential expansion.
 *                  ERC-3643 credential mirroring to Polygon identity
 *                  infrastructure. Institutional access bridge.
 *                  SOURCE FILES: not yet gathered.
 *
 * AVALANCHE      → Planned: Compliance-aware capital deployment zones.
 *                  Permissioned subnet-style environments for private
 *                  capital allocation and product environments.
 *                  SOURCE FILES: not yet gathered.
 *
 * STELLAR        → Planned: Payments + asset movement rail.
 *                  Remittance corridors, payout, fiat/stablecoin
 *                  movement across jurisdictions.
 *                  SOURCE FILES: not yet gathered.
 *
 * CANTON         → Planned: Institutional-grade bridge.
 *                  Privacy/enterprise finance interoperability.
 *                  Partner docs not yet received.
 *                  SOURCE FILES: not yet gathered.
 *
 * COSMOS / HUB   → Sovereign future: Axiom-native chain planning.
 *                  Interchain control plane, sovereign infrastructure.
 *                  Architecture not yet finalized.
 *                  SOURCE FILES: not yet gathered.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AXIOM'S ROLE: Orchestration and policy layer across all rails.
 * External chains are additive rails — not replacements.
 * Arbitrum remains the core live execution environment.
 * AXUSD remains the internal settlement layer.
 * AXAU remains the reserve layer (PAXG-backed reserve positions).
 * ═══════════════════════════════════════════════════════════════════
 */

export type ChainCategory =
  | 'evm'
  | 'non_evm'
  | 'institutional'
  | 'payments'
  | 'sovereign'
  | 'banking_adjacent';

export type ChainRole =
  | 'core_execution'        // Primary automated control layer environment
  | 'reserve_reference'     // Reserve asset custody / L1 anchor
  | 'identity_bridge'       // Credential expansion / mirroring
  | 'capital_zone'          // Permissioned capital deployment environment
  | 'payments_rail'         // Payment movement and remittance corridor
  | 'institutional_bridge'  // Enterprise / privacy finance bridge
  | 'sovereign_future'      // Axiom-native chain / interchain hub planning
  | 'distribution_layer';   // Wallet-facing token distribution / community / diaspora

export type ChainStatus =
  | 'live'         // Fully integrated, active today
  | 'configured'   // Integration scaffolding built, not yet live
  | 'planned'      // Architecture decision made, build not started
  | 'researching'  // Source files / SDKs / partner docs being gathered
  | 'blocked'      // Cannot proceed — missing partner agreement, docs, or credentials
  | 'disabled';    // Explicitly inactive

export type SourceFileStatus =
  | 'attached'
  | 'partially_attached'
  | 'missing';

export type SdkStatus =
  | 'reviewed'
  | 'not_reviewed'
  | 'not_applicable';

export interface ChainCapabilities {
  settlementSupport: boolean;
  reserveSupport: boolean;
  identitySupport: boolean;
  complianceSupport: boolean;
  custodySupport: boolean;
  /** null = non-EVM chain where automated control layers are not applicable */
  automatedControlLayerSupport: boolean | null;
  paymentRailSupport: boolean;
}

export interface ChainRegistryEntry {
  id: string;
  slug: string;
  displayName: string;
  /** Present for EVM chains only */
  chainIdEvm?: number;
  category: ChainCategory;
  roles: ChainRole[];
  status: ChainStatus;
  capabilities: ChainCapabilities;
  /** Env var name that gates this chain's integration (null = always available) */
  featureFlag: string | null;
  sourceFilesStatus: SourceFileStatus;
  sdkStatus: SdkStatus;
  docsStatus: SourceFileStatus;
  /** True only when SDK reviewed, docs attached, and no blocking dependencies */
  implementationReady: boolean;
  notes: string;
  metadata: Record<string, unknown>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const CHAIN_REGISTRY: ChainRegistryEntry[] = [
  {
    id: 'arbitrum-one',
    slug: 'arbitrum',
    displayName: 'Arbitrum One',
    chainIdEvm: 42161,
    category: 'evm',
    roles: ['core_execution'],
    status: 'live',
    capabilities: {
      settlementSupport: true,
      reserveSupport: true,
      identitySupport: true,
      complianceSupport: true,
      custodySupport: true,
      automatedControlLayerSupport: true,
      paymentRailSupport: false,
    },
    featureFlag: null,
    sourceFilesStatus: 'attached',
    sdkStatus: 'reviewed',
    docsStatus: 'attached',
    implementationReady: true,
    notes:
      'Core live execution environment. All Axiom automated control layers, ' +
      'AXUSD settlement, AXAU reserve operations, ERC-3643 identity, and DEX ' +
      'infrastructure are live on Arbitrum One. This layer is not being replaced ' +
      'by any expansion target.',
    metadata: {
      rpcProvider: 'Alchemy',
      blockExplorer: 'https://arbitrum.blockscout.com',
      alchemyNetwork: 'arb-mainnet',
      deployerAddress: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
      activeContractCount: 53,
    },
  },
  {
    id: 'ethereum-mainnet',
    slug: 'ethereum',
    displayName: 'Ethereum Mainnet',
    chainIdEvm: 1,
    category: 'evm',
    roles: ['reserve_reference'],
    status: 'configured',
    capabilities: {
      settlementSupport: false,
      reserveSupport: true,
      identitySupport: false,
      complianceSupport: false,
      custodySupport: true,
      automatedControlLayerSupport: true,
      paymentRailSupport: false,
    },
    featureFlag: null,
    sourceFilesStatus: 'attached',
    sdkStatus: 'reviewed',
    docsStatus: 'attached',
    implementationReady: true,
    notes:
      'Reserve reference layer. PAXG is an ERC-20 on Ethereum Mainnet; ' +
      'Axiom uses PAXG-backed reserve positions as the AXAU reserve instrument. ' +
      'Not a deployment target for Axiom operational contracts.',
    metadata: {
      relevantAssets: ['PAXG', 'ETH'],
      useCase: 'reserve_reference_pricing',
    },
  },
  {
    id: 'polygon-mainnet',
    slug: 'polygon',
    displayName: 'Polygon PoS',
    chainIdEvm: 137,
    category: 'evm',
    // Phase 3 (2026-05-14): role expanded from identity_bridge only to include
    // payments_settlement and payments_rail — Polygon's strategic designation is
    // Payments / Treasury Routing / Enterprise Settlement. Identity bridging
    // (Polygon ID credentials attested from Arbitrum) remains in scope but is
    // secondary to the payments role.
    roles: ['payments_rail', 'identity_bridge'],
    status: 'configured',
    capabilities: {
      settlementSupport: true,   // Enterprise settlement via native USDC
      reserveSupport: false,     // Reserve is Arbitrum + Ethereum canonical
      identitySupport: true,     // Polygon ID credential delivery (attested, not canonical)
      complianceSupport: true,
      custodySupport: false,     // BitGo custody wallet TBD
      automatedControlLayerSupport: false, // No Axiom contracts deployed on Polygon
      paymentRailSupport: true,  // Primary role — USDC payment and treasury routing
    },
    featureFlag: 'ENABLE_POLYGON_IDENTITY_BRIDGE',
    sourceFilesStatus: 'attached',
    sdkStatus: 'not_reviewed',
    docsStatus: 'attached',
    implementationReady: false,
    notes:
      'Phase 5 (2026-05-15): PRODUCTION AUTHORIZED — all 10 gates cleared and signed. ' +
      'CHAIN_POLYGON_ENABLED=true, POLYGON_ADAPTER_MODE=LIVE. Strategic role: Payments / ' +
      'Treasury Routing / Enterprise Settlement. Settlement token: native USDC on Polygon PoS ' +
      '(0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359). First mainnet transfer BLOCKED — ' +
      'deployer wallet has 0 USDC on Polygon mainnet (chainId 137). Preflight 10/11 pass. ' +
      'Identity bridging (Polygon ID credential delivery attested from Arbitrum ERC-3643) ' +
      'remains in scope but secondary to payments role. Arbitrum remains canonical.',
    metadata: {
      targetIntegration: 'polygon_pos_payments',
      settlementToken: 'USDC_NATIVE_POLYGON',
      settlementTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      bridgeDesign: 'attestation_or_mirrored_credential',
      phase: 'phase5_production_authorized',
      decisionMemo: 'documents/chains/AXIOM_POLYGON_PHASE3_DECISION_MEMO.md',
      firstTransferStatus: 'BLOCKED_NO_USDC_IN_DEPLOYER_WALLET',
      transferLedger: 'documents/chains/AXIOM_POLYGON_MAINNET_TRANSFER_STATUS.md',
    },
  },
  {
    id: 'sui-mainnet',
    slug: 'sui',
    displayName: 'Sui',
    // No EVM chainId — Sui is a Move-based, non-EVM network.
    // Network identification uses genesis hash, not a numeric chain ID.
    category: 'non_evm',
    roles: ['distribution_layer'],
    status: 'planned',
    capabilities: {
      settlementSupport: false,    // Not Sui's role — settlement is Arbitrum/Polygon
      reserveSupport: false,       // Reserve is Arbitrum + Ethereum canonical
      identitySupport: false,      // Identity attestation read-only from Arbitrum ERC-3643
      complianceSupport: false,    // Policy enforcement is Arbitrum/Avalanche
      custodySupport: false,       // BitGo CaaS does not support Sui
      automatedControlLayerSupport: null,  // Non-EVM: Move VM, not EVM-compatible
      paymentRailSupport: false,   // Payments via Polygon / Stellar
    },
    featureFlag: 'ENABLE_SUI_DISTRIBUTION_LAYER',
    sourceFilesStatus: 'missing',
    sdkStatus: 'not_reviewed',
    docsStatus: 'missing',
    implementationReady: false,
    notes:
      'Phase 4 (2026-05-15): Foundation and distribution-layer architecture phase. ' +
      'Sui is NOT live — no mainnet transactions, no token issuance, no bridge. ' +
      'Sui\'s strategic role is wallet-facing distribution / community / diaspora layer. ' +
      'lib/chains/ scaffold complete (config, capabilities, providers, explorers, contracts). ' +
      'shared/contracts-sui.ts added (all null). @mysten/sui SDK NOT installed. ' +
      'No Move packages deployed. CHAIN_SUI_ENABLED=false in all current environments. ' +
      'Arbitrum remains canonical. Polygon remains canonical payments layer. ' +
      'Explorer updated: suiexplorer.com (deprecated) → suiscan.xyz.',
    metadata: {
      targetIntegration: 'sui_move_distribution',
      distributionDesign: 'community_token_distribution',
      sdkPackage: '@mysten/sui',
      sdkUrl: 'https://www.npmjs.com/package/@mysten/sui',
      moveLanguage: true,
      evmCompatible: false,
      phase: 'phase4_foundation',
      decisionMemo: 'documents/chains/AXIOM_SUI_PHASE4_DECISION_MEMO.md',
      dependsOn: '@mysten/sui SDK, Move package development, distribution architecture decision',
    },
  },

  {
    id: 'avalanche-cchain',
    slug: 'avalanche',
    displayName: 'Avalanche C-Chain',
    chainIdEvm: 43114,
    category: 'evm',
    roles: ['capital_zone'],
    status: 'researching',
    capabilities: {
      settlementSupport: false,
      reserveSupport: false,
      identitySupport: false,
      complianceSupport: true,
      custodySupport: false,
      automatedControlLayerSupport: true,
      paymentRailSupport: false,
    },
    featureFlag: 'ENABLE_AVALANCHE_CAPITAL_ENV',
    sourceFilesStatus: 'missing',
    sdkStatus: 'not_reviewed',
    docsStatus: 'missing',
    implementationReady: false,
    notes:
      'Planned compliance-aware capital deployment zone. ' +
      'Avalanche Subnet architecture enables permissioned, private product ' +
      'environments appropriate for institutional capital allocation. ' +
      'Subnet configuration requirements and Avalanche SDK not yet gathered.',
    metadata: {
      targetIntegration: 'avalanche_subnet',
      subnetDesign: 'permissioned_capital_environment',
      dependsOn: 'Avalanche Subnet SDK, validator requirements',
    },
  },
  {
    id: 'stellar-mainnet',
    slug: 'stellar',
    displayName: 'Stellar',
    category: 'payments',
    roles: ['payments_rail'],
    status: 'researching',
    capabilities: {
      settlementSupport: true,
      reserveSupport: false,
      identitySupport: false,
      complianceSupport: false,
      custodySupport: false,
      automatedControlLayerSupport: null,
      paymentRailSupport: true,
    },
    featureFlag: 'ENABLE_STELLAR_PAYMENTS_RAIL',
    sourceFilesStatus: 'missing',
    sdkStatus: 'not_reviewed',
    docsStatus: 'missing',
    implementationReady: false,
    notes:
      'Planned payments and asset movement rail. ' +
      'Stellar is the target for remittance corridors, payout flows, and ' +
      'fiat/stablecoin movement across jurisdictions. Stellar does not replace ' +
      'AXUSD as the internal settlement layer — it serves as an external ' +
      'movement rail. Stellar Horizon API and Stellar SDK not yet reviewed.',
    metadata: {
      targetIntegration: 'stellar_horizon_api',
      corridorDesign: 'remittance_and_payout',
      dependsOn: 'Stellar SDK, Horizon API docs, anchor partner selection',
      doNotConfuseWith: 'XRP — Stellar and XRP are separate networks',
    },
  },
  {
    id: 'canton-network',
    slug: 'canton',
    displayName: 'Canton Network',
    category: 'institutional',
    roles: ['institutional_bridge'],
    status: 'researching',
    capabilities: {
      settlementSupport: false,
      reserveSupport: false,
      identitySupport: false,
      complianceSupport: true,
      custodySupport: false,
      automatedControlLayerSupport: null,
      paymentRailSupport: false,
    },
    featureFlag: 'ENABLE_CANTON_INSTITUTIONAL_BRIDGE',
    sourceFilesStatus: 'missing',
    sdkStatus: 'not_reviewed',
    docsStatus: 'missing',
    implementationReady: false,
    notes:
      'Planned institutional-grade bridge. Canton is a privacy-enabled, ' +
      'enterprise finance interoperability network. Integration focus is ' +
      'institutional product access and private market connectivity. ' +
      'Canton participant documentation and partner contact not yet received.',
    metadata: {
      targetIntegration: 'canton_participant_node',
      bridgeDesign: 'institutional_interoperability',
      dependsOn: 'Canton SDK, participant onboarding docs, partner agreement',
    },
  },
  {
    id: 'cosmos-hub',
    slug: 'cosmos',
    displayName: 'Cosmos / Axiom Hub',
    category: 'sovereign',
    roles: ['sovereign_future'],
    status: 'researching',
    capabilities: {
      settlementSupport: false,
      reserveSupport: false,
      identitySupport: false,
      complianceSupport: false,
      custodySupport: false,
      automatedControlLayerSupport: null,
      paymentRailSupport: false,
    },
    featureFlag: 'ENABLE_COSMOS_SOVEREIGN_PREP',
    sourceFilesStatus: 'missing',
    sdkStatus: 'not_reviewed',
    docsStatus: 'missing',
    implementationReady: false,
    notes:
      'Sovereign future layer. Cosmos is the target architecture for a ' +
      'potential Axiom-native chain or interchain hub. This would serve as ' +
      'the long-term sovereign infrastructure layer and interchain control ' +
      'plane, enabling Axiom to act as its own sovereign digital economy. ' +
      'Architecture decisions and Cosmos SDK requirements not yet finalized.',
    metadata: {
      targetIntegration: 'cosmos_sdk_chain',
      chainDesign: 'axiom_native_or_hub',
      dependsOn: 'Cosmos SDK, validator economics, IBC module configuration',
      timeHorizon: 'long_term',
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getChainBySlug(slug: string): ChainRegistryEntry | undefined {
  return CHAIN_REGISTRY.find(c => c.slug === slug);
}

export function getChainsByStatus(status: ChainStatus): ChainRegistryEntry[] {
  return CHAIN_REGISTRY.filter(c => c.status === status);
}

export function getChainsByRole(role: ChainRole): ChainRegistryEntry[] {
  return CHAIN_REGISTRY.filter(c => c.roles.includes(role));
}

export function getLiveChains(): ChainRegistryEntry[] {
  return getChainsByStatus('live');
}

export function getPlannedChains(): ChainRegistryEntry[] {
  return CHAIN_REGISTRY.filter(c => c.status === 'planned' || c.status === 'researching');
}

export function getExpansionTargets(): ChainRegistryEntry[] {
  return CHAIN_REGISTRY.filter(
    c => c.slug !== 'arbitrum' && c.slug !== 'ethereum'
  );
}
