import type { NextApiRequest, NextApiResponse } from 'next';
import { treasuryLedgerService } from '../../../lib/services/TreasuryLedgerService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const {
    provider,
    asset,
    classification,
    direction,
    from,
    to,
    limit = '50',
    offset = '0',
  } = req.query;

  try {
    const result = await treasuryLedgerService.getTransactions({
      provider: typeof provider === 'string' ? provider : undefined,
      asset: typeof asset === 'string' ? asset : undefined,
      classification: typeof classification === 'string' ? classification : undefined,
      direction: typeof direction === 'string' ? direction : undefined,
      fromDate: typeof from === 'string' ? new Date(from) : undefined,
      toDate: typeof to === 'string' ? new Date(to) : undefined,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10),
    });

    return res.status(200).json({
      success: true,
      data: result.data.map((tx) => ({
        id: tx.id,
        treasuryAccountId: tx.treasuryAccountId,
        direction: tx.direction,
        assetSymbol: tx.assetSymbol,
        amount: tx.amount,
        usdValue: tx.usdValue,
        externalTxId: tx.externalTxId,
        txHash: tx.txHash,
        sourceProvider: tx.sourceProvider,
        sourceType: tx.sourceType,
        counterparty: tx.counterparty,
        purpose: tx.purpose,
        classification: tx.classification,
        occurredAt: tx.occurredAt?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      })),
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (err: any) {
    console.error('[api/treasury/transactions]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
}
