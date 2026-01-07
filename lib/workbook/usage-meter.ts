import { pool } from '../../server/db';

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

  const result = await pool.query(
    `SELECT * FROM ai_usage_meters 
     WHERE user_id = $1 AND period_start >= $2 AND period_end <= $3 
     LIMIT 1`,
    [userId, start, end]
  );
  const existing = result.rows[0];

  if (existing) {
    return {
      assistantCalls: existing.assistant_calls || 0,
      docExtractions: existing.doc_extractions || 0,
      exportsGenerated: existing.exports_generated || 0,
      limits,
      periodStart: existing.period_start,
      periodEnd: existing.period_end,
    };
  }

  const insertResult = await pool.query(
    `INSERT INTO ai_usage_meters (user_id, period_start, period_end, assistant_calls, doc_extractions, exports_generated, limits)
     VALUES ($1, $2, $3, 0, 0, 0, $4)
     RETURNING *`,
    [userId, start, end, JSON.stringify(limits)]
  );

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
  await pool.query(
    `UPDATE ai_usage_meters 
     SET assistant_calls = assistant_calls + 1, updated_at = NOW()
     WHERE user_id = $1 AND period_start >= $2 AND period_end <= $3`,
    [userId, start, end]
  );

  return true;
}

export async function incrementDocExtractions(userId: number): Promise<boolean> {
  const meter = await getOrCreateMeter(userId);
  if (meter.docExtractions >= meter.limits.docExtractions) {
    return false;
  }

  const { start, end } = getCurrentPeriod();
  await pool.query(
    `UPDATE ai_usage_meters 
     SET doc_extractions = doc_extractions + 1, updated_at = NOW()
     WHERE user_id = $1 AND period_start >= $2 AND period_end <= $3`,
    [userId, start, end]
  );

  return true;
}

export async function incrementExportsGenerated(userId: number): Promise<boolean> {
  const meter = await getOrCreateMeter(userId);
  if (meter.exportsGenerated >= meter.limits.exportsGenerated) {
    return false;
  }

  const { start, end } = getCurrentPeriod();
  await pool.query(
    `UPDATE ai_usage_meters 
     SET exports_generated = exports_generated + 1, updated_at = NOW()
     WHERE user_id = $1 AND period_start >= $2 AND period_end <= $3`,
    [userId, start, end]
  );

  return true;
}
