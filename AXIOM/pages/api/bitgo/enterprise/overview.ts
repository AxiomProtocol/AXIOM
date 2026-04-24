import type { NextApiRequest, NextApiResponse } from 'next';
import { bitGoRequest, isBitGoConfigured, BITGO_ENTERPRISE_ID, bitgoCoin, isTestnet, BITGO_API_URL } from '../../../../lib/bitgo/client';
import { rateLimitDefault } from '../../../../lib/rateLimit';
import { safeCompare } from '../../../../lib/solvency/ame/utils';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const provided = req.headers['x-admin-key'] ?? req.query.adminKey;
  if (!ADMIN_KEY || typeof provided !== 'string' || !safeCompare(provided, ADMIN_KEY)) {
    return res.status(401).json({ error: 'Admin key required.' });
  }

  const configured = isBitGoConfigured();

  if (!configured) {
    return res.status(200).json({
      configured: false,
      network: 'unknown',
      enterpriseId: '',
      coin: '',
      wallets: [],
      totalWallets: 0,
      pendingApprovals: 0,
      error: 'BitGo access token not configured.',
    });
  }

  const [walletsResult, pendingResult] = await Promise.allSettled([
    bitGoRequest<{ wallets: Array<{
      id: string;
      label: string;
      coin: string;
      balance: number;
      confirmedBalance: number;
      spendableBalance: number;
      receiveAddress?: { address: string };
      type: string;
      isActive: boolean;
    }> }>(`/${bitgoCoin}/wallet?limit=10`),
    BITGO_ENTERPRISE_ID
      ? bitGoRequest<{ pendingApprovals: unknown[] }>(`/enterprise/${BITGO_ENTERPRISE_ID}/pendingapprovals`)
      : Promise.resolve({ ok: true, status: 200, data: { pendingApprovals: [] } }),
  ]);

  const walletsData = walletsResult.status === 'fulfilled' && walletsResult.value.ok
    ? walletsResult.value.data?.wallets ?? []
    : [];

  const pendingCount = pendingResult.status === 'fulfilled' && pendingResult.value.ok
    ? (pendingResult.value.data as { pendingApprovals?: unknown[] })?.pendingApprovals?.length ?? 0
    : 0;

  const walletsError = walletsResult.status === 'fulfilled' && !walletsResult.value.ok
    ? walletsResult.value.error
    : walletsResult.status === 'rejected'
    ? String((walletsResult as PromiseRejectedResult).reason)
    : undefined;

  return res.status(200).json({
    configured: true,
    network: isTestnet ? 'testnet' : 'mainnet',
    apiUrl: BITGO_API_URL,
    enterpriseId: BITGO_ENTERPRISE_ID,
    coin: bitgoCoin,
    wallets: walletsData.map((w) => ({
      id: w.id,
      label: w.label,
      coin: w.coin,
      type: w.type,
      confirmedBalance: w.confirmedBalance ?? 0,
      spendableBalance: w.spendableBalance ?? 0,
      receiveAddress: w.receiveAddress?.address ?? '',
    })),
    totalWallets: walletsData.length,
    pendingApprovals: pendingCount,
    walletsError,
  });
}
