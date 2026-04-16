import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';
import { onrampPurchaseIntents } from '../../../shared/schema';
import { getProviderWidgetUrl } from '../../../lib/onramp/config';
import { randomBytes } from 'crypto';

interface IntentBody {
  walletAddress: string;
  asset: string;
  fiatAmount: number;
  fiatCurrency: string;
  chainId: number;
  provider?: string;
  flow?: 'buy' | 'sell';
}

interface IntentResponse {
  intentId: string;
  widgetUrl: string | null;
  status: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IntentResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    walletAddress,
    asset = 'USDC',
    fiatAmount,
    fiatCurrency = 'USD',
    chainId = 42161,
    flow = 'buy',
  } = req.body as IntentBody;

  if (!walletAddress) {
    return res.status(400).json({ error: 'walletAddress is required' });
  }
  if (!fiatAmount || fiatAmount <= 0) {
    return res.status(400).json({ error: 'fiatAmount must be a positive number' });
  }

  const intentId = randomBytes(16).toString('hex');

  const widgetUrl = flow === 'buy'
    ? getProviderWidgetUrl('coinbase', { walletAddress, asset, fiatCurrency, fiatAmount, chainId })
    : buildOfframpUrl(walletAddress, asset, chainId);

  try {
    await db.insert(onrampPurchaseIntents).values({
      intentId,
      walletAddress: walletAddress.toLowerCase(),
      provider: 'coinbase',
      chainId,
      asset,
      fiatCurrency,
      fiatAmount: fiatAmount.toString(),
      status: 'created',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    return res.status(500).json({ error: msg });
  }

  return res.status(201).json({ intentId, widgetUrl, status: 'created' });
}

function buildOfframpUrl(walletAddress: string, asset: string, chainId: number): string {
  const networkMap: Record<number, string> = { 42161: 'arbitrum', 1: 'ethereum', 8453: 'base' };
  const network = networkMap[chainId] ?? 'arbitrum';
  const appId = process.env.COINBASE_PROJECT_ID ?? '';
  const url = new URL('https://pay.coinbase.com/sell/select-asset');
  url.searchParams.set('appId', appId);
  url.searchParams.set('addresses', JSON.stringify({ [walletAddress]: [network] }));
  url.searchParams.set('defaultAsset', asset);
  return url.toString();
}
