import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

const EMPTY_RESPONSE = {
  schemaVersion: 'ame-latest-v1',
  dataStatus: 'empty',
  evaluationId: 'none',
  modelVersion: 'AME-v1.0.0',
  inputSnapshotId: null,
  inputChecksum: null,
  createdAt: null,
  regimeBand: 'STABLE',
  rs: 0,
  pm: 1,
  ratios: { coverageRatio: 0, reserveRatio: 0, lossBufferRatio: 0, liquidityDepth: 0 },
  targets: { crTarget: 0, rrTarget: 0, lbrTarget: 0, ldTarget: 0 },
  payoutFactor: 1,
  actions: [],
  status: 'OK',
  disclosureSummary: 'No AME evaluations have been recorded yet. Protocol is in bootstrap phase.',
  timestamp: new Date().toISOString(),
  inputSnapshot: null,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
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
      CREATE TABLE IF NOT EXISTS ame_input_snapshots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        checksum TEXT NOT NULL,
        raw_json JSONB NOT NULL,
        source_version TEXT NOT NULL,
        mode TEXT NOT NULL
      )
    `);

    const result = await pool.query(
      `SELECT e.*, s.raw_json, s.checksum as input_checksum
       FROM ame_evaluations e
       LEFT JOIN ame_input_snapshots s ON e.input_snapshot_id = s.id
       ORDER BY e.created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ ...EMPTY_RESPONSE, timestamp: new Date().toISOString() });
    }

    const row = result.rows[0];
    const actions = typeof row.actions_json === 'string' ? JSON.parse(row.actions_json) : (row.actions_json || []);
    const disclosure = typeof row.disclosure_json === 'string' ? JSON.parse(row.disclosure_json) : (row.disclosure_json || {});
    const inputSnapshot = row.raw_json
      ? (typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json)
      : null;

    return res.status(200).json({
      schemaVersion: 'ame-latest-v1',
      dataStatus: 'ok',
      evaluationId: row.id,
      modelVersion: row.model_version,
      inputSnapshotId: row.input_snapshot_id,
      inputChecksum: row.input_checksum,
      createdAt: row.created_at,
      regimeBand: row.regime_band,
      rs: Number(row.rs),
      pm: Number(row.pm),
      ratios: {
        coverageRatio: Number(row.cr),
        reserveRatio: Number(row.rr),
        lossBufferRatio: Number(row.lbr),
        liquidityDepth: Number(row.ld),
      },
      targets: {
        crTarget: Number(row.cr_target),
        rrTarget: Number(row.rr_target),
        lbrTarget: Number(row.lbr_target),
        ldTarget: Number(row.ld_target),
      },
      payoutFactor: Number(row.payout_factor),
      actions,
      status: row.status,
      disclosureSummary: disclosure.summary || disclosure,
      timestamp: new Date(row.created_at).toISOString(),
      inputSnapshot,
    });
  } catch (error: any) {
    console.error('[solvency/ame/latest] Error:', error);
    return res.status(200).json({ ...EMPTY_RESPONSE, timestamp: new Date().toISOString() });
  }
}
