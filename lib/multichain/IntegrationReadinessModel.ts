/**
 * Axiom Protocol — Integration Readiness Model
 *
 * Typed source-file and artifact checklists per expansion chain.
 * Used by status APIs and admin tooling to surface exactly what
 * is still needed before each chain integration can proceed.
 *
 * Update these records as artifacts are gathered.
 * Set `gathered = true` and populate `location` when a file is received.
 *
 * ─── DB Integration ────────────────────────────────────────────────────────────
 * The expansion_rail_integrations table provides DB-backed overrides for:
 *   - docsAttached
 *   - sdkReviewed
 *   - sourceFilesAttached
 *
 * When a DB row exists for a chain, those values override the hardcoded
 * 'missing' defaults. Use getAllReadinessWithDbOverride() for the live view.
 * Use getAllReadiness() for the static view (no DB call required).
 *
 * To update a chain's readiness state without a code commit, use:
 *   PATCH /api/infrastructure/readiness/:chainSlug  (admin-key required)
 *   or update the expansion_rail_integrations table directly.
 */

import { db } from '../../server/db';
import { expansionRailIntegrations } from '../../shared/expansionSchema';
import { eq } from 'drizzle-orm';

export type ArtifactStatus = 'missing' | 'gathered' | 'reviewed' | 'integrated';
export type ArtifactType =
  | 'sdk_package'
  | 'api_reference'
  | 'sdk_source'
  | 'protocol_spec'
  | 'partner_agreement'
  | 'partner_docs'
  | 'compliance_spec'
  | 'webhook_spec'
  | 'testnet_credentials'
  | 'mainnet_credentials'
  | 'architecture_decision';

export interface RequiredArtifact {
  id: string;
  chainSlug: string;
  name: string;
  type: ArtifactType;
  status: ArtifactStatus;
  sourceUrl: string | null;
  repoLocation: string | null;
  rationale: string;
  blocksImplementation: boolean;
  requiresPartnerRelationship: boolean;
}

export interface ChainReadiness {
  chainSlug: string;
  displayName: string;
  status: string;
  implementationReady: boolean;
  canProceed: boolean;
  artifacts: RequiredArtifact[];
  blockingCount: number;
  gatheredCount: number;
  totalCount: number;
  nextActionItems: string[];
  dbOverrideActive?: boolean;
}

// ─── Polygon Artifacts ───────────────────────────────────────────────────────

const POLYGON_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'polygon-id-sdk',
    chainSlug: 'polygon',
    name: '@polygon-id/js-sdk',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://www.npmjs.com/package/@polygon-id/js-sdk',
    repoLocation: null,
    rationale: 'Core SDK for issuing, holding, and verifying Polygon ID credentials',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'polygon-id-docs',
    chainSlug: 'polygon',
    name: 'Polygon ID Documentation',
    type: 'api_reference',
    status: 'missing',
    sourceUrl: 'https://docs.id.polygon.technology/',
    repoLocation: 'docs/integrations/polygon/',
    rationale: 'Issuer node architecture, credential schema, ZK proof types',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'polygon-architecture-decision',
    chainSlug: 'polygon',
    name: 'Bridge Design Decision (Polygon ID vs ONCHAINID mirror)',
    type: 'architecture_decision',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'docs/integrations/polygon/open-questions.md',
    rationale: 'Cannot build until bridge design (ZK / mirror / allowlist) is decided',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'iden3-circuits',
    chainSlug: 'polygon',
    name: 'iden3 ZK Circuits',
    type: 'sdk_source',
    status: 'missing',
    sourceUrl: 'https://github.com/iden3/circuits',
    repoLocation: null,
    rationale: 'ZK proof generation for Polygon ID verifiable credentials',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
];

// ─── Avalanche Artifacts ─────────────────────────────────────────────────────

const AVALANCHE_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'avalanche-architecture-decision',
    chainSlug: 'avalanche',
    name: 'Architecture Decision (C-Chain vs Custom Subnet)',
    type: 'architecture_decision',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'docs/integrations/avalanche/open-questions.md',
    rationale: 'All Avalanche integration work depends on this decision',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'avalanchejs-sdk',
    chainSlug: 'avalanche',
    name: '@avalabs/avalanchejs',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://www.npmjs.com/package/@avalabs/avalanchejs',
    repoLocation: null,
    rationale: 'P-Chain operations and subnet management',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'subnet-evm-source',
    chainSlug: 'avalanche',
    name: 'Subnet-EVM Source',
    type: 'sdk_source',
    status: 'missing',
    sourceUrl: 'https://github.com/ava-labs/subnet-evm',
    repoLocation: null,
    rationale: 'Required if custom subnet architecture is chosen',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'avalanche-subnet-docs',
    chainSlug: 'avalanche',
    name: 'Avalanche Subnet Documentation',
    type: 'api_reference',
    status: 'missing',
    sourceUrl: 'https://docs.avax.network/subnets',
    repoLocation: 'docs/integrations/avalanche/',
    rationale: 'Subnet creation, validator whitelisting, precompile configuration',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
];

// ─── Stellar Artifacts ───────────────────────────────────────────────────────

const STELLAR_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'stellar-sdk',
    chainSlug: 'stellar',
    name: '@stellar/stellar-sdk',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://www.npmjs.com/package/@stellar/stellar-sdk',
    repoLocation: null,
    rationale: 'Primary SDK for all Stellar network operations (transactions, payments, SSE)',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'stellar-anchor-partner',
    chainSlug: 'stellar',
    name: 'Anchor Partner Selection + Agreement',
    type: 'partner_agreement',
    status: 'missing',
    sourceUrl: null,
    repoLocation: null,
    rationale: 'No fiat corridors exist on Stellar without an anchor partner. This is the single most important blocker.',
    blocksImplementation: true,
    requiresPartnerRelationship: true,
  },
  {
    id: 'sep-0024-spec',
    chainSlug: 'stellar',
    name: 'SEP-0024 Interactive Anchor Specification',
    type: 'protocol_spec',
    status: 'missing',
    sourceUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md',
    repoLocation: 'docs/integrations/stellar/',
    rationale: 'Primary anchor protocol for interactive fiat deposit/withdrawal',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'sep-0031-spec',
    chainSlug: 'stellar',
    name: 'SEP-0031 Cross-Border Payments Specification',
    type: 'protocol_spec',
    status: 'missing',
    sourceUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md',
    repoLocation: 'docs/integrations/stellar/',
    rationale: 'Protocol for direct cross-border payment flows without interactive UI',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'stellar-corridor-definition',
    chainSlug: 'stellar',
    name: 'Payment Corridor Definition (which countries/currencies)',
    type: 'architecture_decision',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'docs/integrations/stellar/open-questions.md',
    rationale: 'Anchor partner selection depends on corridor requirements',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
];

// ─── Canton Artifacts ────────────────────────────────────────────────────────

const CANTON_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'canton-participant-agreement',
    chainSlug: 'canton',
    name: 'Canton Participant Agreement (Digital Asset)',
    type: 'partner_agreement',
    status: 'missing',
    sourceUrl: 'https://canton.network/',
    repoLocation: null,
    rationale: 'Cannot connect to Canton Network without signing participant agreement with Digital Asset',
    blocksImplementation: true,
    requiresPartnerRelationship: true,
  },
  {
    id: 'daml-sdk',
    chainSlug: 'canton',
    name: 'DAML SDK',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://docs.daml.com/getting-started/installation.html',
    repoLocation: null,
    rationale: 'All Canton contracts are DAML. No DAML SDK = no Canton contracts.',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'canton-json-api-docs',
    chainSlug: 'canton',
    name: 'Canton JSON API Reference',
    type: 'api_reference',
    status: 'missing',
    sourceUrl: 'https://docs.daml.com/json-api/index.html',
    repoLocation: 'docs/integrations/canton/',
    rationale: 'Primary programmatic interface for Axiom backend to Canton participant node',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'daml-expertise',
    chainSlug: 'canton',
    name: 'DAML Development Expertise (internal or contracted)',
    type: 'partner_docs',
    status: 'missing',
    sourceUrl: null,
    repoLocation: null,
    rationale: 'No DAML files in current codebase. DAML is a specialized language requiring dedicated expertise.',
    blocksImplementation: true,
    requiresPartnerRelationship: true,
  },
];

// ─── Cosmos Artifacts ────────────────────────────────────────────────────────

const COSMOS_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'cosmos-architecture-decision',
    chainSlug: 'cosmos',
    name: 'Architecture Decision (Appchain vs IBC Hub Integration)',
    type: 'architecture_decision',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'docs/integrations/cosmos/open-questions.md',
    rationale: 'All Cosmos implementation work depends on this single decision',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'cosmos-sdk-review',
    chainSlug: 'cosmos',
    name: 'Cosmos SDK Documentation Review',
    type: 'api_reference',
    status: 'missing',
    sourceUrl: 'https://docs.cosmos.network/',
    repoLocation: 'docs/integrations/cosmos/',
    rationale: 'Understanding of module system, IBC, and chain structure',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'cosmjs-sdk',
    chainSlug: 'cosmos',
    name: '@cosmjs/stargate',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://www.npmjs.com/package/@cosmjs/stargate',
    repoLocation: null,
    rationale: 'TypeScript client for querying/transacting on Cosmos chains from Axiom Node.js backend',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'cosmos-go-expertise',
    chainSlug: 'cosmos',
    name: 'Go Development Expertise (for Cosmos SDK / appchain)',
    type: 'partner_docs',
    status: 'missing',
    sourceUrl: null,
    repoLocation: null,
    rationale: 'Cosmos SDK is Go. No Go in current codebase. Required if appchain path is chosen.',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
];

// ─── Sui Artifacts ────────────────────────────────────────────────────────────

const SUI_ARTIFACTS: RequiredArtifact[] = [
  {
    id: 'sui-distribution-architecture-decision',
    chainSlug: 'sui',
    name: 'Distribution Architecture Decision (airdrop / claim / bridge model)',
    type: 'architecture_decision',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'documents/chains/AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md',
    rationale:
      'Cannot build distribution contracts until the distribution model is decided: ' +
      'direct airdrop to Sui wallets, claim contract, or a Wormhole/LayerZero bridge from Arbitrum.',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'mysten-sui-sdk',
    chainSlug: 'sui',
    name: '@mysten/sui (TypeScript SDK)',
    type: 'sdk_package',
    status: 'missing',
    sourceUrl: 'https://www.npmjs.com/package/@mysten/sui',
    repoLocation: null,
    rationale:
      'Primary TypeScript SDK for all Sui network operations (transactions, coin operations, ' +
      'object queries). Not installed in the Axiom project as of Phase 4.',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'sui-move-language',
    chainSlug: 'sui',
    name: 'Move Language / Sui Move CLI Development Capability',
    type: 'partner_docs',
    status: 'missing',
    sourceUrl: 'https://docs.sui.io/guides/developer/first-app',
    repoLocation: null,
    rationale:
      'Sui contracts are written in Move (not Solidity). No Move files exist in the ' +
      'Axiom codebase. Move expertise required for any Sui package deployment.',
    blocksImplementation: true,
    requiresPartnerRelationship: false,
  },
  {
    id: 'sui-fullnode-docs',
    chainSlug: 'sui',
    name: 'Sui Developer Documentation (Mysten Labs)',
    type: 'api_reference',
    status: 'missing',
    sourceUrl: 'https://docs.sui.io/',
    repoLocation: 'documents/chains/AXIOM_SUI_PHASE4_BLUEPRINT.md',
    rationale:
      'Object model, Coin<T> standard, Move package publish flow, ' +
      'full-node RPC JSON API reference required for integration design.',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
  {
    id: 'sui-bridge-partner',
    chainSlug: 'sui',
    name: 'Bridge Partner Selection (Wormhole / LayerZero / Native Sui Bridge)',
    type: 'partner_agreement',
    status: 'missing',
    sourceUrl: null,
    repoLocation: 'documents/chains/AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md',
    rationale:
      'If a bridge-based distribution model is chosen (AXM on Sui bridged from Arbitrum), ' +
      'a bridge partner must be selected and integrated. Only required for bridge model — ' +
      'not required if native Sui distribution (no bridge) is chosen.',
    blocksImplementation: false,
    requiresPartnerRelationship: true,
  },
  {
    id: 'sui-testnet-credentials',
    chainSlug: 'sui',
    name: 'Sui Testnet Wallet + Faucet Access',
    type: 'testnet_credentials',
    status: 'missing',
    sourceUrl: 'https://faucet.devnet.sui.io/',
    repoLocation: null,
    rationale:
      'Sui Testnet (or Devnet) wallet required for Move package deployment testing ' +
      'before any Sui Mainnet operations. Faucet provides test SUI for gas.',
    blocksImplementation: false,
    requiresPartnerRelationship: false,
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTEGRATION_ARTIFACTS: Record<string, RequiredArtifact[]> = {
  polygon: POLYGON_ARTIFACTS,
  avalanche: AVALANCHE_ARTIFACTS,
  stellar: STELLAR_ARTIFACTS,
  canton: CANTON_ARTIFACTS,
  cosmos: COSMOS_ARTIFACTS,
  sui: SUI_ARTIFACTS,
};

// ─── DB state type ─────────────────────────────────────────────────────────────

interface DbRailState {
  docsAttached: boolean;
  sdkReviewed: boolean;
  sourceFilesAttached: boolean;
  notes: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class IntegrationReadinessModel {
  /**
   * Returns the static readiness report for a specific chain.
   * Does not read from DB — uses hardcoded artifact statuses only.
   */
  static getChainReadiness(chainSlug: string): ChainReadiness | null {
    const artifacts = INTEGRATION_ARTIFACTS[chainSlug];
    if (!artifacts) return null;
    return this._buildReadiness(chainSlug, artifacts, false);
  }

  /**
   * Returns readiness for all expansion chains (static only — no DB calls).
   */
  static getAllReadiness(): ChainReadiness[] {
    return Object.keys(INTEGRATION_ARTIFACTS)
      .map(slug => this.getChainReadiness(slug))
      .filter((r): r is ChainReadiness => r !== null);
  }

  /**
   * Returns readiness for all chains, with DB state applied as overrides.
   * When expansion_rail_integrations has a row for a chain, its docsAttached,
   * sdkReviewed, and sourceFilesAttached values override the hardcoded defaults.
   *
   * Use this in the readiness API for the live view.
   * Falls back to static values if DB is unavailable.
   */
  static async getAllReadinessWithDbOverride(): Promise<ChainReadiness[]> {
    let dbRows: Record<string, DbRailState> = {};

    try {
      const rows = await db.select().from(expansionRailIntegrations);
      for (const row of rows) {
        dbRows[row.chainSlug] = {
          docsAttached: row.docsAttached,
          sdkReviewed: row.sdkReviewed,
          sourceFilesAttached: row.sourceFilesAttached,
          notes: row.notes ?? null,
        };
      }
    } catch {
      // DB unavailable — return static values
    }

    return Object.keys(INTEGRATION_ARTIFACTS).map(chainSlug => {
      const artifacts = INTEGRATION_ARTIFACTS[chainSlug];
      const dbState = dbRows[chainSlug];

      if (!dbState) {
        return this._buildReadiness(chainSlug, artifacts, false);
      }

      const updatedArtifacts = artifacts.map(artifact => {
        let overrideStatus: ArtifactStatus = artifact.status;

        if (artifact.type === 'api_reference' && dbState.docsAttached) {
          overrideStatus = 'gathered';
        }
        if (artifact.type === 'sdk_package' && dbState.sdkReviewed) {
          overrideStatus = 'reviewed';
        }
        if (artifact.type === 'sdk_source' && dbState.sourceFilesAttached) {
          overrideStatus = 'gathered';
        }

        return { ...artifact, status: overrideStatus };
      });

      return this._buildReadiness(chainSlug, updatedArtifacts, true);
    });
  }

  /**
   * Returns a summary of which artifacts are missing across all chains.
   * Static only — no DB calls.
   */
  static getMissingArtifactSummary(): {
    chainSlug: string;
    displayName: string;
    missingCount: number;
    blockingCount: number;
    partnershipRequired: boolean;
    topBlocker: string | null;
  }[] {
    return this.getAllReadiness().map(r => {
      const blocking = r.artifacts.filter(a => a.blocksImplementation && a.status === 'missing');
      const partnershipRequired = blocking.some(a => a.requiresPartnerRelationship);
      const topBlocker = blocking[0]?.name ?? null;

      return {
        chainSlug: r.chainSlug,
        displayName: this._getDisplayName(r.chainSlug),
        missingCount: r.totalCount - r.gatheredCount,
        blockingCount: r.blockingCount,
        partnershipRequired,
        topBlocker,
      };
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private static _buildReadiness(
    chainSlug: string,
    artifacts: RequiredArtifact[],
    dbOverrideActive: boolean
  ): ChainReadiness {
    const blocking = artifacts.filter(a => a.blocksImplementation && a.status === 'missing');
    const gathered = artifacts.filter(a => a.status !== 'missing');
    const canProceed = blocking.length === 0;

    const nextActionItems = blocking.slice(0, 3).map(a => {
      if (a.requiresPartnerRelationship) return `[PARTNERSHIP] Obtain: ${a.name}`;
      if (a.type === 'architecture_decision') return `[DECISION] Make: ${a.name}`;
      return `[COLLECT] Gather: ${a.name}${a.sourceUrl ? ` from ${a.sourceUrl}` : ''}`;
    });

    return {
      chainSlug,
      displayName: this._getDisplayName(chainSlug),
      status: 'researching',
      implementationReady: false,
      canProceed,
      artifacts,
      blockingCount: blocking.length,
      gatheredCount: gathered.length,
      totalCount: artifacts.length,
      nextActionItems,
      dbOverrideActive,
    };
  }

  private static _getDisplayName(chainSlug: string): string {
    const names: Record<string, string> = {
      polygon: 'Polygon',
      avalanche: 'Avalanche C-Chain',
      stellar: 'Stellar',
      canton: 'Canton Network',
      cosmos: 'Cosmos / Axiom Hub',
      sui: 'Sui',
    };
    return names[chainSlug] ?? chainSlug;
  }
}
