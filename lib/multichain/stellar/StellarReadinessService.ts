/**
 * Axiom Protocol — Stellar Readiness Service
 *
 * Extends the base SettlementRailService with Stellar-specific readiness
 * checks and implementation status surfaces. This is the primary service
 * consumed by the readiness API and Founder Ops dashboard for Stellar status.
 *
 * This service reads from:
 *   1. Static anchor candidate registry (ANCHOR_CANDIDATES in types.ts)
 *   2. Static SEP protocol capability list (STELLAR_SEP_CAPABILITIES)
 *   3. Static planned corridor registry (STELLAR_PLANNED_CORRIDORS)
 *   4. DB table expansion_rail_integrations (if row exists for stellar)
 *   5. Feature flag: ENABLE_STELLAR_PAYMENTS_RAIL
 *
 * The service never calls the Stellar network — that is the adapter's job.
 * This service surfaces readiness state, blockers, and next-action items.
 */

import { isExpansionEnabled } from '../featureFlags';
import { SettlementRailService } from '../SettlementRailService';
import {
  ANCHOR_CANDIDATES,
  STELLAR_SEP_CAPABILITIES,
  STELLAR_PLANNED_CORRIDORS,
  STELLAR_NETWORK_CONFIGS,
  type AnchorCandidate,
  type SEPCapability,
  type StellarPaymentCorridor,
} from './types';
import { db } from '../../../server/db';
import { expansionRailIntegrations } from '../../../shared/expansionSchema';
import { eq } from 'drizzle-orm';

export interface StellarReadinessReport {
  featureEnabled: boolean;
  sdkInstalled: boolean;
  anchorSelected: boolean;
  selectedAnchorId: string | null;
  corridorsDefined: boolean;
  implementationReady: boolean;
  blockers: string[];
  nextActions: string[];
  anchorCandidates: AnchorCandidate[];
  sepCapabilities: SEPCapability[];
  plannedCorridors: StellarPaymentCorridor[];
  networkConfig: (typeof STELLAR_NETWORK_CONFIGS)['mainnet'];
  dbState: {
    rowFound: boolean;
    docsAttached: boolean;
    sdkReviewed: boolean;
    sourceFilesAttached: boolean;
    notes: string | null;
  };
  asOf: string;
}

export class StellarReadinessService {
  /**
   * Returns the full Stellar readiness report.
   * Safe to call at any time — never throws.
   */
  static async getReadinessReport(): Promise<StellarReadinessReport> {
    const featureEnabled = isExpansionEnabled('STELLAR_PAYMENTS_RAIL');
    const baseRail = SettlementRailService.getStellarRail();

    let dbState = {
      rowFound: false,
      docsAttached: false,
      sdkReviewed: false,
      sourceFilesAttached: false,
      notes: null as string | null,
    };

    try {
      const rows = await db
        .select()
        .from(expansionRailIntegrations)
        .where(eq(expansionRailIntegrations.chainSlug, 'stellar'))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        dbState = {
          rowFound: true,
          docsAttached: row.docsAttached,
          sdkReviewed: row.sdkReviewed,
          sourceFilesAttached: row.sourceFilesAttached,
          notes: row.notes ?? null,
        };
      }
    } catch {
      // DB unavailable — fall back to static defaults
    }

    const sdkInstalled = dbState.sdkReviewed;
    const anchorSelected = ANCHOR_CANDIDATES.some(
      a => a.evaluationStatus === 'integrated' || a.evaluationStatus === 'live'
    );
    const selectedAnchor = ANCHOR_CANDIDATES.find(
      a => a.evaluationStatus === 'integrated' || a.evaluationStatus === 'live'
    ) ?? null;

    const blockers: string[] = [...baseRail.implementationBlockers];
    if (!sdkInstalled) blockers.unshift('@stellar/stellar-sdk not yet installed');
    if (!anchorSelected) blockers.unshift('Anchor partner not yet selected (business decision required)');

    const nextActions: string[] = [];
    if (!anchorSelected) {
      nextActions.push('[BUSINESS] Select anchor partner from candidates: Circle, MoneyGram, Bitso, Tempo');
    }
    if (!sdkInstalled) {
      nextActions.push('[TECHNICAL] Install and review @stellar/stellar-sdk');
    }
    if (!dbState.docsAttached) {
      nextActions.push('[DOCS] Review SEP-0024 and SEP-0031 specs (public GitHub)');
    }
    if (sdkInstalled && anchorSelected) {
      nextActions.push('[IMPLEMENT] Replace StellarPaymentAdapter stubs with real SDK calls');
      nextActions.push('[IMPLEMENT] Build SEP-24 interactive flow for anchor integration');
    }

    const implementationReady =
      featureEnabled &&
      sdkInstalled &&
      anchorSelected &&
      dbState.docsAttached &&
      dbState.sourceFilesAttached;

    return {
      featureEnabled,
      sdkInstalled,
      anchorSelected,
      selectedAnchorId: selectedAnchor?.anchorId ?? null,
      corridorsDefined: STELLAR_PLANNED_CORRIDORS.length > 0,
      implementationReady,
      blockers,
      nextActions,
      anchorCandidates: ANCHOR_CANDIDATES,
      sepCapabilities: STELLAR_SEP_CAPABILITIES,
      plannedCorridors: STELLAR_PLANNED_CORRIDORS,
      networkConfig: STELLAR_NETWORK_CONFIGS.mainnet,
      dbState,
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Returns just the anchor candidate list with evaluation status.
   */
  static getAnchorCandidates(): AnchorCandidate[] {
    return ANCHOR_CANDIDATES;
  }

  /**
   * Returns all planned payment corridors with current blocker state.
   */
  static getPlannedCorridors(): StellarPaymentCorridor[] {
    return STELLAR_PLANNED_CORRIDORS;
  }

  /**
   * Returns SEP protocol capability matrix with current review status.
   */
  static getSEPCapabilities(): SEPCapability[] {
    return STELLAR_SEP_CAPABILITIES;
  }

  /**
   * Returns a quick summary for the expansion-summary API.
   */
  static async getQuickSummary(): Promise<{
    status: string;
    featureEnabled: boolean;
    sdkInstalled: boolean;
    anchorSelected: boolean;
    blockerCount: number;
    topBlocker: string | null;
  }> {
    const report = await this.getReadinessReport();
    return {
      status: 'researching',
      featureEnabled: report.featureEnabled,
      sdkInstalled: report.sdkInstalled,
      anchorSelected: report.anchorSelected,
      blockerCount: report.blockers.length,
      topBlocker: report.blockers[0] ?? null,
    };
  }
}
