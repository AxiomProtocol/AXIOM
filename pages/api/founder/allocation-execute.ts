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
import { resolveDestinationWallet, TREASURY_DESTINATION } from '@/lib/allocation/walletResolver';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

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
  destination_address: string | null;
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

    // Resolve destination wallet only when onramp assets are in scope.
    // Non-onramp rails (axau_mint, camelot_swap, kag_mint, ledger, stripe_payout)
    // do not use a destination address and must not be blocked by a missing driver wallet.
    const ONRAMP_KEYS: AllocationAssetKey[] = ['paxg', 'usdc', 'wbtc', 'cbeth'];
    const hasOnrampTargets = targetAssets.some(k => ONRAMP_KEYS.includes(k));

    let resolvedWallet = await resolveDestinationWallet(scope, documentId);
    if (hasOnrampTargets && !resolvedWallet.address) {
      return res.status(422).json({
        success: false,
        error: `Cannot execute onramp rows — no driver wallet configured. ${resolvedWallet.description}`,
      });
    }
    // Non-onramp-only requests: use treasury destination as a safe default so
    // the destination_address column is always populated (not left null).
    const destinationAddress = resolvedWallet.address ?? TREASURY_DESTINATION;

    const executions: ExecutionRow[] = [];
    const skipped: string[] = [];

    for (const assetKey of targetAssets) {
      const weightPct = weights[assetKey] ?? 0;
      const usdAmount = Math.round((scopeAmount * weightPct) * 10) / 1000; // 2dp

      if (weightPct <= 0 || usdAmount <= 0) {
        skipped.push(`${assetKey}: weight=0`);
        continue;
      }

      // Idempotency: skip re-dispatch only for terminal-success rows.
      // Rows with status='queued', 'failed', or 'skipped' are retried —
      // the rail is dispatched again and the existing row is UPDATEd.
      const existing = await pool().query(
        `SELECT id, status FROM pilot_allocation_executions
          WHERE document_id = $1 AND scope = $2 AND asset_key = $3`,
        [documentId, scope, assetKey],
      );
      const existingRow = existing.rows[0];
      if (existingRow?.status === 'executed') {
        // Terminal success — return as-is, never double-dispatch
        const full = await pool().query(
          `SELECT id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                  usd_amount::float AS usd_amount, status, tx_hash, external_ref, external_url,
                  note, destination_address, executed_at
             FROM pilot_allocation_executions
            WHERE document_id = $1 AND scope = $2 AND asset_key = $3`,
          [documentId, scope, assetKey],
        );
        const row = full.rows[0];
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
          destination_address: row.destination_address ?? null,
          executed_at: row.executed_at instanceof Date ? row.executed_at.toISOString() : String(row.executed_at),
          pre_existing: true,
        });
        continue;
      }

      // Dispatch (first attempt, or retry after queued/failed/skipped)
      const result = await dispatchRail({
        assetKey,
        usdAmount,
        scope,
        destinationAddress,
        chainId: ARBITRUM_CHAIN_ID,
      });

      // Only persist destination_address for onramp rows — rails that do not
      // transfer to a wallet (ledger, stripe_payout, axau_mint, camelot_swap,
      // kag_mint) get null so the audit column retains clear semantics.
      const rowDestinationAddress = ONRAMP_KEYS.includes(assetKey) ? destinationAddress : null;

      // Upsert: INSERT on first attempt; UPDATE on retry (queued/failed/skipped)
      const upsertRes = await pool().query(
        `INSERT INTO pilot_allocation_executions
            (document_id, scope, asset_key, rail, weight_pct, usd_amount, status,
             tx_hash, external_ref, external_url, note, weights_snapshot, rationale,
             scope_amount, executed_by, destination_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (document_id, scope, asset_key) DO UPDATE SET
           rail                = EXCLUDED.rail,
           status              = EXCLUDED.status,
           tx_hash             = EXCLUDED.tx_hash,
           external_ref        = EXCLUDED.external_ref,
           external_url        = EXCLUDED.external_url,
           note                = EXCLUDED.note,
           destination_address = EXCLUDED.destination_address,
           executed_at         = NOW()
         RETURNING id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                   usd_amount::float AS usd_amount, status, tx_hash, external_ref,
                   external_url, note, destination_address, executed_at`,
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
          rowDestinationAddress,
        ],
      );

      let row = upsertRes.rows[0];
      if (!row) {
        // Concurrent write won — refetch
        const refetch = await pool().query(
          `SELECT id, document_id, scope, asset_key, rail, weight_pct::float AS weight_pct,
                  usd_amount::float AS usd_amount, status, tx_hash, external_ref, external_url,
                  note, destination_address, executed_at
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
          destination_address: row.destination_address ?? null,
          executed_at: row.executed_at instanceof Date ? row.executed_at.toISOString() : String(row.executed_at),
        });
      }
    }

    return res.status(200).json({
      success: true,
      executions,
      skipped,
      destination: { address: resolvedWallet.address, source: resolvedWallet.source, label: resolvedWallet.label },
      rail_map: ASSET_RAIL_MAP,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Allocation execution failed';
    console.error('[allocation-execute]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
