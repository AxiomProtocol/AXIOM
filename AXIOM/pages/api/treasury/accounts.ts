import type { NextApiRequest, NextApiResponse } from 'next';
import { treasuryLedgerService } from '../../../lib/services/TreasuryLedgerService';
import { systemStateService } from '../../../lib/services/SystemStateService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const accounts = await treasuryLedgerService.getAccounts();

    if (accounts.length === 0) {
      await systemStateService.seedPartnerIntegrations();
    }

    return res.status(200).json({
      success: true,
      data: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        accountType: a.accountType,
        displayName: a.displayName,
        legalEntityName: a.legalEntityName,
        externalAccountId: a.externalAccountId,
        assetSymbol: a.assetSymbol,
        custodyModel: a.custodyModel,
        status: a.status,
        trustSource: a.trustSource,
        metadata: a.metadata,
        updatedAt: a.updatedAt?.toISOString() ?? null,
      })),
      count: accounts.length,
    });
  } catch (err: any) {
    console.error('[api/treasury/accounts]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch treasury accounts' });
  }
}
