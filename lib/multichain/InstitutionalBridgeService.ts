/**
 * Axiom Protocol — Institutional Bridge Service
 *
 * Models Canton Network and other institutional-grade bridge
 * relationships. Exposes readiness state, route configuration,
 * and dependency tracking for institutional interoperability.
 *
 * IMPORTANT: No live Canton calls are made from this service.
 * Canton participant documentation has not been received.
 * This service prepares the integration surface and tracks
 * what is needed for implementation.
 *
 * Canton's role in Axiom:
 *   - Institutional finance interoperability bridge
 *   - Privacy-enabled enterprise product connectivity
 *   - NOT a replacement for Arbitrum execution
 *   - NOT a settlement layer (AXUSD remains internal settlement)
 */

import { isExpansionEnabled } from './featureFlags';
import { db } from '../../server/db';
import {
  expansionInstitutionalConnectors,
  type ExpansionInstitutionalConnector,
} from '../../shared/expansionSchema';

export interface InstitutionalConnectorDescriptor {
  connectorId: string;
  connectorName: string;
  networkOrPlatform: string;
  institutionType: string;
  role: string;
  status: string;
  featureEnabled: boolean;
  complianceScope: string;
  partnerDocsReceived: boolean;
  sdkReviewed: boolean;
  agreementStatus: string;
  implementationBlockers: string[];
  notes: string;
}

// ─── Canton Connector Descriptor ─────────────────────────────────────────────

const CANTON_CONNECTOR: InstitutionalConnectorDescriptor = {
  connectorId: 'canton-institutional-bridge',
  connectorName: 'Canton Institutional Bridge',
  networkOrPlatform: 'Canton Network',
  institutionType: 'enterprise_finance',
  role:
    'Privacy-enabled institutional interoperability bridge. Enables Axiom ' +
    'to connect with enterprise financial institutions operating on the ' +
    'Canton Network for private market product access.',
  status: 'researching',
  featureEnabled: false,
  complianceScope:
    'Institutional KYC, accredited investor verification, privacy-preserving ' +
    'transaction routing. Compliance scope not yet fully designed.',
  partnerDocsReceived: false,
  sdkReviewed: false,
  agreementStatus: 'none',
  implementationBlockers: [
    'Canton participant documentation not yet received',
    'Canton SDK not yet reviewed',
    'Enterprise agreement not in place',
    'Privacy/compliance scope not yet designed',
    'ENABLE_CANTON_INSTITUTIONAL_BRIDGE feature flag not enabled',
  ],
  notes:
    'Canton is the planned institutional-grade bridge for Axiom. ' +
    'The integration will focus on enterprise finance interoperability ' +
    'and private market connectivity. No partner docs have been received. ' +
    'No Canton SDK has been reviewed. No live connectivity exists or is implied.',
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class InstitutionalBridgeService {
  /**
   * Returns the Canton institutional bridge descriptor.
   */
  static getCantonConnector(): InstitutionalConnectorDescriptor {
    const featureEnabled = isExpansionEnabled('CANTON_INSTITUTIONAL_BRIDGE');
    return {
      ...CANTON_CONNECTOR,
      featureEnabled,
      status: featureEnabled ? 'configured' : 'researching',
    };
  }

  /**
   * Returns all configured institutional connector descriptors.
   * Merges static registry with any DB-persisted entries.
   */
  static async getAllConnectors(): Promise<InstitutionalConnectorDescriptor[]> {
    let dbConnectors: ExpansionInstitutionalConnector[] = [];
    try {
      dbConnectors = await db.select().from(expansionInstitutionalConnectors);
    } catch {
      // DB may have no rows yet — return static registry
    }

    const dbMapped: InstitutionalConnectorDescriptor[] = dbConnectors.map(row => ({
      connectorId: row.id,
      connectorName: row.connectorName,
      networkOrPlatform: row.networkOrPlatform,
      institutionType: row.institutionType ?? '',
      role: row.role ?? '',
      status: row.status,
      featureEnabled: false,
      complianceScope: row.complianceScope ?? '',
      partnerDocsReceived: row.partnerDocsReceived,
      sdkReviewed: row.sdkReviewed,
      agreementStatus: row.agreementStatus ?? 'none',
      implementationBlockers: [],
      notes: row.notes ?? '',
    }));

    const staticNotInDb = [this.getCantonConnector()].filter(
      s => !dbMapped.some(d => d.networkOrPlatform === s.networkOrPlatform)
    );

    return [...staticNotInDb, ...dbMapped];
  }

  /**
   * Returns a readiness report for the institutional bridge layer.
   */
  static getReadinessReport(): {
    overallStatus: string;
    connectors: { name: string; status: string; blockers: string[] }[];
    nextStep: string;
  } {
    const canton = this.getCantonConnector();
    return {
      overallStatus: 'researching',
      connectors: [
        {
          name: canton.connectorName,
          status: canton.status,
          blockers: canton.implementationBlockers,
        },
      ],
      nextStep:
        'Initiate Canton Network participant onboarding. Gather partner documentation ' +
        'and SDK materials. Review compliance scope requirements.',
    };
  }
}
