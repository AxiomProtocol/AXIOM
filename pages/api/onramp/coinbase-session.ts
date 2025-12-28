import type { NextApiRequest, NextApiResponse } from 'next';

function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectId = process.env.COINBASE_PROJECT_ID || process.env.CDP_PROJECT_ID;

  if (!projectId) {
    return res.status(500).json({ error: 'Coinbase Onramp is not configured' });
  }

  try {
    const { walletAddress, asset, fiatCurrency, fiatAmount, chainId } = req.body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const networkMap: Record<number, string> = {
      42161: 'arbitrum',
      1: 'ethereum', 
      137: 'polygon',
      10: 'optimism',
      8453: 'base'
    };
    const network = networkMap[chainId || 42161] || 'arbitrum';

    const callbackUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/onramp?status=completed&provider=coinbase`
      : 'http://localhost:5000/onramp?status=completed&provider=coinbase';

    const widgetUrl = new URL('https://pay.coinbase.com/buy/select-asset');
    widgetUrl.searchParams.set('appId', projectId);
    
    const addressParam = JSON.stringify({ [walletAddress]: [network] });
    widgetUrl.searchParams.set('addresses', addressParam);
    
    if (asset) {
      widgetUrl.searchParams.set('defaultAsset', asset);
    }
    if (fiatCurrency) {
      widgetUrl.searchParams.set('fiatCurrency', fiatCurrency);
    }
    if (fiatAmount) {
      widgetUrl.searchParams.set('presetFiatAmount', fiatAmount.toString());
    }
    
    widgetUrl.searchParams.set('defaultPaymentMethod', 'CARD');

    return res.status(200).json({ 
      widgetUrl: widgetUrl.toString(),
      projectId
    });

  } catch (error) {
    console.error('Coinbase session error:', error);
    return res.status(500).json({ error: 'Failed to create Coinbase session' });
  }
}
