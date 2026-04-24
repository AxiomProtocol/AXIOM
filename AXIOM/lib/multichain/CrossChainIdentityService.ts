/**
 * Axiom Protocol — Cross-Chain Identity Service
 *
 * Models the Polygon identity bridge and future credential expansion
 * for cross-chain identity systems. Extends the existing
 * IdentityBridgeService (which handles ERC-3643 bridging within
 * Arbitrum) with a cross-chain identity planning layer.
 *
 * IMPORTANT: No live Polygon integration exists.
 * Polygon SDK and Polygon ID documentation have not been reviewed.
 * This service prepares the integration surface and tracks
 * what is needed before implementation can begin.
 *
 * Role separation:
 *   IdentityBridgeService   → ERC-3643 KYC bridge within Arbitrum (live)
 *   CrossChainIdentityService → Future cross-chain credential expansion (planned)
 *
 * The existing IdentityBridgeService is NOT replaced.
 * CrossChainIdentityService is additive.
 */

import { isExpansionEnabled } from './featureFlags';
import { db } from '../../server/db';
import {
  expansionIdentityBridges,
  type ExpansionIdentityBridge,
} from '../../shared/expansionSchema';

export type IdentityBridgeMode =
  | 'attestation'
  | 'mirrored_credential'
  | 'allowlist_sync'
  | 'future';

export interface CrossChainIdentityBridgeDescriptor {
  bridgeId: string;
  sourceIdentitySystem: string;
  destinationIdentitySystem: string;
  sourceChain: string;
  destinationChain: string;
  bridgeMode: IdentityBridgeMode;
  status: string;
  featureEnabled: boolean;
  credentialStandard: string;
  complianceRequired: boolean;
  verificationModel: string;
  docsAttached: boolean;
  sdkReviewed: boolean;
  implementationBlockers: string[];
  notes: string;
}

// ─── Polygon Identity Bridge Descriptor ──────────────────────────────────────

const POLYGON_IDENTITY_BRIDGE: CrossChainIdentityBridgeDescriptor = {
  bridgeId: 'arbitrum-erc3643-to-polygon-id',
  sourceIdentitySystem: 'ERC-3643 ONCHAINID (Arbitrum)',
  destinationIdentitySystem: 'Polygon ID',
  sourceChain: 'arbitrum',
  destinationChain: 'polygon',
  bridgeMode: 'future',
  status: 'researching',
  featureEnabled: false,
  credentialStandard: 'ERC-3643 → Polygon ID (W3C Verifiable Credentials)',
  complianceRequired: true,
  verificationModel:
    'ERC-3643 ONCHAINID credentials issued on Arbitrum would be attested ' +
    'or mirrored to Polygon identity infrastructure, enabling a wallet ' +
    'verified on Axiom (Arbitrum) to present valid credentials on Polygon-based ' +
    'institutional products without re-doing the full KYC process.',
  docsAttached: false,
  sdkReviewed: false,
  implementationBlockers: [
    'Polygon ID SDK and documentation not yet reviewed',
    'Cross-chain credential attestation design not finalized',
    'W3C Verifiable Credential mapping to ERC-3643 topics not designed',
    'ENABLE_POLYGON_IDENTITY_BRIDGE feature flag not enabled',
  ],
  notes:
    'The Polygon identity bridge will allow ERC-3643 credentials issued by ' +
    'the Axiom Claim Issuer on Arbitrum to be recognized on Polygon-based ' +
    'institutional products. This is a credential expansion — not a token ' +
    'bridge. It does not move assets. The existing IdentityBridgeService ' +
    '(Arbitrum-internal ERC-3643 bridging) remains unchanged and is not ' +
    'replaced by this integration.',
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class CrossChainIdentityService {
  /**
   * Returns the Polygon identity bridge descriptor.
   * Existing Arbitrum-internal IdentityBridgeService is not affected.
   */
  static getPolygonBridge(): CrossChainIdentityBridgeDescriptor {
    const featureEnabled = isExpansionEnabled('POLYGON_IDENTITY_BRIDGE');
    return {
      ...POLYGON_IDENTITY_BRIDGE,
      featureEnabled,
      status: featureEnabled ? 'configured' : 'researching',
      bridgeMode: featureEnabled ? 'attestation' : 'future',
    };
  }

  /**
   * Returns all planned cross-chain identity bridges — static + DB.
   */
  static async getAllBridges(): Promise<CrossChainIdentityBridgeDescriptor[]> {
    let dbBridges: ExpansionIdentityBridge[] = [];
    try {
      dbBridges = await db.select().from(expansionIdentityBridges);
    } catch {
      // No DB rows yet — return static registry
    }

    const dbMapped: CrossChainIdentityBridgeDescriptor[] = dbBridges.map(row => ({
      bridgeId: row.id,
      sourceIdentitySystem: row.sourceIdentitySystem,
      destinationIdentitySystem: row.destinationIdentitySystem,
      sourceChain: row.sourceChain,
      destinationChain: row.destinationChain,
      bridgeMode: row.bridgeMode as IdentityBridgeMode,
      status: row.status,
      featureEnabled: false,
      credentialStandard: row.credentialStandard ?? '',
      complianceRequired: row.complianceRequired,
      verificationModel: row.verificationModel ?? '',
      docsAttached: row.docsAttached,
      sdkReviewed: row.sdkReviewed,
      implementationBlockers: [],
      notes: row.notes ?? '',
    }));

    const staticNotInDb = [this.getPolygonBridge()].filter(
      s =>
        !dbMapped.some(
          d => d.sourceChain === s.sourceChain && d.destinationChain === s.destinationChain
        )
    );

    return [...staticNotInDb, ...dbMapped];
  }

  /**
   * Returns the readiness state for a given destination chain's identity bridge.
   */
  static async getBridgeReadiness(destinationChain: string): Promise<{
    bridgeId: string;
    status: string;
    featureEnabled: boolean;
    ready: boolean;
    blockers: string[];
  } | null> {
    const all = await this.getAllBridges();
    const bridge = all.find(b => b.destinationChain === destinationChain);
    if (!bridge) return null;

    return {
      bridgeId: bridge.bridgeId,
      status: bridge.status,
      featureEnabled: bridge.featureEnabled,
      ready: bridge.featureEnabled && bridge.docsAttached && bridge.sdkReviewed,
      blockers: bridge.implementationBlockers,
    };
  }
}
