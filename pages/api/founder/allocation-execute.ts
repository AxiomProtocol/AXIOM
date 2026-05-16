/**
 * POST /api/founder/allocation-execute
 *
 * Admin-key gated. Executes one or all rows of a per-settlement weekly
 * allocation, dispatching each asset to its underlying rail (Coinbase
 * Onramp / AXAU mint / Camelot swap / Stripe payout / cash ledger) and
 * persisting a receipt per row to pilot_allocation_executions.
 *
 * Idempotent: the (document_id, scope, asset_key) UNIQUE constraint
 * guarantees that re-clicking "Execute" on a row that already has a
 * recorded execution returns the existing row instead of double-dispatching.
 *
 * Body shapes:
 *   { documentId, scope, weights, scopeAmount, rationale?, assetKey? }
 *     — assetKey present  → execute one row
 *     — assetKey omitted  → execute every non-zero row in `weights`
 *
 * Response: { success, executions: ExecutionRow[], skipped: string[] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { validateAdminKey } from '@/src/config/adminRoles';
import { ALLOCATION_ASSETS, normalizeWeights, type AllocationAssetKey, type AllocationWeights } from '@/lib/allocation/assets';
import { dispatchRail, ASSET_RAIL_MAP } from '@/lib/allocation/executionRails';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

const TREASURY_DESTINATION = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96'; // DEPLOYER_EOA — receives onramp purchases for now
const ARBITRUM_CHAIN_ID = 42161;

interface ExecutionRow {
  id: string;
  document_id: string;
  scope: 'driver' | 'treasury';
  asset_key: string;
  rail: string;
  weight_pct: number;
  usd_amount: number;
  status: string;
  tx_hash: string | null;
  external_ref: string | null;
  external_url: string | null;
  note: string | null;
  executed_at: string;
  pre_existing?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as {
      documentId?: string;
      scope?: 'driver' | 'treasury';
      weights?: unknown;
      scopeAmount?: number;
      rationale?: string;
      assetKey?: AllocationAssetKey;
    };

    const documentId = String(body.documentId ?? '').trim();
    const scope: 'driver' | 'treasury' = body.scope === 'treasury' ? 'treasury' : 'driver';
    const scopeAmount = Number(body.scopeAmount);
    const weights = normalizeWeights(body.weights) as AllocationWeights;
    const rationale = typeof body.rationale === 'string' ? body.rationale : null;
    const onlyAssetKey = body.assetKey;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'documentId is required' });
    }
    if (!Number.isFinite(scopeAmount) || scopeAmount <= 0) {
      return res.status(400).json({ success: false, error: 'scopeAmount must be a positive number' });
    }

    // Confirm the parent extraction exists (FK will reject otherwise)
    const docCheck = await pool().query(
      `SELECT 1 FROM pilot_settlement_extractions WHERE document_id = $1`,
      [documentId],
    );
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No settlement extraction for this documentId' });
    }

    // Determine which assets to execute
    const targetAssets: AllocationAssetKey[] = onlyAssetKey
      ? [onlyAssetKey]
      : ALLOCATION_ASSETS.map(a => a.key).filter(k => (weights[k] ?? 0) > 0);

    const executions: ExecutionRow[] = [];
    const skipped: string[] = [];

    for (const assetKey of targetAssets) {
      const weightPct = weights[assetKey] ?? 0;
      const usdAmount = Math.round((scopeAmount * weightPct) * 10) / 1000; // 2dp

      if (weightPct <= 0 || usdAmount <= 0) {
        skipped.push(`${assetKey}: weight=0`);
        continue;
      }

      // Idempotency check — return existing row if already executed
      const existing = await pool().query(
        `SELECT id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                usd_amount::float AS usd_amount, status, tx_hash, external_ref, external_url,
                note, executed_at
           FROM pilot_allocation_executions
          WHERE document_id = $1 AND scope = $2 AND asset_key = $3`,
        [documentId, scope, assetKey],
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        executions.push({
          id: row.id,
          document_id: row.document_id,
          scope: row.scope,
          asset_key: row.asset_key,
          rail: row.rail,
          weight_pct: Number(row.weight_pct),
          usd_amount: Number(row.usd_amount),
          status: row.status,
          tx_hash: row.tx_hash,
          external_ref: row.external_ref,
          external_url: row.external_url,
          note: row.note,
          executed_at: row.executed_at instanceof Date ? row.executed_at.toISOString() : String(row.executed_at),
          pre_existing: true,
        });
        continue;
      }

      // Dispatch the rail
      const result = await dispatchRail({
        assetKey,
        usdAmount,
        scope,
        destinationAddress: TREASURY_DESTINATION,
        chainId: ARBITRUM_CHAIN_ID,
      });

      // Persist
      const insertRes = await pool().query(
        `INSERT INTO pilot_allocation_executions
            (document_id, scope, asset_key, rail, weight_pct, usd_amount, status,
             tx_hash, external_ref, external_url, note, weights_snapshot, rationale,
             scope_amount, executed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (document_id, scope, asset_key) DO NOTHING
         RETURNING id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                   usd_amount::float AS usd_amount, status, tx_hash, external_ref,
                   external_url, note, executed_at`,
        [
          documentId,
          scope,
          assetKey,
          result.rail,
          weightPct,
          usdAmount,
          result.status,
          result.txHash,
          result.externalRef,
          result.externalUrl,
          result.note,
          JSON.stringify(weights),
          rationale,
          scopeAmount,
          'operator',
        ],
      );

      // If a concurrent insert won the race, refetch
      let row = insertRes.rows[0];
      if (!row) {
        const refetch = await pool().query(
          `SELECT id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                  usd_amount::float AS usd_amount, status, tx_hash, external_ref, external_url,
                  note, executed_at
             FROM pilot_allocation_executions
            WHERE document_id = $1 AND scope = $2 AND asset_key = $3`,
          [documentId, scope, assetKey],
        );
        row = refetch.rows[0];
      }
      if (row) {
        executions.push({
          id: row.id,
          document_id: row.document_id,
          scope: row.scope,
          asset_key: row.asset_key,
          rail: row.rail,
          weight_pct: Number(row.weight_pct),
          usd_amount: Number(row.usd_amount),
          status: row.status,
          tx_hash: row.tx_hash,
          external_ref: row.external_ref,
          external_url: row.external_url,
          note: row.note,
          executed_at: row.executed_at instanceof Date ? row.executed_at.toISOString() : String(row.executed_at),
        });
      }
    }

    return res.status(200).json({
      success: true,
      executions,
      skipped,
      rail_map: ASSET_RAIL_MAP,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Allocation execution failed';
    console.error('[allocation-execute]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
