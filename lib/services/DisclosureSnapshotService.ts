import { db } from '../../server/db';
import { disclosureSnapshots, type DisclosureSnapshot } from '../../shared/treasurySchema';
import { reserveAccountingService } from './ReserveAccountingService';
import { treasuryLedgerService } from './TreasuryLedgerService';
import { TrustSource } from '../types/trustSource';
import { desc } from 'drizzle-orm';

export type SnapshotType = 'treasury' | 'reserve' | 'solvency' | 'system_state';

export interface ApiSafeSnapshot {
  id: string;
  snapshotType: string;
  totalUsd: number | null;
  totalFiatUsd: number | null;
  totalUsdcUsd: number | null;
  totalPaxgUsd: number | null;
  totalAxusdSupplyUsd: number | null;
  reserveRatio: number | null;
  composition: CompositionItem[];
  sourceBreakdown: SourceBreakdownItem[];
  notes: string | null;
  createdAt: string;
}

export interface CompositionItem {
  asset: string;
  usdValue: number;
  pct: number;
  positionType: string;
}

export interface SourceBreakdownItem {
  label: string;
  usdValue: number;
  source: string;
  confidence: string;
  lastVerifiedAt: string | null;
  note?: string;
}

export class DisclosureSnapshotService {
  async createSnapshot(type: SnapshotType = 'treasury'): Promise<{
    success: boolean;
    snapshot?: ApiSafeSnapshot;
    error?: string;
  }> {
    try {
      const [composition, accounts] = await Promise.all([
        reserveAccountingService.getComposition(),
        treasuryLedgerService.getAccounts(),
      ]);

      const sourceBreakdown: SourceBreakdownItem[] = [];

      if (composition.totalFiatUsd > 0) {
        const increaseAccount = accounts.find((a) => a.provider === 'ach');
        sourceBreakdown.push({
          label: 'Fiat — USD (Banking Rail)',
          usdValue: composition.totalFiatUsd,
          source: TrustSource.BANK_REPORTED,
          confidence: 'high',
          lastVerifiedAt: (increaseAccount?.metadata as any)?.lastSync ?? null,
          note: 'FDIC-insured operating account',
        });
      }

      if (composition.totalPaxgUsd > 0) {
        sourceBreakdown.push({
          label: 'Gold Reserve — PAXG (BitGo Custody)',
          usdValue: composition.totalPaxgUsd,
          source: TrustSource.CUSTODIAN_REPORTED,
          confidence: 'medium',
          lastVerifiedAt: null,
          note: 'BitGo institutional custody — Arbitrum One',
        });
      }

      if (composition.totalUsdcUsd > 0) {
        sourceBreakdown.push({
          label: 'Stablecoin — USDC (Circle)',
          usdValue: composition.totalUsdcUsd,
          source: TrustSource.PROVIDER_API_REPORTED,
          confidence: 'medium',
          lastVerifiedAt: null,
          note: 'Circle wallet infrastructure',
        });
      }

      if (composition.totalAxusdSupplyUsd > 0) {
        sourceBreakdown.push({
          label: 'AXUSD Supply (on-chain)',
          usdValue: composition.totalAxusdSupplyUsd,
          source: TrustSource.ONCHAIN_VERIFIED,
          confidence: 'high',
          lastVerifiedAt: null,
          note: 'ERC-3643 on-chain supply — Arbitrum One',
        });
      }

      const [inserted] = await db
        .insert(disclosureSnapshots)
        .values({
          snapshotType: type,
          totalUsd: composition.totalUsd.toFixed(2),
          totalFiatUsd: composition.totalFiatUsd.toFixed(2),
          totalUsdcUsd: composition.totalUsdcUsd.toFixed(2),
          totalPaxgUsd: composition.totalPaxgUsd.toFixed(2),
          totalAxusdSupplyUsd: composition.totalAxusdSupplyUsd.toFixed(2),
          reserveRatio: composition.reserveRatio?.toFixed(6) ?? null,
          compositionJson: composition.breakdown.map((b) => ({
            asset: b.assetSymbol,
            usdValue: b.usdValue,
            pct: b.pct,
            positionType: b.positionType,
          })),
          sourceBreakdownJson: sourceBreakdown,
          notes: null,
        })
        .returning();

      return { success: true, snapshot: this.toApiSafeOutput(inserted) };
    } catch (err: any) {
      console.error('[DisclosureSnapshotService.createSnapshot]', err?.message);
      return { success: false, error: err?.message };
    }
  }

  async getLatestSnapshot(): Promise<ApiSafeSnapshot | null> {
    const rows = await db
      .select()
      .from(disclosureSnapshots)
      .orderBy(desc(disclosureSnapshots.createdAt))
      .limit(1);
    return rows.length > 0 ? this.toApiSafeOutput(rows[0]) : null;
  }

  async getSnapshotHistory(limit = 10): Promise<ApiSafeSnapshot[]> {
    const rows = await db
      .select()
      .from(disclosureSnapshots)
      .orderBy(desc(disclosureSnapshots.createdAt))
      .limit(Math.min(limit, 50));
    return rows.map((r) => this.toApiSafeOutput(r));
  }

  toApiSafeOutput(snapshot: DisclosureSnapshot): ApiSafeSnapshot {
    const composition = (snapshot.compositionJson as CompositionItem[] | null) ?? [];
    const sourceBreakdown = (snapshot.sourceBreakdownJson as SourceBreakdownItem[] | null) ?? [];
    return {
      id: snapshot.id,
      snapshotType: snapshot.snapshotType,
      totalUsd: snapshot.totalUsd !== null ? Number(snapshot.totalUsd) : null,
      totalFiatUsd: snapshot.totalFiatUsd !== null ? Number(snapshot.totalFiatUsd) : null,
      totalUsdcUsd: snapshot.totalUsdcUsd !== null ? Number(snapshot.totalUsdcUsd) : null,
      totalPaxgUsd: snapshot.totalPaxgUsd !== null ? Number(snapshot.totalPaxgUsd) : null,
      totalAxusdSupplyUsd: snapshot.totalAxusdSupplyUsd !== null ? Number(snapshot.totalAxusdSupplyUsd) : null,
      reserveRatio: snapshot.reserveRatio !== null ? Number(snapshot.reserveRatio) : null,
      composition,
      sourceBreakdown,
      notes: snapshot.notes,
      createdAt: snapshot.createdAt.toISOString(),
    };
  }
}

export const disclosureSnapshotService = new DisclosureSnapshotService();
