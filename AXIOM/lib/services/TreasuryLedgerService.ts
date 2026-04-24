import { db } from '../../server/db';
import {
  treasuryAccounts,
  partnerTreasuryTransactions,
  treasuryAllocations,
  type TreasuryAccount,
  type PartnerTreasuryTransaction,
  type InsertPartnerTreasuryTransaction,
} from '../../shared/treasurySchema';
import {
  allocationPolicies,
  allocationActuals,
} from '../../shared/allocationPolicySchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

export interface TransactionFilter {
  provider?: string;
  asset?: string;
  classification?: string;
  direction?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface BucketBalance {
  bucket: string;
  assetSymbol: string;
  totalUsdValue: number;
  transactionCount: number;
}

export interface LedgerAccount extends TreasuryAccount {
  trustSource: TrustClassification;
}

export class TreasuryLedgerService {
  async getAccounts(): Promise<LedgerAccount[]> {
    const rows = await db.select().from(treasuryAccounts);
    return rows.map((r) => ({
      ...r,
      trustSource: this.accountTrustSource(r),
    }));
  }

  private accountTrustSource(account: TreasuryAccount): TrustClassification {
    const sourceMap: Record<string, TrustSource> = {
      increase: TrustSource.BANK_REPORTED,
      circle: TrustSource.PROVIDER_API_REPORTED,
      bitgo: TrustSource.CUSTODIAN_REPORTED,
      onchain: TrustSource.ONCHAIN_VERIFIED,
      manual: TrustSource.MANUALLY_ENTERED,
    };
    const source = sourceMap[account.provider] ?? TrustSource.MANUALLY_ENTERED;
    const lastVerified =
      (account.metadata as any)?.lastSync ?? account.updatedAt?.toISOString() ?? null;
    return classify(source, lastVerified);
  }

  async getTransactions(filter: TransactionFilter = {}): Promise<{
    data: PartnerTreasuryTransaction[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = filter.offset ?? 0;

    const conditions = [];
    if (filter.provider) {
      conditions.push(eq(partnerTreasuryTransactions.sourceProvider, filter.provider));
    }
    if (filter.asset) {
      conditions.push(eq(partnerTreasuryTransactions.assetSymbol, filter.asset));
    }
    if (filter.classification) {
      conditions.push(eq(partnerTreasuryTransactions.classification, filter.classification));
    }
    if (filter.direction) {
      conditions.push(eq(partnerTreasuryTransactions.direction, filter.direction));
    }
    if (filter.fromDate) {
      conditions.push(gte(partnerTreasuryTransactions.occurredAt, filter.fromDate));
    }
    if (filter.toDate) {
      conditions.push(lte(partnerTreasuryTransactions.occurredAt, filter.toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(partnerTreasuryTransactions)
        .where(whereClause)
        .orderBy(desc(partnerTreasuryTransactions.occurredAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(partnerTreasuryTransactions)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return { data: rows, total, hasMore: offset + rows.length < total };
  }

  async getBucketBalances(): Promise<BucketBalance[]> {
    const result = await db
      .select({
        bucket: treasuryAllocations.allocationBucket,
        assetSymbol: treasuryAllocations.assetSymbol,
        totalUsdValue: sql<number>`COALESCE(SUM(CAST(${treasuryAllocations.usdValue} AS DECIMAL)), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(treasuryAllocations)
      .where(eq(treasuryAllocations.status, 'recorded'))
      .groupBy(treasuryAllocations.allocationBucket, treasuryAllocations.assetSymbol);

    return result.map((r) => ({
      bucket: r.bucket,
      assetSymbol: r.assetSymbol,
      totalUsdValue: Number(r.totalUsdValue),
      transactionCount: Number(r.transactionCount),
    }));
  }

  async recordTransaction(tx: InsertPartnerTreasuryTransaction): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    try {
      if (!tx.direction || !tx.assetSymbol || !tx.amount) {
        return { success: false, error: 'direction, assetSymbol, and amount are required' };
      }
      const validDirections = ['inflow', 'outflow', 'internal_transfer', 'conversion', 'fee'];
      if (!validDirections.includes(tx.direction)) {
        return { success: false, error: `Invalid direction: ${tx.direction}` };
      }

      const [inserted] = await db
        .insert(partnerTreasuryTransactions)
        .values(tx)
        .returning({ id: partnerTreasuryTransactions.id });
      return { success: true, id: inserted.id };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  async computeVariance(): Promise<Array<{
    bucket: string;
    targetPct: number;
    actualPct: number;
    variancePct: number;
    status: 'within_range' | 'over' | 'under';
  }>> {
    const [policies, actuals] = await Promise.all([
      db.select().from(allocationPolicies).where(eq(allocationPolicies.isActive, true)),
      db
        .select()
        .from(allocationActuals)
        .orderBy(desc(allocationActuals.computedAt))
        .limit(20),
    ]);

    const latestActuals = new Map<string, (typeof actuals)[0]>();
    for (const a of actuals) {
      if (!latestActuals.has(a.bucketName)) {
        latestActuals.set(a.bucketName, a);
      }
    }

    return policies.map((policy) => {
      const actual = latestActuals.get(policy.bucketName);
      const targetPct = Number(policy.targetPct);
      const actualPct = actual ? Number(actual.actualPct ?? 0) : 0;
      const minPct = Number(policy.minPct ?? 0);
      const maxPct = Number(policy.maxPct ?? 100);
      const variancePct = actualPct - targetPct;

      let status: 'within_range' | 'over' | 'under' = 'within_range';
      if (actualPct < minPct) status = 'under';
      else if (actualPct > maxPct) status = 'over';

      return { bucket: policy.bucketName, targetPct, actualPct, variancePct, status };
    });
  }
}

export const treasuryLedgerService = new TreasuryLedgerService();
