import { pool } from '../../db';
import { CoinGeckoProvider } from '../mirdt/CoinGeckoProvider';
import { AlphaVantageProvider } from '../mirdt/AlphaVantageProvider';
import type {
  SetupInput,
  PortfolioState,
  ExecutionRunResult,
  ExecutionDecision,
  DecisionTrace,
  PolicyMode,
  EventType,
} from './types';
import {
  DEFAULT_RISK_FRACTION_BPS,
  MAX_CONCURRENT_TRADES,
  DRAWDOWN_BRAKE_BPS,
  MODEL_VERSION,
  VOL_MULT,
  LIQ_MULT,
} from './constants';
import { inferDirection, classifyLiquidityTier, classifyRegimeTier, computeEligibility } from './eligibility';
import { computeGradeComponents, mapGrade, computeConfidenceMultiplier } from './math';
import { computeSizing } from './sizing';
import { classifyEntryTrigger, isEntryAllowed } from './triggers';
import { computeDecisionChecksum, computeRunChecksum, computeEventChecksum } from './audit';
import { checkInvalidation, checkExpiry } from './exits';

export async function getLatestPortfolioState(): Promise<PortfolioState> {
  const result = await pool.query(
    `SELECT * FROM mirdt_portfolio_state WHERE is_active = true ORDER BY created_at DESC LIMIT 1`
  );

  if (result.rows.length === 0) {
    return {
      portfolioCapitalUsd: 10000,
      riskFractionBps: DEFAULT_RISK_FRACTION_BPS,
      maxConcurrentTrades: MAX_CONCURRENT_TRADES,
      maxPerAssetExposureBps: 2000,
      drawdownBrakeBps: DRAWDOWN_BRAKE_BPS,
      systemVolatilityTier: 'NORMAL',
      policyMode: 'BOOTSTRAP' as PolicyMode,
      globalSizeMultiplier: 1.0,
    };
  }

  const row = result.rows[0];
  return {
    portfolioCapitalUsd: parseFloat(row.portfolio_capital_usd),
    riskFractionBps: row.risk_fraction_bps,
    maxConcurrentTrades: row.max_concurrent_trades,
    maxPerAssetExposureBps: row.max_per_asset_exposure_bps,
    drawdownBrakeBps: row.drawdown_brake_bps,
    systemVolatilityTier: row.system_volatility_tier,
    policyMode: row.policy_mode as PolicyMode,
    globalSizeMultiplier: parseFloat(row.global_size_multiplier),
  };
}

export async function upsertPortfolioState(state: PortfolioState): Promise<string> {
  const result = await pool.query(
    `INSERT INTO mirdt_portfolio_state (
      portfolio_capital_usd, risk_fraction_bps, max_concurrent_trades,
      max_per_asset_exposure_bps, drawdown_brake_bps, system_volatility_tier,
      policy_mode, global_size_multiplier
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      state.portfolioCapitalUsd,
      state.riskFractionBps,
      state.maxConcurrentTrades,
      state.maxPerAssetExposureBps,
      state.drawdownBrakeBps,
      state.systemVolatilityTier,
      state.policyMode,
      state.globalSizeMultiplier,
    ]
  );
  return result.rows[0].id;
}

export async function getLatestDecision(setupId: string): Promise<ExecutionDecision | null> {
  const result = await pool.query(
    `SELECT * FROM mirdt_execution_decisions WHERE setup_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [setupId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    runId: row.run_id,
    setupId: row.setup_id,
    snapshotId: row.snapshot_id,
    symbol: row.symbol,
    assetType: row.asset_type,
    direction: row.direction,
    currentPrice: parseFloat(row.current_price),
    signalZ: parseFloat(row.signal_z),
    volatilityEstimate: parseFloat(row.volatility_estimate),
    confidenceScore: row.confidence_score,
    liquidityTier: row.liquidity_tier,
    regimeTier: row.regime_tier,
    grade: row.grade,
    gradeSignalScore: parseFloat(row.grade_signal_score),
    gradeAsymmetryScore: parseFloat(row.grade_asymmetry_score),
    gradeRegimeScore: parseFloat(row.grade_regime_score),
    gradeLiquidityScore: parseFloat(row.grade_liquidity_score),
    gradeTotal: parseFloat(row.grade_total),
    eligibilityStatus: row.eligibility_status,
    eligibilityReasonCodes: row.eligibility_reason_codes,
    riskFractionBps: row.risk_fraction_bps,
    riskBudgetUsd: parseFloat(row.risk_budget_usd),
    invalidationDistance: parseFloat(row.invalidation_distance),
    positionSizeQty: parseFloat(row.position_size_qty),
    positionNotionalUsd: parseFloat(row.position_notional_usd),
    stopPrice: parseFloat(row.stop_price),
    takeProfitP50: parseFloat(row.take_profit_p50),
    takeProfitP95: parseFloat(row.take_profit_p95),
    entryTrigger: row.entry_trigger,
    entryAllowed: row.entry_allowed,
    policyMode: row.policy_mode,
    decisionChecksum: row.decision_checksum,
    decisionTrace: row.decision_trace,
    modelVersion: row.model_version,
    createdAt: row.created_at,
  };
}

function parseSetupRow(row: any): SetupInput {
  return {
    id: row.id,
    symbol: row.symbol,
    assetType: row.asset_type,
    entryZoneLow: parseFloat(row.entry_zone_low),
    entryZoneHigh: parseFloat(row.entry_zone_high),
    invalidationPrice: parseFloat(row.invalidation_price),
    signalZ: parseFloat(row.signal_z),
    volatilityEstimate: parseFloat(row.volatility_estimate),
    confidenceScore: row.confidence_score,
    expectedP5: parseFloat(row.expected_p5),
    expectedP50: parseFloat(row.expected_p50),
    expectedP95: parseFloat(row.expected_p95),
    horizonDays: row.horizon_days,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    status: row.status,
    liquidityNotes: row.liquidity_notes ?? '',
  };
}

async function insertEvent(
  eventType: EventType,
  setupId: string,
  decisionId: string | null,
  runId: string,
  eventData: object
): Promise<void> {
  const now = new Date().toISOString();
  const checksum = computeEventChecksum(eventType, setupId, eventData, now);
  await pool.query(
    `INSERT INTO mirdt_execution_events (event_type, setup_id, decision_id, run_id, event_data, event_checksum, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [eventType, setupId, decisionId, runId, JSON.stringify(eventData), checksum, now]
  );
}

export async function runExecutionBatch(
  runType: 'ON_DEMAND' | 'SCHEDULED'
): Promise<ExecutionRunResult> {
  const startedAt = new Date();

  const checksum = computeRunChecksum('pending', []);
  const runResult = await pool.query(
    `INSERT INTO mirdt_execution_runs (run_type, started_at, checksum)
     VALUES ($1, $2, $3) RETURNING id`,
    [runType, startedAt, checksum]
  );
  const runId = runResult.rows[0].id;

  const portfolioState = await getLatestPortfolioState();

  const setupsResult = await pool.query(
    `SELECT * FROM mirdt_setups WHERE status = 'ACTIVE'`
  );
  const setups = setupsResult.rows.map(parseSetupRow);

  const coinGecko = new CoinGeckoProvider();
  const alphaVantage = new AlphaVantageProvider();

  let setupsEvaluated = 0;
  let decisionsCreated = 0;
  let decisionsRejected = 0;
  let decisionsWait = 0;
  let errors = 0;
  const decisionChecksums: string[] = [];

  for (const setup of setups) {
    try {
      setupsEvaluated++;

      const provider = setup.assetType === 'CRYPTO' ? coinGecko : alphaVantage;
      const bars = await provider.fetchOHLCV(setup.symbol, 1);

      if (!bars || bars.length === 0) {
        console.log(`[MIRDTExecution] No price data for ${setup.symbol}, skipping`);
        errors++;
        continue;
      }

      const currentPrice = bars[bars.length - 1].close;
      if (!currentPrice || currentPrice <= 0) {
        console.log(`[MIRDTExecution] Invalid price for ${setup.symbol}: ${currentPrice}, skipping`);
        errors++;
        continue;
      }

      const direction = inferDirection(
        setup.entryZoneLow,
        setup.entryZoneHigh,
        setup.invalidationPrice,
        setup.signalZ
      );

      const liquidityTier = classifyLiquidityTier(setup.liquidityNotes, setup.volatilityEstimate);
      const regimeTier = classifyRegimeTier(setup.volatilityEstimate, setup.signalZ);

      const invalidationDistance = Math.abs(currentPrice - setup.invalidationPrice);
      const rewardDistance = direction === 'LONG'
        ? (setup.expectedP50 || currentPrice * 1.02) - currentPrice
        : currentPrice - (setup.expectedP50 || currentPrice * 0.98);
      const asymmetryRatio = invalidationDistance > 0 ? Math.abs(rewardDistance) / invalidationDistance : 0;

      const gradeComponents = computeGradeComponents(
        setup.signalZ,
        asymmetryRatio,
        regimeTier,
        liquidityTier
      );
      const grade = mapGrade(gradeComponents.total, setup.signalZ);

      const eligibility = computeEligibility(setup, grade, portfolioState.policyMode, regimeTier, liquidityTier);

      const atr = setup.volatilityEstimate * currentPrice;

      const sizing = computeSizing({
        currentPrice,
        invalidationPrice: setup.invalidationPrice,
        atr,
        confidenceScore: setup.confidenceScore,
        portfolio: portfolioState,
        direction,
        regimeTier,
        liquidityTier,
        expectedP50: setup.expectedP50,
        expectedP95: setup.expectedP95,
      });

      const entryTrigger = classifyEntryTrigger({
        currentPrice,
        entryZoneLow: setup.entryZoneLow,
        entryZoneHigh: setup.entryZoneHigh,
        signalZ: setup.signalZ,
        regimeTier,
      });

      const entryAllowed = isEntryAllowed(
        eligibility.status,
        grade,
        portfolioState.policyMode,
        regimeTier,
        liquidityTier
      );

      const checksum = computeDecisionChecksum({
        setupId: setup.id,
        snapshotId: null,
        currentPrice,
        signalZ: setup.signalZ,
        volatilityEstimate: setup.volatilityEstimate,
        liquidityTier,
        regimeTier,
        grade,
        riskFractionBps: sizing.riskFractionBps,
        positionSizeQty: sizing.positionSizeQty,
        stopPrice: sizing.stopPrice,
        takeProfitP50: sizing.takeProfitP50,
        takeProfitP95: sizing.takeProfitP95,
        policyMode: portfolioState.policyMode,
        direction,
      });

      decisionChecksums.push(checksum);

      const volMult = VOL_MULT[regimeTier] ?? 1.0;
      const confMult = computeConfidenceMultiplier(setup.confidenceScore);
      const liqMult = LIQ_MULT[liquidityTier] ?? 0;

      const trace: DecisionTrace = {
        setupId: setup.id,
        symbol: setup.symbol,
        assetType: setup.assetType,
        currentPrice,
        signalZ: setup.signalZ,
        volatilityEstimate: setup.volatilityEstimate,
        confidenceScore: setup.confidenceScore,
        entryZoneLow: setup.entryZoneLow,
        entryZoneHigh: setup.entryZoneHigh,
        invalidationPrice: setup.invalidationPrice,
        expectedP5: setup.expectedP5,
        expectedP50: setup.expectedP50,
        expectedP95: setup.expectedP95,
        direction,
        liquidityTier,
        regimeTier,
        gradeComponents,
        grade,
        eligibilityStatus: eligibility.status,
        eligibilityReasonCodes: eligibility.reasonCodes,
        riskFractionBps: sizing.riskFractionBps,
        riskBudgetUsd: sizing.riskBudgetUsd,
        invalidationDistance: sizing.invalidationDistance,
        positionSizeQty: sizing.positionSizeQty,
        positionNotionalUsd: sizing.positionNotionalUsd,
        stopPrice: sizing.stopPrice,
        takeProfitP50: sizing.takeProfitP50,
        takeProfitP95: sizing.takeProfitP95,
        entryTrigger,
        entryAllowed,
        policyMode: portfolioState.policyMode,
        volMult,
        confMult,
        liqMult,
        globalSizeMultiplier: portfolioState.globalSizeMultiplier,
        modelVersion: MODEL_VERSION,
        timestamp: new Date().toISOString(),
      };

      const decisionResult = await pool.query(
        `INSERT INTO mirdt_execution_decisions (
          run_id, setup_id, snapshot_id, symbol, asset_type, direction,
          current_price, signal_z, volatility_estimate, confidence_score,
          liquidity_tier, regime_tier, grade,
          grade_signal_score, grade_asymmetry_score, grade_regime_score, grade_liquidity_score, grade_total,
          eligibility_status, eligibility_reason_codes,
          risk_fraction_bps, risk_budget_usd, invalidation_distance,
          position_size_qty, position_notional_usd,
          stop_price, take_profit_p50, take_profit_p95,
          entry_trigger, entry_allowed, policy_mode,
          decision_checksum, decision_trace, model_version
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20,
          $21, $22, $23,
          $24, $25,
          $26, $27, $28,
          $29, $30, $31,
          $32, $33, $34
        ) RETURNING id`,
        [
          runId, setup.id, null, setup.symbol, setup.assetType, direction,
          currentPrice, setup.signalZ, setup.volatilityEstimate, setup.confidenceScore,
          liquidityTier, regimeTier, grade,
          gradeComponents.signalScore, gradeComponents.asymmetryScore, gradeComponents.regimeScore, gradeComponents.liquidityScore, gradeComponents.total,
          eligibility.status, JSON.stringify(eligibility.reasonCodes),
          sizing.riskFractionBps, sizing.riskBudgetUsd, sizing.invalidationDistance,
          sizing.positionSizeQty, sizing.positionNotionalUsd,
          sizing.stopPrice, sizing.takeProfitP50, sizing.takeProfitP95,
          entryTrigger, entryAllowed, portfolioState.policyMode,
          checksum, JSON.stringify(trace), MODEL_VERSION,
        ]
      );
      const decisionId = decisionResult.rows[0].id;

      let eventType: EventType;
      if (eligibility.status === 'REJECTED') {
        eventType = 'DECISION_REJECTED';
        decisionsRejected++;
      } else if (eligibility.status === 'WAIT') {
        eventType = 'DECISION_WAIT';
        decisionsWait++;
      } else {
        eventType = 'DECISION_CREATED';
        decisionsCreated++;
      }

      await insertEvent(eventType, setup.id, decisionId, runId, {
        grade,
        eligibilityStatus: eligibility.status,
        reasonCodes: eligibility.reasonCodes,
        direction,
        entryAllowed,
      });

      if (checkInvalidation(currentPrice, setup.invalidationPrice, direction)) {
        await pool.query(
          `UPDATE mirdt_setups SET status = 'INVALIDATED' WHERE id = $1`,
          [setup.id]
        );
        await insertEvent('INVALIDATED', setup.id, decisionId, runId, {
          currentPrice,
          invalidationPrice: setup.invalidationPrice,
          direction,
        });
      }

      if (setup.expiresAt && checkExpiry(setup.expiresAt)) {
        await pool.query(
          `UPDATE mirdt_setups SET status = 'EXPIRED' WHERE id = $1`,
          [setup.id]
        );
        await insertEvent('EXPIRED', setup.id, decisionId, runId, {
          expiresAt: setup.expiresAt.toISOString(),
          currentTime: new Date().toISOString(),
        });
      }

    } catch (err) {
      console.error(`[MIRDTExecution] Error processing setup ${setup.id} (${setup.symbol}):`, err);
      errors++;
    }
  }

  const finishedAt = new Date();
  const runChecksum = computeRunChecksum(runId, decisionChecksums);

  await pool.query(
    `UPDATE mirdt_execution_runs SET
      finished_at = $1,
      processed_count = $2,
      eligible_count = $3,
      authorized_count = 0,
      opened_count = 0,
      invalidated_count = 0,
      expired_count = 0,
      failed_count = $4,
      checksum = $5
    WHERE id = $6`,
    [finishedAt, setupsEvaluated, decisionsCreated, errors, runChecksum, runId]
  );

  return {
    runId,
    runType,
    startedAt,
    finishedAt,
    setupsEvaluated,
    decisionsCreated,
    decisionsRejected,
    decisionsWait,
    errors,
    runChecksum,
  };
}

export async function authorizeDecision(decisionId: string): Promise<{ success: boolean; error?: string }> {
  const result = await pool.query(
    `SELECT * FROM mirdt_execution_decisions WHERE id = $1`,
    [decisionId]
  );
  if (result.rows.length === 0) return { success: false, error: 'Decision not found' };

  const row = result.rows[0];

  if (row.eligibility_status === 'REJECTED') {
    return { success: false, error: 'Cannot authorize a REJECTED decision' };
  }
  if (!row.entry_allowed) {
    return { success: false, error: 'Entry not allowed for this decision' };
  }

  const openTradesResult = await pool.query(
    `SELECT COUNT(*) FROM mirdt_paper_trades WHERE status = 'OPEN'`
  );
  const openCount = parseInt(openTradesResult.rows[0].count);
  const portfolio = await getLatestPortfolioState();
  if (openCount >= portfolio.maxConcurrentTrades) {
    return { success: false, error: `Max concurrent trades (${portfolio.maxConcurrentTrades}) reached` };
  }

  const dupResult = await pool.query(
    `SELECT COUNT(*) FROM mirdt_paper_trades WHERE setup_id = $1 AND status = 'OPEN'`,
    [row.setup_id]
  );
  if (parseInt(dupResult.rows[0].count) > 0) {
    return { success: false, error: 'An open trade already exists for this setup' };
  }

  await insertEvent('AUTHORIZED', row.setup_id, decisionId, row.run_id, {
    grade: row.grade,
    direction: row.direction,
    positionSizeQty: parseFloat(row.position_size_qty),
    positionNotionalUsd: parseFloat(row.position_notional_usd),
  });

  return { success: true };
}

export async function openPaperTrade(decisionId: string): Promise<{ success: boolean; tradeId?: string; error?: string }> {
  const result = await pool.query(
    `SELECT * FROM mirdt_execution_decisions WHERE id = $1`,
    [decisionId]
  );
  if (result.rows.length === 0) return { success: false, error: 'Decision not found' };

  const row = result.rows[0];

  const existingTrade = await pool.query(
    `SELECT id FROM mirdt_paper_trades WHERE decision_id = $1`,
    [decisionId]
  );
  if (existingTrade.rows.length > 0) {
    return { success: false, error: 'Paper trade already exists for this decision' };
  }

  const tradeResult = await pool.query(
    `INSERT INTO mirdt_paper_trades (
      setup_id, decision_id, direction, opened_at, entry_price, quantity, status
    ) VALUES ($1, $2, $3, NOW(), $4, $5, 'OPEN')
    RETURNING id`,
    [
      row.setup_id,
      decisionId,
      row.direction,
      parseFloat(row.current_price),
      parseFloat(row.position_size_qty),
    ]
  );

  const tradeId = tradeResult.rows[0].id;

  await insertEvent('OPENED', row.setup_id, decisionId, row.run_id, {
    tradeId,
    entryPrice: parseFloat(row.current_price),
    quantity: parseFloat(row.position_size_qty),
    direction: row.direction,
  });

  return { success: true, tradeId };
}

export async function closePaperTrade(
  tradeId: string,
  exitPrice: number,
  exitReason: string
): Promise<{ success: boolean; error?: string }> {
  const result = await pool.query(
    `SELECT * FROM mirdt_paper_trades WHERE id = $1`,
    [tradeId]
  );
  if (result.rows.length === 0) return { success: false, error: 'Trade not found' };

  const trade = result.rows[0];
  if (trade.status !== 'OPEN') return { success: false, error: 'Trade is not open' };

  const entryPrice = parseFloat(trade.entry_price);
  const quantity = parseFloat(trade.quantity);
  const direction = trade.direction;

  const pnl = direction === 'LONG'
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;
  const pnlPct = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 * (direction === 'SHORT' ? -1 : 1) : 0;
  const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

  await pool.query(
    `UPDATE mirdt_paper_trades SET
      status = 'CLOSED',
      closed_at = NOW(),
      exit_price = $1,
      exit_reason = $2,
      pnl = $3,
      pnl_pct = $4,
      outcome = $5
    WHERE id = $6`,
    [exitPrice, exitReason, pnl, pnlPct, outcome, tradeId]
  );

  await insertEvent('CLOSED', trade.setup_id, trade.decision_id, null, {
    tradeId,
    exitPrice,
    exitReason,
    pnl,
    pnlPct,
    outcome,
  });

  return { success: true };
}

export async function emergencyExitAll(): Promise<{ closed: number; errors: number }> {
  const openTrades = await pool.query(
    `SELECT t.*, d.current_price, d.symbol FROM mirdt_paper_trades t
     LEFT JOIN mirdt_execution_decisions d ON t.decision_id = d.id
     WHERE t.status = 'OPEN'`
  );

  let closed = 0;
  let errors = 0;

  for (const trade of openTrades.rows) {
    try {
      const exitPrice = parseFloat(trade.current_price) || parseFloat(trade.entry_price);
      const result = await closePaperTrade(trade.id, exitPrice, 'EMERGENCY_EXIT');
      if (result.success) {
        closed++;
        await insertEvent('EMERGENCY_EXIT', trade.setup_id, trade.decision_id, null, {
          tradeId: trade.id,
          exitPrice,
          reason: 'Manual emergency exit all',
        });
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  return { closed, errors };
}

export async function getPaperTrades(status?: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: any[] = [];
  let paramIdx = 1;

  if (status) {
    whereClause = `WHERE t.status = $${paramIdx++}`;
    params.push(status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM mirdt_paper_trades t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT t.*, d.symbol, d.asset_type, d.grade, d.entry_trigger, d.policy_mode,
            d.stop_price, d.take_profit_p50, d.take_profit_p95
     FROM mirdt_paper_trades t
     LEFT JOIN mirdt_execution_decisions d ON t.decision_id = d.id
     ${whereClause}
     ORDER BY t.opened_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    trades: result.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function checkPaperTradeInvalidations(): Promise<{ checked: number; invalidated: number }> {
  const openTrades = await pool.query(
    `SELECT t.*, d.symbol, d.direction, d.stop_price
     FROM mirdt_paper_trades t
     LEFT JOIN mirdt_execution_decisions d ON t.decision_id = d.id
     WHERE t.status = 'OPEN'`
  );

  let checked = 0;
  let invalidated = 0;

  for (const trade of openTrades.rows) {
    checked++;
    const stopPrice = parseFloat(trade.stop_price);
    const entryPrice = parseFloat(trade.entry_price);
    const direction = trade.direction;

    const breached = direction === 'LONG'
      ? entryPrice <= stopPrice
      : entryPrice >= stopPrice;

    if (breached) {
      await closePaperTrade(trade.id, stopPrice, 'STOP_HIT');
      invalidated++;
    }
  }

  return { checked, invalidated };
}
