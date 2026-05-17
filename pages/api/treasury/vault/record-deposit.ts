import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { treasuryVaultEvents } from '../../../../shared/treasuryVaultSchema';
import { requireOperatorCookie } from '../../../../lib/capinfra/operatorAuth';

const ACCEPTED_ASSETS = ['USDC', 'AXUSD'] as const;
type AcceptedAsset = typeof ACCEPTED_ASSETS[number];

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

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

  // Operator-only: require session cookie
  const redirect = requireOperatorCookie({ req, res } as any);
  if (redirect) {
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
    // Record manual deposit as a pending vault event.
    // strategy field encodes the asset for non-USDC deposits.
    const [inserted] = await db
      .insert(treasuryVaultEvents)
      .values({
        eventType: 'deposit',
        strategy:  asset === 'USDC' ? null : asset,
        amountUsd: String(amountUsdc.toFixed(6)),
        txHash,
        logIndex:    null,
        blockNumber: null,
      })
      .returning({ id: treasuryVaultEvents.id });

    return res.status(201).json({ success: true, id: inserted.id });
  } catch (err: any) {
    // Unique constraint on (txHash, logIndex) — treat as duplicate
    if (err?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Deposit with this txHash already recorded' });
    }
    console.error('[record-deposit]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to record deposit' });
  }
}
