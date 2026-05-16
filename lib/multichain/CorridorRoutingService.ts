/**
 * Axiom Protocol — Corridor Routing Service
 *
 * Defines canonical route objects between networks and assets.
 * Classifies corridors as direct, assisted, or future.
 *
 * IMPORTANT: No live execution occurs in this service.
 * All corridors below reflect planning-phase models only.
 * Execute no transactions. Fabricate no live connectivity.
 *
 * When source files, SDKs, and partner agreements are gathered,
 * real execution logic will be added to these route objects.
 */

import { db } from '../../server/db';
import {
  expansionSettlementCorridors,
  type ExpansionSettlementCorridor,
} from '../../shared/expansionSchema';

export type CorridorPath = 'direct' | 'assisted' | 'future';

export type CorridorType =
  | 'payment'
  | 'bridge'
  | 'redemption'
  | 'reserve_transfer'
  | 'payout'
  | 'identity_sync';

export interface CorridorRoute {
  id: string;
  label: string;
  sourceNetwork: string;
  destinationNetwork: string;
  sourceAsset: string;
  destinationAsset: string;
  corridorType: CorridorType;
  path: CorridorPath;
  status: string;
  operatorModel: string;
  complianceRequired: boolean;
  estimatedSettlementMinutes: string | null;
  minAmountUsd: string | null;
  maxAmountUsd: string | null;
  notes: string;
  implementationBlockers: string[];
}

// ─── Static planned corridor definitions ──────────────────────────────────────
// These model the intended architecture. They are not live routes.

const PLANNED_CORRIDORS: CorridorRoute[] = [
  {
    id: 'axusd-arbitrum-to-stellar',
    label: 'AXUSD → Stellar Payment Rail',
    sourceNetwork: 'arbitrum',
    destinationNetwork: 'stellar',
    sourceAsset: 'AXUSD',
    destinationAsset: 'USDC',
    corridorType: 'payment',
    path: 'future',
    status: 'planned',
    operatorModel: 'external_partner',
    complianceRequired: true,
    estimatedSettlementMinutes: '2-5',
    minAmountUsd: '10',
    maxAmountUsd: null,
    notes:
      'Planned outbound payment corridor from AXUSD (Arbitrum internal settlement) ' +
      'to Stellar for remittance and payout flows. Requires Stellar anchor partner ' +
      'selection, Stellar SDK integration, and compliance configuration. ' +
      'No live connectivity. Stellar SDK not yet reviewed.',
    implementationBlockers: [
      'Stellar SDK not yet reviewed',
      'Anchor partner not yet selected',
      'Compliance configuration for outbound payments not designed',
      'ENABLE_STELLAR_PAYMENTS_RAIL feature flag not enabled',
    ],
  },
  {
    id: 'axusd-arbitrum-to-polygon',
    label: 'AXUSD → Polygon Bridge (Identity Sync)',
    sourceNetwork: 'arbitrum',
    destinationNetwork: 'polygon',
    sourceAsset: 'AXUSD',
    destinationAsset: 'AXUSD',
    corridorType: 'identity_sync',
    path: 'future',
    status: 'planned',
    operatorModel: 'automated',
    complianceRequired: true,
    estimatedSettlementMinutes: '10-20',
    minAmountUsd: null,
    maxAmountUsd: null,
    notes:
      'Planned identity credential synchronization corridor. ' +
      'ERC-3643 ONCHAINID credentials issued on Arbitrum would be attested ' +
      'to Polygon identity infrastructure to enable institutional access ' +
      'bridging. Not a token bridge — a credential sync. ' +
      'Polygon SDK and Polygon ID docs not yet reviewed.',
    implementationBlockers: [
      'Polygon SDK not yet reviewed',
      'Polygon ID integration design not finalized',
      'ENABLE_POLYGON_IDENTITY_BRIDGE feature flag not enabled',
    ],
  },
  {
    id: 'axau-reserve-to-ethereum',
    label: 'AXAU Reserve Reference → Ethereum (PAXG)',
    sourceNetwork: 'arbitrum',
    destinationNetwork: 'ethereum',
    sourceAsset: 'AXAU',
    destinationAsset: 'PAXG',
    corridorType: 'reserve_transfer',
    path: 'assisted',
    status: 'configured',
    operatorModel: 'manual',
    complianceRequired: true,
    estimatedSettlementMinutes: null,
    minAmountUsd: null,
    maxAmountUsd: null,
    notes:
      'Reserve reference path. AXAU is structured around PAXG-backed reserve ' +
      'positions on Ethereum Mainnet. Ops team acquires PAXG, deposits to vault, ' +
      'and mints AXAU. This is an ops-assisted flow, not an automated bridge.',
    implementationBlockers: [],
  },
  {
    id: 'fiat-increase-to-axusd',
    label: 'Fiat (ACH) → AXUSD (Banking Bridge)',
    sourceNetwork: 'banking_fiat',
    destinationNetwork: 'arbitrum',
    sourceAsset: 'USD',
    destinationAsset: 'AXUSD',
    corridorType: 'bridge',
    path: 'assisted',
    status: 'configured',
    operatorModel: 'assisted',
    complianceRequired: true,
    estimatedSettlementMinutes: '1440-2880',
    minAmountUsd: '10',
    maxAmountUsd: '25000',
    notes:
      'Configured fiat-to-AXUSD bridge via ACH banking rails. ' +
      'User deposits fiat via ACH. Ops team mints AXUSD after ACH settles. ' +
      'This uses the existing BridgeService and is not a blockchain bridge.',
    implementationBlockers: [],
  },
  {
    id: 'avalanche-capital-zone',
    label: 'AXUSD → Avalanche Capital Zone',
    sourceNetwork: 'arbitrum',
    destinationNetwork: 'avalanche',
    sourceAsset: 'AXUSD',
    destinationAsset: 'AXUSD',
    corridorType: 'bridge',
    path: 'future',
    status: 'planned',
    operatorModel: 'external_partner',
    complianceRequired: true,
    estimatedSettlementMinutes: null,
    minAmountUsd: null,
    maxAmountUsd: null,
    notes:
      'Planned capital deployment corridor to Avalanche permissioned environments. ' +
      'Would enable capital allocation in compliance-aware Avalanche Subnet zones. ' +
      'Subnet configuration requirements and Avalanche SDK not yet gathered.',
    implementationBlockers: [
      'Avalanche Subnet SDK not yet reviewed',
      'Subnet configuration requirements not yet gathered',
      'ENABLE_AVALANCHE_CAPITAL_ENV feature flag not enabled',
    ],
  },
  {
    id: 'canton-institutional-bridge',
    label: 'Axiom → Canton Institutional Bridge',
    sourceNetwork: 'arbitrum',
    destinationNetwork: 'canton',
    sourceAsset: 'AXUSD',
    destinationAsset: 'TBD',
    corridorType: 'bridge',
    path: 'future',
    status: 'planned',
    operatorModel: 'external_partner',
    complianceRequired: true,
    estimatedSettlementMinutes: null,
    minAmountUsd: null,
    maxAmountUsd: null,
    notes:
      'Planned institutional bridge to Canton Network for enterprise finance ' +
      'interoperability. Canton partner docs not yet received. ' +
      'Asset mapping on Canton side not yet determined.',
    implementationBlockers: [
      'Canton partner docs not received',
      'Canton SDK not yet reviewed',
      'Enterprise agreement not in place',
      'ENABLE_CANTON_INSTITUTIONAL_BRIDGE feature flag not enabled',
    ],
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export class CorridorRoutingService {
  /**
   * Returns all known corridors — static planned + any persisted in DB.
   * Never presents future corridors as live.
   */
  static async getAllCorridors(): Promise<CorridorRoute[]> {
    let dbCorridors: ExpansionSettlementCorridor[] = [];
    try {
      dbCorridors = await db.select().from(expansionSettlementCorridors);
    } catch {
      // DB may not yet have rows — return static registry
    }

    const dbMapped: CorridorRoute[] = dbCorridors.map(row => ({
      id: row.id,
      label: `${row.sourceNetwork} → ${row.destinationNetwork} (${row.corridorType})`,
      sourceNetwork: row.sourceNetwork,
      destinationNetwork: row.destinationNetwork,
      sourceAsset: row.sourceAsset,
      destinationAsset: row.destinationAsset,
      corridorType: row.corridorType as CorridorType,
      path: (row.status === 'live' ? 'direct' : row.status === 'configured' ? 'assisted' : 'future') as CorridorPath,
      status: row.status,
      operatorModel: row.operatorModel,
      complianceRequired: row.complianceRequired,
      estimatedSettlementMinutes: row.estimatedSettlementMinutes ?? null,
      minAmountUsd: row.minAmountUsd ?? null,
      maxAmountUsd: row.maxAmountUsd ?? null,
      notes: row.notes ?? '',
      implementationBlockers: [],
    }));

    // Merge: DB rows override static registry entries with same source+dest+type
    const staticFiltered = PLANNED_CORRIDORS.filter(planned =>
      !dbMapped.some(
        db =>
          db.sourceNetwork === planned.sourceNetwork &&
          db.destinationNetwork === planned.destinationNetwork &&
          db.corridorType === planned.corridorType
      )
    );

    return [...staticFiltered, ...dbMapped];
  }

  /**
   * Returns corridors grouped by path classification.
   */
  static async getCorridorsByPath(): Promise<Record<CorridorPath, CorridorRoute[]>> {
    const all = await this.getAllCorridors();
    return {
      direct: all.filter(c => c.path === 'direct'),
      assisted: all.filter(c => c.path === 'assisted'),
      future: all.filter(c => c.path === 'future'),
    };
  }

  /**
   * Returns corridors involving a specific network.
   */
  static async getCorridorsForNetwork(slug: string): Promise<CorridorRoute[]> {
    const all = await this.getAllCorridors();
    return all.filter(
      c => c.sourceNetwork === slug || c.destinationNetwork === slug
    );
  }
}
