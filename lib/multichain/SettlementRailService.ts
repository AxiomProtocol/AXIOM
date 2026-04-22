/**
 * Axiom Protocol — Settlement Rail Service
 *
 * Models Stellar and other future payment rail integrations.
 * Exposes capability discovery, status, and readiness surfaces
 * for the payments layer of Axiom's expansion architecture.
 *
 * IMPORTANT: No live Stellar calls are made from this service.
 * The Stellar SDK has not yet been reviewed. This service
 * represents the intended architecture and prepares the
 * integration surface for when source files are gathered.
 *
 * Axiom role clarity:
 *   AXUSD = internal settlement layer (Arbitrum)
 *   Stellar = external movement rail (payments / remittance)
 *   These are NOT the same. Stellar does not replace AXUSD.
 */

import { isExpansionEnabled } from './featureFlags';
import { getChainBySlug } from './chainRegistry';

export type RailStatus =
  | 'live'
  | 'configured'
  | 'planned'
  | 'researching'
  | 'disabled';

export interface RailCapability {
  name: string;
  supported: boolean;
  notes: string;
}

export interface SettlementRailDescriptor {
  railId: string;
  railName: string;
  networkSlug: string;
  status: RailStatus;
  featureEnabled: boolean;
  capabilities: RailCapability[];
  corridorTypes: string[];
  estimatedGoLive: string;
  implementationBlockers: string[];
  sourceFilesStatus: string;
  sdkStatus: string;
  notes: string;
}

// ─── Stellar Rail Descriptor ──────────────────────────────────────────────────

const STELLAR_RAIL: SettlementRailDescriptor = {
  railId: 'stellar-payment-rail',
  railName: 'Stellar Payment Rail',
  networkSlug: 'stellar',
  status: 'researching',
  featureEnabled: false,
  capabilities: [
    {
      name: 'Remittance Corridors',
      supported: false,
      notes: 'Planned. Requires anchor partner selection and Stellar SDK integration.',
    },
    {
      name: 'Payout / Disbursement',
      supported: false,
      notes: 'Planned. AXUSD → Stellar payout flow not yet designed.',
    },
    {
      name: 'Fiat/Stablecoin Movement',
      supported: false,
      notes: 'Planned. Asset mapping (AXUSD → USDC on Stellar) not yet finalized.',
    },
    {
      name: 'Cross-Jurisdiction Settlement',
      supported: false,
      notes: 'Planned. Compliance framework for cross-border payments not yet designed.',
    },
    {
      name: 'Anchor Integration',
      supported: false,
      notes: 'Not started. Stellar anchor partner not yet selected.',
    },
  ],
  corridorTypes: ['payment', 'payout', 'remittance'],
  estimatedGoLive: 'TBD — source files not yet gathered',
  implementationBlockers: [
    'Stellar Horizon API and Stellar SDK not yet reviewed',
    'Anchor partner not yet selected',
    'Asset mapping on Stellar side not finalized',
    'Compliance framework for outbound payment corridors not designed',
    'ENABLE_STELLAR_PAYMENTS_RAIL environment variable not enabled',
  ],
  sourceFilesStatus: 'missing',
  sdkStatus: 'not_reviewed',
  notes:
    'Stellar is the planned external payments and asset movement rail. ' +
    'It will serve as the remittance corridor and payout layer for Axiom. ' +
    'AXUSD remains the internal settlement layer on Arbitrum. ' +
    'Stellar extends Axiom to external payment corridors — it does not ' +
    'replace AXUSD or any other internal layer.',
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class SettlementRailService {
  /**
   * Returns the Stellar payment rail descriptor.
   * Status is always explicit — never implies live connectivity.
   */
  static getStellarRail(): SettlementRailDescriptor {
    const featureEnabled = isExpansionEnabled('STELLAR_PAYMENTS_RAIL');
    return {
      ...STELLAR_RAIL,
      featureEnabled,
      status: featureEnabled ? 'configured' : 'researching',
    };
  }

  /**
   * Returns all configured payment rail descriptors.
   * Currently: Stellar only.
   */
  static getAllRails(): SettlementRailDescriptor[] {
    return [this.getStellarRail()];
  }

  /**
   * Returns the capability model for a specific rail.
   */
  static getRailCapabilities(railId: string): RailCapability[] | null {
    const all = this.getAllRails();
    const rail = all.find(r => r.railId === railId);
    return rail?.capabilities ?? null;
  }

  /**
   * Returns a structured readiness object for a rail.
   * Designed for admin tools and source-file tracking dashboards.
   */
  static getRailReadiness(railId: string): {
    railId: string;
    status: RailStatus;
    readyForImplementation: boolean;
    blockers: string[];
    nextStep: string;
  } | null {
    const all = this.getAllRails();
    const rail = all.find(r => r.railId === railId);
    if (!rail) return null;

    const ready =
      rail.featureEnabled &&
      rail.sourceFilesStatus === 'attached' &&
      rail.sdkStatus === 'reviewed' &&
      rail.implementationBlockers.length === 0;

    const nextStep =
      rail.sdkStatus === 'not_reviewed'
        ? 'Gather and review Stellar Horizon API docs and Stellar SDK'
        : rail.sourceFilesStatus === 'missing'
        ? 'Attach source files and partner requirements'
        : 'Begin implementation once blockers are resolved';

    return {
      railId: rail.railId,
      status: rail.status,
      readyForImplementation: ready,
      blockers: rail.implementationBlockers,
      nextStep,
    };
  }
}
