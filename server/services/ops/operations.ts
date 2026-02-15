import crypto from 'crypto';
import { pool } from '../../db';
import { CoinGeckoProvider } from '../mirdt/CoinGeckoProvider';
import { AlphaVantageProvider } from '../mirdt/AlphaVantageProvider';
import { SignalEngine } from '../mirdt/SignalEngine';
import { ConfidenceCalibrator } from '../sentinel/ConfidenceCalibrator';
import { RegimeState, SignalDirection } from '../sentinel/types';

export interface OpResult {
  success: boolean;
  [key: string]: any;
}

export async function markExpired(): Promise<OpResult> {
  const result = await pool.query(
    `UPDATE mirdt_setups
     SET status = 'EXPIRED'
     WHERE status = 'ACTIVE' AND expires_at < NOW()
     RETURNING id`
  );
  return {
    success: true,
    expiredCount: result.rowCount,
    timestamp: new Date().toISOString(),
  };
}

function inferDirection(
  entryZoneLow: number,
  entryZoneHigh: number,
  invalidationPrice: number
): 'LONG' | 'SHORT' {
  if (invalidationPrice < entryZoneLow) return 'LONG';
  if (invalidationPrice > entryZoneHigh) return 'SHORT';
  return 'LONG';
}

function isInvalidated(
  direction: 'LONG' | 'SHORT',
  currentPrice: number,
  invalidationPrice: number
): boolean {
  if (direction === 'LONG') return currentPrice <= invalidationPrice;
  return currentPrice >= invalidationPrice;
}

async function fetchCurrentPrice(
  symbol: string,
  assetType: string,
  coinGecko: CoinGeckoProvider,
  alphaVantage: AlphaVantageProvider
): Promise<number | null> {
  try {
    if (assetType === 'CRYPTO') {
      const bars = await coinGecko.fetchOHLCV(symbol, 1);
      if (bars.length > 0) return bars[bars.length - 1].close;
    } else {
      const bars = await alphaVantage.fetchOHLCV(symbol, 5);
      if (bars.length > 0) return bars[bars.length - 1].close;
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkInvalidations(): Promise<OpResult> {
  const BATCH_LIMIT = 50;
  const activeResult = await pool.query(
    `SELECT id, symbol, asset_type, entry_zone_low, entry_zone_high,
            invalidation_price, rationale_trace_json
     FROM mirdt_setups
     WHERE status = 'ACTIVE'
     ORDER BY created_at ASC
     LIMIT $1`,
    [BATCH_LIMIT]
  );

  const setups = activeResult.rows;
  if (setups.length === 0) {
    return {
      success: true,
      checkedCount: 0,
      invalidatedCount: 0,
      invalidatedIds: [],
      timestamp: new Date().toISOString(),
    };
  }

  const coinGecko = new CoinGeckoProvider();
  const alphaVantage = new AlphaVantageProvider();

  const checkPromises = setups.map(async (setup) => {
    const currentPrice = await fetchCurrentPrice(
      setup.symbol,
      setup.asset_type,
      coinGecko,
      alphaVantage
    );

    if (currentPrice === null) {
      return { id: setup.id, symbol: setup.symbol, status: 'SKIPPED', reason: 'price_unavailable' };
    }

    const entryZoneLow = parseFloat(setup.entry_zone_low);
    const entryZoneHigh = parseFloat(setup.entry_zone_high);
    const invalidationPrice = parseFloat(setup.invalidation_price);

    const direction = inferDirection(entryZoneLow, entryZoneHigh, invalidationPrice);

    if (!isInvalidated(direction, currentPrice, invalidationPrice)) {
      return { id: setup.id, symbol: setup.symbol, status: 'STILL_ACTIVE' };
    }

    const invalidationEntry = {
      ts: new Date().toISOString(),
      event: 'INVALIDATED',
      currentPrice,
      invalidationPrice,
      direction,
      provider: setup.asset_type === 'CRYPTO' ? 'CoinGecko' : 'AlphaVantage',
      reason: direction === 'LONG'
        ? `Price ${currentPrice} breached invalidation level ${invalidationPrice} (below entry zone)`
        : `Price ${currentPrice} breached invalidation level ${invalidationPrice} (above entry zone)`,
    };

    const existingTrace = setup.rationale_trace_json || {};
    const updatedTrace = {
      ...existingTrace,
      invalidation: invalidationEntry,
    };

    await pool.query(
      `UPDATE mirdt_setups
       SET status = 'INVALIDATED', rationale_trace_json = $1
       WHERE id = $2 AND status = 'ACTIVE'`,
      [JSON.stringify(updatedTrace), setup.id]
    );

    return { id: setup.id, symbol: setup.symbol, status: 'INVALIDATED', currentPrice, invalidationPrice };
  });

  const results = await Promise.allSettled(checkPromises);

  const invalidatedIds: string[] = [];
  let checkedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      checkedCount++;
      if (result.value.status === 'INVALIDATED') {
        invalidatedIds.push(result.value.id);
      } else if (result.value.status === 'SKIPPED') {
        skippedCount++;
      }
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  return {
    success: true,
    checkedCount,
    invalidatedCount: invalidatedIds.length,
    invalidatedIds,
    skippedCount,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  };
}

export async function runScan(scanType: string = 'all'): Promise<OpResult> {
  const typeFilter = scanType.toLowerCase();

  const coinGecko = new CoinGeckoProvider();
  const alphaVantage = new AlphaVantageProvider();
  const engine = new SignalEngine();

  let universe: { symbol: string; name: string; assetType: 'CRYPTO' | 'EQUITY'; venue: string }[] = [];

  if (typeFilter === 'all' || typeFilter === 'crypto') {
    const cryptoAssets = await coinGecko.getUniverse();
    universe = universe.concat(cryptoAssets);
  }

  if (typeFilter === 'all' || typeFilter === 'equity') {
    const equityAssets = await alphaVantage.getUniverse();
    universe = universe.concat(equityAssets);
  }

  let assetsScanned = 0;
  let setupsGenerated = 0;
  let errors = 0;

  const activeResult = await pool.query(
    `SELECT DISTINCT symbol FROM mirdt_setups WHERE status = 'ACTIVE'`
  );
  const activeSymbols = new Set(activeResult.rows.map((r: any) => r.symbol));
  let skippedDuplicates = 0;

  for (const asset of universe) {
    try {
      assetsScanned++;

      if (activeSymbols.has(asset.symbol)) {
        skippedDuplicates++;
        continue;
      }

      const provider = asset.assetType === 'CRYPTO' ? coinGecko : alphaVantage;
      const bars = await provider.fetchOHLCV(asset.symbol, 100);

      if (bars.length === 0) {
        errors++;
        continue;
      }

      const result = engine.analyzeAsset(asset.symbol, asset.assetType, asset.venue, bars);

      if (!result) continue;

      const barsString = JSON.stringify(bars);
      const checksum = crypto.createHash('sha256').update(barsString).digest('hex');

      const snapshotResult = await pool.query(
        `INSERT INTO mirdt_data_snapshots (id, created_at, provider, raw_ref, checksum)
         VALUES (gen_random_uuid(), NOW(), $1, $2, $3)
         RETURNING id`,
        [provider.name, JSON.stringify({ checksum }), checksum]
      );
      const snapshotId = snapshotResult.rows[0].id;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + result.horizonDays);

      await pool.query(
        `INSERT INTO mirdt_setups (
          id, created_at, asset_type, symbol, venue, horizon_days,
          entry_zone_low, entry_zone_high, invalidation_price,
          thesis_summary, confidence_score, signal_z,
          expected_p5, expected_p50, expected_p95,
          volatility_estimate, liquidity_notes,
          model_version, data_snapshot_ref, rationale_trace_json,
          status, expires_at
        ) VALUES (
          gen_random_uuid(), NOW(), $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15,
          $16, $17, $18,
          'ACTIVE', $19
        )`,
        [
          result.assetType, result.symbol, result.venue, result.horizonDays,
          result.entryZoneLow, result.entryZoneHigh, result.invalidationPrice,
          result.thesisSummary, result.confidenceScore, result.signalZ,
          result.expectedP5, result.expectedP50, result.expectedP95,
          result.volatilityEstimate, result.liquidityNotes,
          SignalEngine.MODEL_VERSION, snapshotId, JSON.stringify(result.rationaleTrace),
          expiresAt,
        ]
      );

      setupsGenerated++;
    } catch (err) {
      console.error(`[run-scan] Error processing ${asset.symbol}:`, err);
      errors++;
    }
  }

  return {
    success: true,
    assetsScanned,
    setupsGenerated,
    skippedDuplicates,
    errors,
    timestamp: new Date().toISOString(),
  };
}

function classifyRegimeFromSetup(signalZ: number, volatilityEstimate: number): RegimeState {
  if (volatilityEstimate > 0.03) return 'HIGH_VOL_DISLOCATION';
  if (signalZ > 1.5) return 'TREND_UP';
  if (signalZ < -1.5) return 'TREND_DOWN';
  return 'RANGE_LOW_VOL';
}

function deriveDirection(signalZ: number): SignalDirection {
  if (signalZ > 0) return 'LONG';
  if (signalZ < 0) return 'SHORT';
  return 'NEUTRAL';
}

function computeConfirmationScore(signalZ: number, volatilityEstimate: number, confidenceScore: number): number {
  let score = 0;
  if (Math.abs(signalZ) > 2.0) score += 0.3;
  else if (Math.abs(signalZ) > 1.0) score += 0.15;
  if (volatilityEstimate < 0.05) score += 0.2;
  if (volatilityEstimate < 0.02) score += 0.1;
  if (confidenceScore > 70) score += 0.25;
  else if (confidenceScore > 50) score += 0.15;
  score += 0.15;
  return parseFloat(Math.min(1, score).toFixed(4));
}

function regimeBonus(regime: RegimeState, direction: SignalDirection): number {
  if (regime === 'TREND_UP' && direction === 'LONG') return 0.15;
  if (regime === 'TREND_DOWN' && direction === 'SHORT') return 0.15;
  if (regime === 'RANGE_LOW_VOL') return 0.05;
  if (regime === 'HIGH_VOL_DISLOCATION') return -0.1;
  return 0;
}

export async function runSignals(): Promise<OpResult> {
  const calibrator = new ConfidenceCalibrator();

  const setupsResult = await pool.query(
    `SELECT ms.* FROM mirdt_setups ms
     LEFT JOIN sentinel_signals ss ON ss.source_setup_id = ms.id::text
     WHERE ms.status = 'ACTIVE' AND ss.id IS NULL`
  );

  const setups = setupsResult.rows;
  let signalsGenerated = 0;
  let lastRegimeSnapshot: any = null;

  for (const setup of setups) {
    const signalZ = parseFloat(setup.signal_z) || 0;
    const volatilityEstimate = parseFloat(setup.volatility_estimate) || 0.02;
    const confidenceScore = parseFloat(setup.confidence_score) || 50;

    const regime = classifyRegimeFromSetup(signalZ, volatilityEstimate);
    const direction = deriveDirection(signalZ);
    const pRaw = confidenceScore / 100;
    const pCalibrated = calibrator.calibrate(pRaw);
    const confirmationScore = computeConfirmationScore(signalZ, volatilityEstimate, confidenceScore);
    const rBonus = regimeBonus(regime, direction);
    const finalScore = parseFloat(((pCalibrated * 0.4) + (confirmationScore * 0.4) + (rBonus * 0.2)).toFixed(4));

    const entryLow = parseFloat(setup.entry_zone_low) || 0;
    const entryHigh = parseFloat(setup.entry_zone_high) || 0;
    const entryMid = (entryLow + entryHigh) / 2;

    await pool.query(
      `INSERT INTO sentinel_signals (
        id, created_at, symbol, asset_type, timeframe, horizon_days,
        direction, entry_zone_low, entry_zone_high, entry_mid, invalidation_level,
        p_raw, p_calibrated, regime_state, confirmation_score, final_score,
        vol_estimate, model_version, source_setup_id, rationale_json,
        qualified, qualified_at
      ) VALUES (
        gen_random_uuid(), NOW(), $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        false, NULL
      )`,
      [
        setup.symbol, setup.asset_type, '1D', setup.horizon_days,
        direction, entryLow, entryHigh, entryMid, parseFloat(setup.invalidation_price) || 0,
        parseFloat(pRaw.toFixed(4)), pCalibrated, regime, confirmationScore, finalScore,
        volatilityEstimate, 'sentinel-v1', setup.id.toString(),
        JSON.stringify({ sourceSetup: setup.id, signalZ, confidenceScore, regime, direction }),
      ]
    );

    signalsGenerated++;

    const regimeConfidence = regime === 'HIGH_VOL_DISLOCATION' ? 0.8 : regime === 'RANGE_LOW_VOL' ? 0.5 : 0.7;
    lastRegimeSnapshot = {
      regime,
      confidence: regimeConfidence,
      sma20Slope: 0,
      sma50Slope: 0,
      volatility20d: volatilityEstimate,
      volatilityRatio: 1,
      breadthScore: 0.5,
    };
  }

  if (lastRegimeSnapshot) {
    await pool.query(
      `INSERT INTO sentinel_regime_snapshots (
        id, created_at, regime, confidence, sma20_slope, sma50_slope,
        volatility_20d, volatility_ratio, breadth_score, snapshot_json
      ) VALUES (
        gen_random_uuid(), NOW(), $1, $2, $3, $4,
        $5, $6, $7, $8
      )`,
      [
        lastRegimeSnapshot.regime, lastRegimeSnapshot.confidence,
        lastRegimeSnapshot.sma20Slope, lastRegimeSnapshot.sma50Slope,
        lastRegimeSnapshot.volatility20d, lastRegimeSnapshot.volatilityRatio,
        lastRegimeSnapshot.breadthScore, JSON.stringify(lastRegimeSnapshot),
      ]
    );
  }

  return {
    success: true,
    signalsGenerated,
    regimeSnapshot: lastRegimeSnapshot,
  };
}

export interface StepResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
}

const ALL_STEPS: Record<string, (scanType: string) => Promise<OpResult>> = {
  'mark-expired': () => markExpired(),
  'check-invalidations': () => checkInvalidations(),
  'run-scan': (scanType: string) => runScan(scanType),
  'run-signals': () => runSignals(),
};

const DEFAULT_STEPS = ['mark-expired', 'check-invalidations', 'run-scan', 'run-signals'];

export async function runFullCycle(
  scanType: string = 'all',
  customSteps?: string[]
): Promise<{
  success: boolean;
  cycleComplete: boolean;
  totalDurationMs: number;
  results: StepResult[];
  timestamp: string;
}> {
  const cycleStart = Date.now();
  const results: StepResult[] = [];

  const stepNames = customSteps && customSteps.length > 0 ? customSteps : DEFAULT_STEPS;
  const steps = stepNames
    .filter(name => ALL_STEPS[name])
    .map(name => ({ name, fn: () => ALL_STEPS[name](scanType) }));

  for (const step of steps) {
    const start = Date.now();
    try {
      const data = await step.fn();
      results.push({
        step: step.name,
        success: data.success,
        data,
        durationMs: Date.now() - start,
      });

      if (!data.success && (step.name === 'run-scan' || step.name === 'mark-expired')) {
        break;
      }
    } catch (err: any) {
      results.push({
        step: step.name,
        success: false,
        error: err.message || 'Unknown error',
        durationMs: Date.now() - start,
      });
      if (step.name === 'run-scan' || step.name === 'mark-expired') {
        break;
      }
    }
  }

  const allSuccess = results.every(r => r.success);

  return {
    success: allSuccess,
    cycleComplete: true,
    totalDurationMs: Date.now() - cycleStart,
    results,
    timestamp: new Date().toISOString(),
  };
}
