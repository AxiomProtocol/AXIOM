import { db } from '../../server/db';
import { aiUsageMeters } from '../../shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const DEFAULT_LIMITS = {
  assistantCalls: 100,
  docExtractions: 50,
  exportsGenerated: 20,
};

export interface UsageStats {
  assistantCalls: number;
  docExtractions: number;
  exportsGenerated: number;
  limits: {
    assistantCalls: number;
    docExtractions: number;
    exportsGenerated: number;
  };
  periodStart: Date;
  periodEnd: Date;
}

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function parseLimits(): typeof DEFAULT_LIMITS {
  try {
    const limitsJson = process.env.AI_MONTHLY_LIMITS_JSON;
    if (limitsJson) {
      return { ...DEFAULT_LIMITS, ...JSON.parse(limitsJson) };
    }
  } catch (e) {
    console.error('Failed to parse AI_MONTHLY_LIMITS_JSON:', e);
  }
  return DEFAULT_LIMITS;
}

export async function getOrCreateMeter(userId: number): Promise<UsageStats> {
  const { start, end } = getCurrentPeriod();
  const limits = parseLimits();

  const [existing] = await db
    .select()
    .from(aiUsageMeters)
    .where(
      and(
        eq(aiUsageMeters.userId, userId),
        gte(aiUsageMeters.periodStart, start),
        lte(aiUsageMeters.periodEnd, end)
      )
    )
    .limit(1);

  if (existing) {
    return {
      assistantCalls: existing.assistantCalls || 0,
      docExtractions: existing.docExtractions || 0,
      exportsGenerated: existing.exportsGenerated || 0,
      limits,
      periodStart: existing.periodStart,
      periodEnd: existing.periodEnd,
    };
  }

  const [newMeter] = await db
    .insert(aiUsageMeters)
    .values({
      userId,
      periodStart: start,
      periodEnd: end,
      assistantCalls: 0,
      docExtractions: 0,
      exportsGenerated: 0,
      limits,
    })
    .returning();

  return {
    assistantCalls: 0,
    docExtractions: 0,
    exportsGenerated: 0,
    limits,
    periodStart: start,
    periodEnd: end,
  };
}

export async function incrementAssistantCalls(userId: number): Promise<boolean> {
  const meter = await getOrCreateMeter(userId);
  if (meter.assistantCalls >= meter.limits.assistantCalls) {
    return false;
  }

  const { start, end } = getCurrentPeriod();
  await db
    .update(aiUsageMeters)
    .set({
      assistantCalls: meter.assistantCalls + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiUsageMeters.userId, userId),
        gte(aiUsageMeters.periodStart, start),
        lte(aiUsageMeters.periodEnd, end)
      )
    );

  return true;
}

export async function incrementDocExtractions(userId: number): Promise<boolean> {
  const meter = await getOrCreateMeter(userId);
  if (meter.docExtractions >= meter.limits.docExtractions) {
    return false;
  }

  const { start, end } = getCurrentPeriod();
  await db
    .update(aiUsageMeters)
    .set({
      docExtractions: meter.docExtractions + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiUsageMeters.userId, userId),
        gte(aiUsageMeters.periodStart, start),
        lte(aiUsageMeters.periodEnd, end)
      )
    );

  return true;
}

export async function incrementExportsGenerated(userId: number): Promise<boolean> {
  const meter = await getOrCreateMeter(userId);
  if (meter.exportsGenerated >= meter.limits.exportsGenerated) {
    return false;
  }

  const { start, end } = getCurrentPeriod();
  await db
    .update(aiUsageMeters)
    .set({
      exportsGenerated: meter.exportsGenerated + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiUsageMeters.userId, userId),
        gte(aiUsageMeters.periodStart, start),
        lte(aiUsageMeters.periodEnd, end)
      )
    );

  return true;
}
