/**
 * Axiom Protocol — Sovereign Chain Service
 *
 * Models the Cosmos / Axiom-native chain planning layer.
 * Exposes architecture readiness, dependency tracking, and
 * planning state for Axiom's long-term sovereign infrastructure.
 *
 * IMPORTANT: No Cosmos chain exists yet. No SDK has been reviewed.
 * This service models what is planned and tracks what is needed
 * for implementation when source files are gathered.
 *
 * Cosmos role in Axiom:
 *   - Long-term sovereign infrastructure layer
 *   - Possible Axiom-native chain or interchain hub
 *   - Future interchain control plane
 *   - NOT a replacement for Arbitrum (which remains core execution)
 *   - NOT live, configured, or connected in any way today
 */

import { isExpansionEnabled } from './featureFlags';
import { db } from '../../server/db';
import {
  expansionSovereignReadiness,
  type ExpansionSovereignReadiness,
} from '../../shared/expansionSchema';

export interface SovereignReadinessDescriptor {
  chainFamily: string;
  targetRole: string;
  readinessStatus: string;
  featureEnabled: boolean;
  architectureDecisions: {
    decision: string;
    made: boolean;
    notes: string;
  }[];
  dependencyStatus: {
    category: string;
    status: 'resolved' | 'unresolved' | 'not_started';
    notes: string;
  }[];
  sourceFilesStatus: string;
  sdkStatus: string;
  docsStatus: string;
  estimatedTimeHorizon: string;
  implementationBlockers: string[];
  notes: string;
}

// ─── Cosmos Readiness Descriptor ─────────────────────────────────────────────

const COSMOS_READINESS: SovereignReadinessDescriptor = {
  chainFamily: 'Cosmos SDK',
  targetRole:
    'Axiom-native chain or interchain hub. Long-term sovereign infrastructure ' +
    'enabling Axiom to operate as a sovereign digital-physical economy with ' +
    'its own chain, validators, and interchain control plane.',
  readinessStatus: 'researching',
  featureEnabled: false,
  architectureDecisions: [
    {
      decision: 'Axiom-native chain vs. Hub/Router model',
      made: false,
      notes:
        'Not yet decided. Options include: standalone Axiom chain, ' +
        'IBC-connected hub, or Cosmos appchain built with Cosmos SDK.',
    },
    {
      decision: 'Validator economics model',
      made: false,
      notes: 'Not designed. Token economics for validator incentives not yet modeled.',
    },
    {
      decision: 'IBC module selection',
      made: false,
      notes: 'IBC module configuration not started. Depends on architecture decision above.',
    },
    {
      decision: 'Cross-chain settlement model with Arbitrum',
      made: false,
      notes:
        'How AXUSD and AXAU interact across Arbitrum ↔ Cosmos not yet designed. ' +
        'Must not collapse the roles of the two layers.',
    },
    {
      decision: 'AXM token role in sovereign chain',
      made: false,
      notes: 'Whether AXM is the native gas/governance token on Cosmos chain not decided.',
    },
  ],
  dependencyStatus: [
    {
      category: 'Cosmos SDK',
      status: 'not_started',
      notes: 'SDK not yet reviewed. No version selected.',
    },
    {
      category: 'IBC Protocol',
      status: 'not_started',
      notes: 'IBC module not yet selected. Depends on architecture decision.',
    },
    {
      category: 'Validator network',
      status: 'not_started',
      notes: 'No validator partners identified. Economics not designed.',
    },
    {
      category: 'Architecture decision',
      status: 'not_started',
      notes: 'Core architecture (appchain vs hub) not yet decided.',
    },
    {
      category: 'Legal/regulatory review',
      status: 'not_started',
      notes: 'Sovereign chain may have distinct regulatory considerations.',
    },
  ],
  sourceFilesStatus: 'missing',
  sdkStatus: 'not_reviewed',
  docsStatus: 'missing',
  estimatedTimeHorizon: 'Long-term — architecture decisions not yet made',
  implementationBlockers: [
    'Architecture decision (appchain vs hub) not yet made',
    'Cosmos SDK not yet reviewed',
    'Validator economics not designed',
    'IBC module not selected',
    'ENABLE_COSMOS_SOVEREIGN_PREP feature flag not enabled',
  ],
  notes:
    'Cosmos represents Axiom\'s sovereign future infrastructure layer. ' +
    'This is the furthest-horizon expansion target. No work can begin ' +
    'until the architecture decision is made and Cosmos SDK source files ' +
    'are gathered. Arbitrum remains the core execution layer throughout ' +
    'and after this planning phase.',
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class SovereignChainService {
  /**
   * Returns the Cosmos sovereign readiness descriptor.
   */
  static getCosmosReadiness(): SovereignReadinessDescriptor {
    const featureEnabled = isExpansionEnabled('COSMOS_SOVEREIGN_PREP');
    return {
      ...COSMOS_READINESS,
      featureEnabled,
    };
  }

  /**
   * Returns all sovereign readiness records — static + DB-persisted.
   */
  static async getAllReadiness(): Promise<ExpansionSovereignReadiness[]> {
    try {
      return await db.select().from(expansionSovereignReadiness);
    } catch {
      return [];
    }
  }

  /**
   * Returns the overall sovereign planning state summary.
   */
  static getSovereignPlanningState(): {
    overallStatus: string;
    featureEnabled: boolean;
    architectureDecided: boolean;
    sdkReviewed: boolean;
    implementationBlockers: string[];
    nextStep: string;
    timeHorizon: string;
  } {
    const cosmos = this.getCosmosReadiness();
    const architectureDecided = cosmos.architectureDecisions.some(d => d.made);
    const sdkReviewed = cosmos.sdkStatus === 'reviewed';

    const nextStep = !architectureDecided
      ? 'Make the core architecture decision: Axiom-native appchain vs IBC hub model'
      : !sdkReviewed
      ? 'Gather and review Cosmos SDK documentation and source files'
      : 'Proceed with validator economics design and IBC module selection';

    return {
      overallStatus: cosmos.readinessStatus,
      featureEnabled: cosmos.featureEnabled,
      architectureDecided,
      sdkReviewed,
      implementationBlockers: cosmos.implementationBlockers,
      nextStep,
      timeHorizon: cosmos.estimatedTimeHorizon,
    };
  }
}
