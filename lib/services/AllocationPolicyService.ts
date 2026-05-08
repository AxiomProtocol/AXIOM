import { db } from '../../server/db';
import { allocationPolicies, allocationActuals } from '../../shared/allocationPolicySchema';
import { treasuryAllocations } from '../../shared/treasurySchema';
import { eq, sql, desc } from 'drizzle-orm';

/**
 * Six canonical treasury asset buckets.
 * Each bucket maps 1-to-1 with a protocol asset.
 *
 * Targets sum to 100%:
 *   ETH   20  — gas reserve + protocol infrastructure
 *   PAXG  25  — gold backing for AXAU
 *   AXAU  15  — protocol gold reserve instrument (self-held)
 *   AXM   10  — governance token treasury reserve
 *   AXUSD 15  — stablecoin settlement and redemption liquidity
 *   USDC  15  — off-chain settlement rail and operating liquidity
 */
const DEFAULT_POLICIES: Array<{
  bucketName: string;
  targetPct: string;
  minPct: string;
  maxPct: string;
  assetSymbol: string;
  notes: string;
}> = [
  {
    bucketName: 'eth_reserve',
    targetPct: '20.0000',
    minPct: '10.0000',
    maxPct: '35.0000',
    assetSymbol: 'ETH',
    notes: 'Gas reserve and on-chain protocol infrastructure',
  },
  {
    bucketName: 'paxg_reserve',
    targetPct: '25.0000',
    minPct: '15.0000',
    maxPct: '45.0000',
    assetSymbol: 'PAXG',
    notes: 'Physical gold backing for AXAU reserve instrument',
  },
  {
    bucketName: 'axau_reserve',
    targetPct: '15.0000',
    minPct: '5.0000',
    maxPct: '30.0000',
    assetSymbol: 'AXAU',
    notes: 'Protocol self-held gold reserve instrument',
  },
  {
    bucketName: 'axm_treasury',
    targetPct: '10.0000',
    minPct: '3.0000',
    maxPct: '20.0000',
    assetSymbol: 'AXM',
    notes: 'Governance token protocol treasury reserve',
  },
  {
    bucketName: 'axusd_liquidity',
    targetPct: '15.0000',
    minPct: '5.0000',
    maxPct: '30.0000',
    assetSymbol: 'AXUSD',
    notes: 'AXUSD stablecoin settlement and redemption liquidity',
  },
  {
    bucketName: 'usdc_operations',
    targetPct: '15.0000',
    minPct: '5.0000',
    maxPct: '30.0000',
    assetSymbol: 'USDC',
    notes: 'Off-chain settlement rail and day-to-day operating liquidity',
  },
];

export class AllocationPolicyService {
  /**
   * Seeds the 6 canonical buckets into allocation_policies.
   * Existing rows with a matching bucket_name are skipped (idempotent).
   * Old buckets that are no longer in DEFAULT_POLICIES are deactivated.
   */
  async seedDefaultPolicies(): Promise<{ seeded: number; skipped: number; deactivated: number }> {
    const existing = await db.select().from(allocationPolicies);
    const existingNames = new Set(existing.map((p) => p.bucketName));
    const canonicalNames = new Set(DEFAULT_POLICIES.map((p) => p.bucketName));

    let seeded = 0;
    let skipped = 0;
    let deactivated = 0;

    // Insert missing canonical buckets
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

    // Deactivate any old buckets that are no longer canonical
    for (const row of existing) {
      if (!canonicalNames.has(row.bucketName) && row.isActive) {
        await db
          .update(allocationPolicies)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(allocationPolicies.id, row.id));
        deactivated++;
      }
    }

    return { seeded, skipped, deactivated };
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
      assetSymbol: string;
      targetPct: number;
      actualPct: number;
      variancePct: number;
      usdValue: number;
      status: 'within_range' | 'over' | 'under';
    }>
  > {
    const [policies, actuals] = await Promise.all([
      this.getPolicies(),
      db.select().from(allocationActuals).orderBy(desc(allocationActuals.computedAt)).limit(30),
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

      return {
        bucketName: policy.bucketName,
        assetSymbol: policy.assetSymbol ?? 'USD',
        targetPct,
        actualPct,
        variancePct,
        usdValue,
        status,
      };
    });
  }
}

export const allocationPolicyService = new AllocationPolicyService();
