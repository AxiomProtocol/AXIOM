import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { computeMetrics, computeAxusdStability, determinePolicyMode } from '../../../lib/solvency';
import type { AxusdStabilityMetrics, CompositionItem } from '../../../lib/solvency';

async function fetchLatestSnapshot(): Promise<{
  payload: Record<string, any>;
  id: string;
  asOfUtc: string;
  checksum: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, as_of_utc, payload_json, checksum
       FROM solvency_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
      asOfUtc: row.as_of_utc,
      checksum: row.checksum,
    };
  } catch (err) {
    console.error('[solvency/latest] Failed to fetch snapshot:', err);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const snapshot = await fetchLatestSnapshot();

    if (!snapshot) {
      return res.status(200).json({
        schemaVersion: 'solvency-latest-v1',
        dataStatus: 'empty',
        asOfUtc: new Date().toISOString(),
        snapshotId: 'none',
        checksum: '0000000000000000',
        treasuryTotalUsd: 0,
        treasuryLiquidUsd: 0,
        reservesTotalUsd: 0,
        liabilitiesTotalUsd: 0,
        lossBufferUsd: 0,
        coverageRatio: 0,
        reserveRatio: 0,
        capitalAdequacy: 0,
        policyMode: 'BOOTSTRAP',
        composition: [],
        axusdStability: {
          totalSupply: 0,
          psmReserves: 0,
          backingRatio: 0,
          pegDeviation: 0,
          redemptionCapacity: 0,
          stabilityScore: 'CRITICAL',
        } as AxusdStabilityMetrics,
      });
    }

    const p = snapshot.payload;

    const treasuryTotalUsd = Math.round(Number(p.treasuryTotalUsd || 0) * 100) / 100;
    const treasuryLiquidUsd = Math.round(Number(p.treasuryLiquidUsd || 0) * 100) / 100;
    const reservesTotalUsd = Math.round(Number(p.reservesTotalUsd || 0) * 100) / 100;
    const liabilitiesTotalUsd = Math.round(Number(p.liabilitiesTotalUsd || 0) * 100) / 100;
    const lossBufferUsd = Math.round(Number(p.lossBufferUsd || 0) * 100) / 100;

    const computed = computeMetrics({
      treasuryTotalUsd,
      treasuryLiquidUsd,
      reservesTotalUsd,
      liabilitiesTotalUsd,
      lossBufferUsd,
    });

    const composition: CompositionItem[] = Array.isArray(p.composition) ? p.composition : [];

    const psmReserves = composition
      .filter((item: CompositionItem) => item.label && item.label.toUpperCase().includes('PSM'))
      .reduce((sum: number, item: CompositionItem) => sum + Number(item.valueUsd || 0), 0);

    const axusdSupply = Number(p.liabilitiesTotalUsd || 0);

    const axusdStability = computeAxusdStability(
      Math.round(psmReserves * 100) / 100,
      Math.round(axusdSupply * 100) / 100,
      treasuryLiquidUsd
    );

    const policyMode = determinePolicyMode(
      computed.coverageRatio,
      computed.reserveRatio,
      String(p.policyMode || '')
    );

    return res.status(200).json({
      schemaVersion: 'solvency-latest-v1',
      dataStatus: 'ok',
      asOfUtc: new Date(snapshot.asOfUtc).toISOString(),
      snapshotId: snapshot.id,
      checksum: snapshot.checksum,
      treasuryTotalUsd,
      treasuryLiquidUsd,
      reservesTotalUsd,
      liabilitiesTotalUsd,
      lossBufferUsd,
      coverageRatio: computed.coverageRatio,
      reserveRatio: computed.reserveRatio,
      capitalAdequacy: computed.capitalAdequacy,
      policyMode,
      composition,
      axusdStability,
    });
  } catch (error: any) {
    console.error('[solvency/latest] Error:', error);
    return res.status(500).json({
      schemaVersion: 'solvency-latest-v1',
      dataStatus: 'error',
      error: 'Failed to fetch solvency data',
    });
  }
}
