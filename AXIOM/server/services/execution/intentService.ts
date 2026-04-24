import { pool } from '../../db';
import { appendAuditEventInTransaction } from '../../audit/hashChain';

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

export interface CreateIntentInput {
  userId: string;
  setupId: string;
  symbol: string;
  assetClass: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice?: number;
  invalidationPrice?: number;
  isLive?: boolean;
}

export interface CreateIntentResult {
  success: boolean;
  intentId?: string;
  status?: string;
  rejectionReason?: string;
  error?: string;
}

async function enforceGating(
  client: any,
  userId: string,
  isLive: boolean
): Promise<{ allowed: boolean; reason?: string; profile?: any; policyMode?: any; tier?: any }> {
  const profileResult = await client.query(
    `SELECT * FROM gef_user_execution_profiles WHERE user_id = $1`,
    [userId]
  );
  if (profileResult.rows.length === 0) {
    return { allowed: false, reason: 'No execution profile found. Register first.' };
  }
  const profile = profileResult.rows[0];

  if (profile.execution_suspended) {
    return { allowed: false, reason: `Execution suspended: ${profile.suspension_reason || 'Administrative hold'}` };
  }

  const policyResult = await client.query(
    `SELECT * FROM gef_policy_modes WHERE mode_id = $1`,
    [profile.current_policy_mode]
  );
  const policyMode = policyResult.rows[0];
  if (!policyMode) {
    return { allowed: false, reason: 'Policy mode not configured' };
  }

  if (!policyMode.is_execution_enabled) {
    return { allowed: false, reason: `Execution disabled under ${policyMode.name} policy mode` };
  }

  const tierResult = await client.query(
    `SELECT * FROM gef_tier_thresholds WHERE tier_id = $1`,
    [profile.current_tier_id]
  );
  const tier = tierResult.rows[0];
  if (!tier) {
    return { allowed: false, reason: 'Tier configuration not found' };
  }

  if (isLive) {
    if (!profile.live_enabled) {
      return { allowed: false, reason: 'Live execution not enabled. Complete paper qualification first.' };
    }
    if (!tier.execution_enabled) {
      return { allowed: false, reason: `Live execution not available at ${tier.name} tier` };
    }
  }

  const openIntents = await client.query(
    `SELECT COUNT(*) as cnt FROM gef_execution_intents
     WHERE user_id = $1 AND status IN ('PENDING', 'OPEN')`,
    [userId]
  );
  const maxConcurrent = tier.max_concurrent_positions || 5;
  if (safeNum(openIntents.rows[0].cnt) >= maxConcurrent) {
    return { allowed: false, reason: `Maximum concurrent positions reached (${maxConcurrent})` };
  }

  return { allowed: true, profile, policyMode, tier };
}

function computePositionSizing(
  entryPrice: number,
  stopPrice: number,
  riskBudget: number,
  policyMode: any,
  tier: any
): { stopDistance: number; positionSize: number; adjustedRiskBudget: number } {
  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance <= 0) {
    return { stopDistance: 0, positionSize: 0, adjustedRiskBudget: 0 };
  }

  const sizeMult = safeNum(policyMode.global_size_multiplier, 1);
  const adjustedRiskBudget = riskBudget * sizeMult;
  const positionSize = adjustedRiskBudget / stopDistance;

  return { stopDistance, positionSize, adjustedRiskBudget };
}

export async function createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isLive = input.isLive === true;
    const gating = await enforceGating(client, input.userId, isLive);

    if (!gating.allowed) {
      const rejectedIntent = await client.query(
        `INSERT INTO gef_execution_intents
          (user_id, symbol, asset_class, signal_id, regime_id, policy_mode,
           direction, entry_price, stop_price, take_profit_price, invalidation_price,
           stop_distance, risk_budget_axusd, position_size, is_live, status, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0, 0, $12, 'REJECTED', $13)
         RETURNING intent_id`,
        [
          input.userId, input.symbol, input.assetClass, input.setupId,
          gating.profile?.last_regime_id || null,
          gating.profile?.current_policy_mode || 'BOOTSTRAP',
          input.direction, input.entryPrice, input.stopPrice,
          input.takeProfitPrice || null, input.invalidationPrice || null,
          isLive, gating.reason,
        ]
      );

      const intentId = rejectedIntent.rows[0].intent_id;
      await appendAuditEventInTransaction(client, 'INTENT', intentId, 'INTENT_REJECTED', {
        userId: input.userId,
        symbol: input.symbol,
        reason: gating.reason,
        isLive,
      });

      await client.query('COMMIT');
      return { success: false, intentId, status: 'REJECTED', rejectionReason: gating.reason };
    }

    const { profile, policyMode, tier } = gating;
    const portfolioCapital = safeNum(profile.risk_budget_axusd, 0);
    const defaultCapital = 10000;
    const baseCapital = portfolioCapital > 0 ? portfolioCapital : defaultCapital;
    const riskFraction = safeNum(policyMode.risk_fraction_default, 0.01);
    const riskBudget = baseCapital * riskFraction;
    const { stopDistance, positionSize, adjustedRiskBudget } = computePositionSizing(
      input.entryPrice, input.stopPrice, riskBudget, policyMode, tier
    );

    if (positionSize <= 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Position size computed as zero. Check stop distance.' };
    }

    const intentResult = await client.query(
      `INSERT INTO gef_execution_intents
        (user_id, symbol, asset_class, signal_id, regime_id, policy_mode,
         direction, entry_price, stop_price, take_profit_price, invalidation_price,
         stop_distance, risk_budget_axusd, position_size, is_live, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING')
       RETURNING intent_id`,
      [
        input.userId, input.symbol, input.assetClass, input.setupId,
        profile.last_regime_id || null, profile.current_policy_mode,
        input.direction, input.entryPrice, input.stopPrice,
        input.takeProfitPrice || null, input.invalidationPrice || null,
        stopDistance, adjustedRiskBudget, positionSize, isLive,
      ]
    );

    const intentId = intentResult.rows[0].intent_id;

    await appendAuditEventInTransaction(client, 'INTENT', intentId, 'INTENT_CREATED', {
      userId: input.userId,
      symbol: input.symbol,
      assetClass: input.assetClass,
      direction: input.direction,
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice,
      takeProfitPrice: input.takeProfitPrice || null,
      stopDistance,
      riskBudgetAxusd: adjustedRiskBudget,
      positionSize,
      isLive,
      tierId: profile.current_tier_id,
      policyMode: profile.current_policy_mode,
    });

    await client.query('COMMIT');
    return { success: true, intentId, status: 'PENDING' };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
