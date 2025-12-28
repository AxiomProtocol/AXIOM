import type { NextApiRequest, NextApiResponse } from 'next';

const TRANSAK_API_GATEWAY = process.env.TRANSAK_ENV === 'production'
  ? 'https://api-gateway.transak.com'
  : 'https://api-gateway-stg.transak.com';

function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.TRANSAK_API_KEY;
  const accessToken = process.env.TRANSAK_ACCESS_TOKEN;

  if (!apiKey) {
    return res.status(500).json({ error: 'Transak is not configured' });
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
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/onramp?status=completed&provider=transak`
      : 'http://localhost:5000/onramp?status=completed&provider=transak';

    const referrerDomain = process.env.REPLIT_DEV_DOMAIN || 'localhost';

    const widgetParams: Record<string, string | number | boolean> = {
      apiKey,
      referrerDomain,
      walletAddress,
      cryptoCurrencyCode: asset || 'ETH',
      fiatCurrency: fiatCurrency || 'USD',
      network,
      themeColor: 'd4af37',
      redirectURL: callbackUrl,
      disableWalletAddressForm: true,
      productsAvailed: 'BUY'
    };

    if (fiatAmount && fiatAmount > 0) {
      widgetParams.fiatAmount = fiatAmount;
    }

    if (accessToken) {
      const response = await fetch(`${TRANSAK_API_GATEWAY}/api/v2/auth/session`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'access-token': accessToken,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          widgetParams,
          landingPage: 'HomePage'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transak session error:', errorText);
        throw new Error('Failed to create Transak session');
      }

      const data = await response.json();
      return res.status(200).json({ 
        widgetUrl: data.data?.widgetUrl,
        expiresIn: 300
      });
    }

    const baseUrl = process.env.TRANSAK_ENV === 'production'
      ? 'https://global.transak.com'
      : 'https://global-stg.transak.com';

    const url = new URL(baseUrl);
    Object.entries(widgetParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    return res.status(200).json({ 
      widgetUrl: url.toString(),
      expiresIn: null
    });

  } catch (error) {
    console.error('Transak session error:', error);
    return res.status(500).json({ error: 'Failed to create Transak session' });
  }
}
