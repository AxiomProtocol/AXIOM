/**
 * Axiom Protocol — Multi-Chain Registry Service
 *
 * Combines the static chain registry (lib/multichain/chainRegistry.ts)
 * with dynamic DB state (shared/expansionSchema.ts) to produce a unified
 * view of the Axiom multi-chain expansion model.
 *
 * This service is the primary backend surface for:
 *   - /api/infrastructure/chains
 *   - /api/infrastructure/expansion-summary
 *   - System map and infrastructure page data
 *   - Admin tooling
 */

import {
  CHAIN_REGISTRY,
  getChainBySlug,
  getLiveChains,
  getPlannedChains,
  getExpansionTargets,
  type ChainRegistryEntry,
  type ChainStatus,
  type ChainRole,
} from './chainRegistry';
import { isExpansionEnabled, getAllExpansionFlags } from './featureFlags';

export interface ChainSummary {
  id: string;
  slug: string;
  displayName: string;
  chainIdEvm?: number;
  category: string;
  roles: string[];
  status: ChainStatus;
  featureEnabled: boolean;
  capabilities: ChainRegistryEntry['capabilities'];
  implementationReady: boolean;
  sourceFilesStatus: string;
  sdkStatus: string;
  docsStatus: string;
  notes: string;
}

export interface ExpansionSummary {
  asOf: string;
  totalChains: number;
  liveChains: number;
  configuredChains: number;
  plannedChains: number;
  researchingChains: number;
  coreExecutionLayer: ChainSummary;
  expansionTargets: ChainSummary[];
  featureFlags: Record<string, boolean>;
  layerMap: {
    coreExecution: string[];
    identityBridges: string[];
    capitalZones: string[];
    paymentsRails: string[];
    institutionalBridges: string[];
    sovereignFuture: string[];
  };
  axiomRoleStatement: string;
}

function toChainSummary(entry: ChainRegistryEntry): ChainSummary {
  const featureEnabled =
    entry.featureFlag === null
      ? true
      : isExpansionEnabled(entry.featureFlag as Parameters<typeof isExpansionEnabled>[0]);

  return {
    id: entry.id,
    slug: entry.slug,
    displayName: entry.displayName,
    chainIdEvm: entry.chainIdEvm,
    category: entry.category,
    roles: entry.roles,
    status: entry.status,
    featureEnabled,
    capabilities: entry.capabilities,
    implementationReady: entry.implementationReady,
    sourceFilesStatus: entry.sourceFilesStatus,
    sdkStatus: entry.sdkStatus,
    docsStatus: entry.docsStatus,
    notes: entry.notes,
  };
}

export class MultiChainRegistryService {
  /**
   * Returns all chains in the registry with their current status.
   * Always accurate — never presents planned chains as live.
   */
  static getAllChains(): ChainSummary[] {
    return CHAIN_REGISTRY.map(toChainSummary);
  }

  /**
   * Returns a single chain by slug.
   */
  static getChain(slug: string): ChainSummary | null {
    const entry = getChainBySlug(slug);
    if (!entry) return null;
    return toChainSummary(entry);
  }

  /**
   * Returns all live chains. Currently: Arbitrum One only.
   */
  static getLiveChains(): ChainSummary[] {
    return getLiveChains().map(toChainSummary);
  }

  /**
   * Returns all planned/researching expansion targets.
   * Excludes Arbitrum and Ethereum (existing layers).
   */
  static getExpansionTargets(): ChainSummary[] {
    return getExpansionTargets().map(toChainSummary);
  }

  /**
   * Returns chains filtered by role.
   */
  static getChainsByRole(role: ChainRole): ChainSummary[] {
    return CHAIN_REGISTRY.filter(c => c.roles.includes(role)).map(toChainSummary);
  }

  /**
   * Returns the full expansion summary — designed for system map and
   * infrastructure page APIs. Stable structure for frontend rendering.
   */
  static getExpansionSummary(): ExpansionSummary {
    const all = CHAIN_REGISTRY;
    const core = all.find(c => c.roles.includes('core_execution'));
    const expansion = getExpansionTargets();

    const countByStatus = (status: ChainStatus) =>
      all.filter(c => c.status === status).length;

    const byRole = (role: ChainRole) =>
      all.filter(c => c.roles.includes(role)).map(c => c.displayName);

    return {
      asOf: new Date().toISOString(),
      totalChains: all.length,
      liveChains: countByStatus('live'),
      configuredChains: countByStatus('configured'),
      plannedChains: countByStatus('planned'),
      researchingChains: countByStatus('researching'),
      coreExecutionLayer: core ? toChainSummary(core) : null,
      expansionTargets: expansion.map(toChainSummary),
      featureFlags: getAllExpansionFlags(),
      layerMap: {
        coreExecution: byRole('core_execution'),
        identityBridges: byRole('identity_bridge'),
        capitalZones: byRole('capital_zone'),
        paymentsRails: byRole('payments_rail'),
        institutionalBridges: byRole('institutional_bridge'),
        sovereignFuture: byRole('sovereign_future'),
      },
      axiomRoleStatement:
        'Axiom is the orchestration and policy layer. Arbitrum One is the ' +
        'core live execution environment. AXUSD is the internal settlement ' +
        'layer. AXAU is the reserve layer structured around PAXG-backed ' +
        'reserve positions. Expansion chains are additive rails that extend ' +
        'Axiom capabilities — they do not replace the core layer.',
    };
  }

  /**
   * Returns a readiness checklist for a given expansion target.
   * Used for internal ops and source-file tracking.
   */
  static getReadinessChecklist(slug: string): {
    slug: string;
    displayName: string;
    status: string;
    checklist: { item: string; complete: boolean }[];
    blockers: string[];
    featureFlag: string | null;
    featureEnabled: boolean;
  } | null {
    const entry = getChainBySlug(slug);
    if (!entry) return null;

    const featureEnabled =
      entry.featureFlag === null
        ? true
        : isExpansionEnabled(entry.featureFlag as Parameters<typeof isExpansionEnabled>[0]);

    const checklist = [
      { item: 'Source files gathered', complete: entry.sourceFilesStatus !== 'missing' },
      { item: 'SDK reviewed', complete: entry.sdkStatus === 'reviewed' },
      { item: 'Documentation attached', complete: entry.docsStatus !== 'missing' },
      { item: 'Feature flag enabled', complete: featureEnabled },
      { item: 'Implementation complete', complete: entry.implementationReady },
      { item: 'Status: live', complete: entry.status === 'live' },
    ];

    const blockers: string[] = [];
    if (entry.sourceFilesStatus === 'missing') blockers.push('Source files not yet gathered');
    if (entry.sdkStatus === 'not_reviewed') blockers.push('SDK not yet reviewed');
    if (entry.docsStatus === 'missing') blockers.push('Documentation not yet attached');
    if (!featureEnabled) blockers.push(`Feature flag ${entry.featureFlag} not enabled`);
    if (!entry.implementationReady) blockers.push('Implementation not yet complete');

    return {
      slug: entry.slug,
      displayName: entry.displayName,
      status: entry.status,
      checklist,
      blockers,
      featureFlag: entry.featureFlag,
      featureEnabled,
    };
  }
}
