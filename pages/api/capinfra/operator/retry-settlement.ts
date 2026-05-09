import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { reservePositions } from '@/shared/treasurySchema';
import { capAuditEvents } from '@/shared/capInfraSchema';
import { dispatchSettlement } from '@/lib/wallet/settlementDispatch';
import { generateId } from '@/lib/capinfra/ids';

/**
 * POST /api/capinfra/operator/retry-settlement
 *
 * Admin-only: retry a single failed/insufficient-balance settlement bucket
 * without running a full new allocation cycle. Creates a fresh reserve_position
 * row with the outcome and returns the tx hash.
 *
 * Body:
 *   {
 *     asset:      string   — e.g. "USDC", "ETH", "PAXG"
 *     quantity:   number   — token quantity to settle
 *     usd_amount: number   — USD value (for settlement dispatch context)
 *     position_id?: string — optional source position ID for audit trail
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const asset      = typeof body.asset      === 'string' ? body.asset.toUpperCase()  : null;
  const quantity   = typeof body.quantity   === 'number' ? body.quantity             : null;
  const usdAmount  = typeof body.usd_amount === 'number' ? body.usd_amount           : (quantity ?? 0);
  const positionId = typeof body.position_id === 'string' ? body.position_id         : undefined;

  if (!asset || quantity === null || quantity <= 0) {
    return res.status(400).json({ success: false, error: 'asset and quantity (> 0) are required' });
  }

  const SUPPORTED = ['ETH', 'PAXG', 'USDC', 'AXM', 'AXAU', 'AXUSD'];
  if (!SUPPORTED.includes(asset)) {
    return res.status(400).json({ success: false, error: `Unsupported asset: ${asset}. Supported: ${SUPPORTED.join(', ')}` });
  }

  const retryId  = generateId('retry' as any);
  const now      = new Date();

  try {
    // USDC/ETH/PAXG → bitgo_custody (falls back to direct on-chain transfer)
    // AXAU/AXUSD    → onchain_mint
    // AXM           → treasury_hold
    const ASSET_PATH: Record<string, string> = {
      ETH:   'bitgo_custody',
      PAXG:  'bitgo_custody',
      USDC:  'bitgo_custody',
      AXM:   'treasury_hold',
      AXAU:  'onchain_mint',
      AXUSD: 'onchain_mint',
    };
    const outcome = await dispatchSettlement({
      asset,
      quantity,
      usdAmount,
      path:    ASSET_PATH[asset] ?? 'bitgo_custody',
      execId:  retryId,
      runId:   retryId,
    });

    const POSITION_TYPE: Record<string, string> = {
      ETH:   'eth_reserve',
      PAXG:  'paxg_reserve',
      USDC:  'usdc_operations',
      AXM:   'axm_treasury',
      AXAU:  'axau_reserve',
      AXUSD: 'axusd_liquidity',
    };

    await db.insert(reservePositions).values({
      assetSymbol:         asset,
      positionType:        POSITION_TYPE[asset] ?? 'protocol_reserve',
      quantity:            quantity.toFixed(8),
      markPrice:           (usdAmount / quantity).toFixed(8),
      usdValue:            usdAmount.toFixed(2),
      valuationSource:     'retry_dispatch',
      valuationConfidence: 'medium',
      snapshotAt:          now,
      txHash:              outcome.txHash,
      settlementStatus:    outcome.settlementStatus,
      settlementRef:       outcome.settlementRef,
      settlementNote:      outcome.settlementNote,
      metadata: {
        retry_id:        retryId,
        source_position: positionId ?? null,
        source:          'RETRY_DISPATCH',
        retried_at:      now.toISOString(),
      },
    });

    await db.insert(capAuditEvents).values({
      id:            generateId('ae'),
      eventType:     outcome.settlementStatus === 'confirmed'
        ? 'settlement.retry_confirmed'
        : 'settlement.retry_queued',
      aggregateType: 'reserve_position',
      aggregateId:   retryId,
      payloadJson: {
        retry_id:          retryId,
        asset,
        quantity,
        usd_amount:        usdAmount,
        tx_hash:           outcome.txHash,
        settlement_status: outcome.settlementStatus,
        source_position:   positionId ?? null,
      },
    });

    return res.status(200).json({
      success:           true,
      retry_id:          retryId,
      asset,
      quantity,
      usd_amount:        usdAmount,
      tx_hash:           outcome.txHash,
      settlement_status: outcome.settlementStatus,
      settlement_ref:    outcome.settlementRef,
      settlement_note:   outcome.settlementNote,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[retry-settlement]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
