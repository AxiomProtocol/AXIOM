/**
 * Axiom Protocol — Integration Readiness Model
 *
 * Typed source-file and artifact checklists per expansion chain.
 * Used by status APIs and admin tooling to surface exactly what
 * is still needed before each chain integration can proceed.
 *
 * Update these records as artifacts are gathered.
 * Set `gathered = true` and populate `location` when a file is received.
 */

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
  /** Official URL or source where this artifact can be obtained */
  sourceUrl: string | null;
  /** Where the file lives in the repo once gathered */
  repoLocation: string | null;
  /** Why this artifact is required */
  rationale: string;
  /** True if implementation is blocked until this is gathered */
  blocksImplementation: boolean;
  /** True if this requires a human business relationship to obtain */
  requiresPartnerRelationship: boolean;
}

export interface ChainReadiness {
  chainSlug: string;
  displayName: string;
  status: string;
  implementationReady: boolean;
  /** True when all blocking artifacts are gathered */
  canProceed: boolean;
  artifacts: RequiredArtifact[];
  blockingCount: number;
  gatheredCount: number;
  totalCount: number;
  nextActionItems: string[];
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

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INTEGRATION_ARTIFACTS: Record<string, RequiredArtifact[]> = {
  polygon: POLYGON_ARTIFACTS,
  avalanche: AVALANCHE_ARTIFACTS,
  stellar: STELLAR_ARTIFACTS,
  canton: CANTON_ARTIFACTS,
  cosmos: COSMOS_ARTIFACTS,
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class IntegrationReadinessModel {
  /**
   * Returns the readiness report for a specific chain.
   */
  static getChainReadiness(chainSlug: string): ChainReadiness | null {
    const artifacts = INTEGRATION_ARTIFACTS[chainSlug];
    if (!artifacts) return null;

    const displayNames: Record<string, string> = {
      polygon: 'Polygon',
      avalanche: 'Avalanche C-Chain',
      stellar: 'Stellar',
      canton: 'Canton Network',
      cosmos: 'Cosmos / Axiom Hub',
    };

    const blocking = artifacts.filter(a => a.blocksImplementation && a.status === 'missing');
    const gathered = artifacts.filter(a => a.status !== 'missing');

    const canProceed = blocking.length === 0;

    const nextActionItems = blocking.slice(0, 3).map(a => {
      if (a.requiresPartnerRelationship) {
        return `[PARTNERSHIP] Obtain: ${a.name}`;
      }
      if (a.type === 'architecture_decision') {
        return `[DECISION] Make: ${a.name}`;
      }
      return `[COLLECT] Gather: ${a.name}${a.sourceUrl ? ` from ${a.sourceUrl}` : ''}`;
    });

    return {
      chainSlug,
      displayName: displayNames[chainSlug] || chainSlug,
      status: 'researching',
      implementationReady: false,
      canProceed,
      artifacts,
      blockingCount: blocking.length,
      gatheredCount: gathered.length,
      totalCount: artifacts.length,
      nextActionItems,
    };
  }

  /**
   * Returns readiness for all expansion chains.
   */
  static getAllReadiness(): ChainReadiness[] {
    return Object.keys(INTEGRATION_ARTIFACTS)
      .map(slug => this.getChainReadiness(slug))
      .filter((r): r is ChainReadiness => r !== null);
  }

  /**
   * Returns a summary of which artifacts are missing across all chains.
   * Designed for admin tooling and founder ops dashboard.
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
        displayName: r.displayName,
        missingCount: r.totalCount - r.gatheredCount,
        blockingCount: r.blockingCount,
        partnershipRequired,
        topBlocker,
      };
    });
  }
}
