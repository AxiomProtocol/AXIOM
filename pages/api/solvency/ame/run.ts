import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import {
  buildEvaluation,
  DEFAULT_AME_CONFIG,
} from '../../../../lib/ame';
import type { AMEInput, LiabilityMode } from '../../../../lib/ame';

const { createHash } = require('crypto');

function computeChecksum(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

function clampValue(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

async function ensureTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ame_input_snapshots (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL,
      raw_json JSONB NOT NULL,
      source_version TEXT NOT NULL,
      mode TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ame_evaluations (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      model_version TEXT NOT NULL,
      input_snapshot_id VARCHAR NOT NULL,
      regime_band TEXT NOT NULL,
      rs DECIMAL(6,4) NOT NULL,
      pm DECIMAL(6,4) NOT NULL,
      cr DECIMAL(18,8) NOT NULL,
      rr DECIMAL(18,8) NOT NULL,
      lbr DECIMAL(18,8) NOT NULL,
      ld DECIMAL(18,8) NOT NULL,
      cr_target DECIMAL(18,8) NOT NULL,
      rr_target DECIMAL(18,8) NOT NULL,
      lbr_target DECIMAL(18,8) NOT NULL,
      ld_target DECIMAL(18,8) NOT NULL,
      payout_factor DECIMAL(6,4) NOT NULL,
      actions_json JSONB NOT NULL,
      disclosure_json JSONB NOT NULL,
      status TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ame_metrics_timeseries (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      metric_key TEXT NOT NULL,
      ts TIMESTAMP NOT NULL,
      value DECIMAL(24,10) NOT NULL,
      evaluation_id VARCHAR NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ame_eval_created_idx ON ame_evaluations(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ame_ts_metric_ts_idx ON ame_metrics_timeseries(metric_key, ts)`);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body || {};
    let ameInput: AMEInput;

    if (body.treasuryCapitalUsd !== undefined) {
      ameInput = {
        treasuryCapitalUsd: Number(body.treasuryCapitalUsd),
        liquidReservesUsd: Number(body.liquidReservesUsd || 0),
        outstandingLiabilitiesUsd: Number(body.outstandingLiabilitiesUsd || 0),
        redemptionCapacityUsd: Number(body.redemptionCapacityUsd || 0),
        realizedVolatility: Number(body.realizedVolatility ?? 0.15),
        drawdownPct: Number(body.drawdownPct ?? 0.0),
        flowImbalance: Number(body.flowImbalance ?? 0.0),
        liquidityCompression: Number(body.liquidityCompression ?? 0.0),
        updateSourceVersion: String(body.updateSourceVersion || 'manual-input-v1'),
        mode: (body.mode || 'GROSS') as LiabilityMode,
      };
    } else {
      const snapshotResult = await pool.query(
        `SELECT payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT 1`
      );

      if (snapshotResult.rows.length === 0) {
        return res.status(200).json({
          schemaVersion: 'ame-run-v1',
          dataStatus: 'empty',
          error: 'No solvency snapshot available to derive AME input',
        });
      }

      const payload = typeof snapshotResult.rows[0].payload_json === 'string'
        ? JSON.parse(snapshotResult.rows[0].payload_json)
        : snapshotResult.rows[0].payload_json;

      const treasuryCapitalUsd = Number(payload.treasuryTotalUsd || 0);
      const liquidReservesUsd = Number(payload.treasuryLiquidUsd || 0);
      const outstandingLiabilitiesUsd = Number(payload.liabilitiesTotalUsd || 0);

      const composition: any[] = Array.isArray(payload.composition) ? payload.composition : [];
      const redemptionCapacityUsd = composition
        .filter((item: any) => item.label && item.label.toUpperCase().includes('PSM'))
        .reduce((sum: number, item: any) => sum + Number(item.valueUsd || 0), 0);

      const lcRaw = 1 - redemptionCapacityUsd / Math.max(outstandingLiabilitiesUsd, 1e-10);
      const liquidityCompression = clampValue(lcRaw, 0, 1);

      ameInput = {
        treasuryCapitalUsd,
        liquidReservesUsd,
        outstandingLiabilitiesUsd,
        redemptionCapacityUsd,
        realizedVolatility: Number(body.realizedVolatility ?? 0.15),
        drawdownPct: Number(body.drawdownPct ?? 0.0),
        flowImbalance: Number(body.flowImbalance ?? 0.0),
        liquidityCompression,
        updateSourceVersion: 'snapshot-derived-v1',
        mode: (body.mode || 'GROSS') as LiabilityMode,
      };
    }

    const inputChecksum = computeChecksum(ameInput);

    const idResult = await pool.query(`SELECT gen_random_uuid()::text as eval_id, gen_random_uuid()::text as snap_id`);
    const evaluationId = idResult.rows[0].eval_id;
    const inputSnapshotId = idResult.rows[0].snap_id;

    const evaluation = buildEvaluation(ameInput, DEFAULT_AME_CONFIG, evaluationId, inputSnapshotId);

    await ensureTables();

    await pool.query(
      `INSERT INTO ame_input_snapshots (id, created_at, checksum, raw_json, source_version, mode)
       VALUES ($1, NOW(), $2, $3::jsonb, $4, $5)`,
      [inputSnapshotId, inputChecksum, JSON.stringify(ameInput), ameInput.updateSourceVersion, ameInput.mode]
    );

    await pool.query(
      `INSERT INTO ame_evaluations (id, created_at, model_version, input_snapshot_id, regime_band, rs, pm, cr, rr, lbr, ld, cr_target, rr_target, lbr_target, ld_target, payout_factor, actions_json, disclosure_json, status)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18)`,
      [
        evaluationId,
        evaluation.modelVersion,
        inputSnapshotId,
        evaluation.regimeBand,
        evaluation.rs,
        evaluation.pm,
        evaluation.ratios.coverageRatio,
        evaluation.ratios.reserveRatio,
        evaluation.ratios.lossBufferRatio,
        evaluation.ratios.liquidityDepth,
        evaluation.targets.crTarget,
        evaluation.targets.rrTarget,
        evaluation.targets.lbrTarget,
        evaluation.targets.ldTarget,
        evaluation.payoutFactor,
        JSON.stringify(evaluation.actions),
        JSON.stringify({ summary: evaluation.disclosureSummary }),
        evaluation.status,
      ]
    );

    const tsPoints = [
      { key: 'RS', value: evaluation.rs },
      { key: 'PM', value: evaluation.pm },
      { key: 'CR', value: evaluation.ratios.coverageRatio },
      { key: 'RR', value: evaluation.ratios.reserveRatio },
      { key: 'LBR', value: evaluation.ratios.lossBufferRatio },
      { key: 'LD', value: evaluation.ratios.liquidityDepth },
      { key: 'TC', value: ameInput.treasuryCapitalUsd },
      { key: 'OL', value: ameInput.outstandingLiabilitiesUsd },
    ];

    for (const point of tsPoints) {
      await pool.query(
        `INSERT INTO ame_metrics_timeseries (id, metric_key, ts, value, evaluation_id)
         VALUES (gen_random_uuid(), $1, NOW(), $2, $3)`,
        [point.key, point.value, evaluationId]
      );
    }

    return res.status(200).json({
      schemaVersion: 'ame-run-v1',
      dataStatus: 'ok',
      evaluation,
      inputChecksum,
      inputSnapshotId,
    });
  } catch (error: any) {
    console.error('[solvency/ame/run] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-run-v1',
      dataStatus: 'error',
      error: 'Failed to run AME evaluation',
    });
  }
}
