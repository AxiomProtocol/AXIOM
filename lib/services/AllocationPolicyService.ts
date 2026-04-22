import { db } from '../../server/db';
import { allocationPolicies, allocationActuals } from '../../shared/allocationPolicySchema';
import { treasuryAllocations } from '../../shared/treasurySchema';
import { eq, sql, desc } from 'drizzle-orm';

const DEFAULT_POLICIES: Array<{
  bucketName: string;
  targetPct: string;
  minPct: string;
  maxPct: string;
  assetSymbol: string;
  notes: string;
}> = [
  {
    bucketName: 'operating_cash',
    targetPct: '20.0000',
    minPct: '10.0000',
    maxPct: '35.0000',
    assetSymbol: 'USD',
    notes: 'Day-to-day operational expenses and payroll buffer',
  },
  {
    bucketName: 'settlement_liquidity',
    targetPct: '15.0000',
    minPct: '5.0000',
    maxPct: '30.0000',
    assetSymbol: 'USDC',
    notes: 'AXUSD settlement and redemption liquidity',
  },
  {
    bucketName: 'reserve',
    targetPct: '40.0000',
    minPct: '25.0000',
    maxPct: '60.0000',
    assetSymbol: 'PAXG',
    notes: 'AXAU gold reserve backing via PAXG',
  },
  {
    bucketName: 'capital_deployment',
    targetPct: '20.0000',
    minPct: '5.0000',
    maxPct: '40.0000',
    assetSymbol: 'USD',
    notes: 'Real estate acquisition and investment deployment',
  },
  {
    bucketName: 'protocol_ops',
    targetPct: '5.0000',
    minPct: '1.0000',
    maxPct: '15.0000',
    assetSymbol: 'USD',
    notes: 'Protocol operations, compliance, and infrastructure',
  },
];

export class AllocationPolicyService {
  async seedDefaultPolicies(): Promise<{ seeded: number; skipped: number }> {
    const existing = await db.select().from(allocationPolicies);
    const existingNames = new Set(existing.map((p) => p.bucketName));

    let seeded = 0;
    let skipped = 0;

    for (const policy of DEFAULT_POLICIES) {
      if (existingNames.has(policy.bucketName)) {
        skipped++;
        continue;
      }
      await db.insert(allocationPolicies).values({
        ...policy,
        isActive: true,
        effectiveAt: new Date(),
      });
      seeded++;
    }

    return { seeded, skipped };
  }

  async getPolicies(): Promise<(typeof allocationPolicies.$inferSelect)[]> {
    return db.select().from(allocationPolicies).where(eq(allocationPolicies.isActive, true));
  }

  async computeActuals(totalUsd: number): Promise<{ computed: number }> {
    const policies = await this.getPolicies();
    const bucketBalances = await db
      .select({
        bucket: treasuryAllocations.allocationBucket,
        totalUsdValue: sql<number>`COALESCE(SUM(CAST(${treasuryAllocations.usdValue} AS DECIMAL)), 0)`,
      })
      .from(treasuryAllocations)
      .where(eq(treasuryAllocations.status, 'recorded'))
      .groupBy(treasuryAllocations.allocationBucket);

    const bucketMap = new Map(bucketBalances.map((b) => [b.bucket, Number(b.totalUsdValue)]));
    const now = new Date();

    for (const policy of policies) {
      const actualUsd = bucketMap.get(policy.bucketName) ?? 0;
      const actualPct = totalUsd > 0 ? (actualUsd / totalUsd) * 100 : 0;
      const variancePct = actualPct - Number(policy.targetPct);

      await db.insert(allocationActuals).values({
        policyId: policy.id,
        bucketName: policy.bucketName,
        actualAmount: actualUsd.toFixed(8),
        actualPct: actualPct.toFixed(4),
        usdValue: actualUsd.toFixed(2),
        computedAt: now,
        variancePct: variancePct.toFixed(4),
      });
    }

    return { computed: policies.length };
  }

  async getLatestActuals(): Promise<
    Array<{
      bucketName: string;
      targetPct: number;
      actualPct: number;
      variancePct: number;
      usdValue: number;
      status: 'within_range' | 'over' | 'under';
    }>
  > {
    const [policies, actuals] = await Promise.all([
      this.getPolicies(),
      db.select().from(allocationActuals).orderBy(desc(allocationActuals.computedAt)).limit(20),
    ]);

    const latestActuals = new Map<string, (typeof allocationActuals.$inferSelect)>();
    for (const a of actuals) {
      if (!latestActuals.has(a.bucketName)) latestActuals.set(a.bucketName, a);
    }

    return policies.map((policy) => {
      const actual = latestActuals.get(policy.bucketName);
      const targetPct = Number(policy.targetPct);
      const minPct = Number(policy.minPct ?? 0);
      const maxPct = Number(policy.maxPct ?? 100);
      const actualPct = actual ? Number(actual.actualPct ?? 0) : 0;
      const variancePct = actual ? Number(actual.variancePct ?? 0) : -targetPct;
      const usdValue = actual ? Number(actual.usdValue ?? 0) : 0;

      let status: 'within_range' | 'over' | 'under' = 'within_range';
      if (actualPct < minPct) status = 'under';
      else if (actualPct > maxPct) status = 'over';

      return { bucketName: policy.bucketName, targetPct, actualPct, variancePct, usdValue, status };
    });
  }
}

export const allocationPolicyService = new AllocationPolicyService();
