import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';
import { readOperatorCookie, isValidOperatorKey } from '../../../../lib/capinfra/operatorAuth';

const ACCEPTED_ASSETS = ['USDC', 'AXUSD'] as const;
type AcceptedAsset = typeof ACCEPTED_ASSETS[number];

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Sentinel logIndex used exclusively for manually recorded deposits.
 * Real on-chain log indices are always >= 0, so -1 is a safe sentinel.
 * The unique(tx_hash, log_index) constraint therefore prevents duplicate
 * manual records for the same txHash while remaining distinct from any
 * on-chain event that might share the same txHash.
 */
const MANUAL_LOG_INDEX = -1;

export interface RecordDepositRequest {
  asset: AcceptedAsset;
  amountUsdc: number;
  txHash: string;
  note?: string;
}

export interface RecordDepositResponse {
  success: boolean;
  id?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecordDepositResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Operator-only: require session cookie (same pattern as all other vault routes)
  const cookie = readOperatorCookie(req);
  if (!isValidOperatorKey(cookie)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { asset, amountUsdc, txHash, note } = req.body as RecordDepositRequest;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!ACCEPTED_ASSETS.includes(asset as AcceptedAsset)) {
    return res.status(400).json({ success: false, error: `asset must be one of: ${ACCEPTED_ASSETS.join(', ')}` });
  }
  if (typeof amountUsdc !== 'number' || !isFinite(amountUsdc) || amountUsdc <= 0) {
    return res.status(400).json({ success: false, error: 'amountUsdc must be a positive number' });
  }
  if (!txHash || !TX_HASH_RE.test(txHash)) {
    return res.status(400).json({ success: false, error: 'txHash must be a 0x-prefixed 32-byte hex string' });
  }

  try {
    // Use MANUAL_LOG_INDEX (-1) as a deterministic sentinel so the unique
    // (tx_hash, log_index) constraint correctly rejects duplicate submissions.
    // A NULL log_index would allow multiple rows per txHash in Postgres.
    const [inserted] = await db
      .insert(treasuryVaultEvents)
      .values({
        eventType:   'deposit',
        strategy:    asset === 'USDC' ? null : asset,
        amountUsd:   String(amountUsdc.toFixed(6)),
        txHash,
        logIndex:    MANUAL_LOG_INDEX,
        blockNumber: null,
      })
      .returning({ id: treasuryVaultEvents.id });

    return res.status(201).json({ success: true, id: inserted.id });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    // Unique constraint on (txHash, logIndex) — treat as duplicate submission
    if (e?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Deposit with this txHash already recorded' });
    }
    console.error('[record-deposit]', e?.message);
    return res.status(500).json({ success: false, error: 'Failed to record deposit' });
  }
}
