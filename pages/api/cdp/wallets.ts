import type { NextApiRequest, NextApiResponse } from 'next';
import { listEvmAccounts, createEvmAccount, CdpWalletAccount } from '../../../lib/cdp/walletService';
import { isCdpConfigured, canCreateWallets } from '../../../lib/cdp/client';

interface ListResponse {
  accounts: CdpWalletAccount[];
  isLive: boolean;
  configured: boolean;
  canCreate: boolean;
  error?: string;
}

interface CreateResponse {
  account: CdpWalletAccount | null;
  error?: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ErrorResponse>
) {
  const configured = isCdpConfigured();

  const canCreate = canCreateWallets();

  if (req.method === 'GET') {
    if (!configured) {
      return res.status(200).json({ accounts: [], isLive: false, configured: false, canCreate: false });
    }
    const result = await listEvmAccounts();
    return res.status(200).json({ ...result, configured, canCreate });
  }

  if (req.method === 'POST') {
    if (!configured) {
      return res.status(503).json({ error: 'CDP not configured' });
    }
    if (!canCreate) {
      return res.status(503).json({ error: 'CDP_WALLET_SECRET is required to create wallets. Add it in your environment secrets.' });
    }
    const { name } = req.body as { name?: string };
    const result = await createEvmAccount(name);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.status(201).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
